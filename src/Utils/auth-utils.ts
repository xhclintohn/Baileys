import NodeCache from '@cacheable/node-cache'
import { AsyncLocalStorage } from 'async_hooks'
import { Mutex } from 'async-mutex'
import { randomBytes } from 'crypto'
import PQueue from 'p-queue'
import { DEFAULT_CACHE_TTLS } from '../Defaults'
import type {
	AuthenticationCreds,
	CacheStore,
	SignalDataSet,
	SignalDataTypeMap,
	SignalKeyStore,
	SignalKeyStoreWithTransaction,
	TransactionCapabilityOptions
} from '../Types'
import { Curve, signedKeyPair } from './crypto'
import { delay, generateRegistrationId } from './generics'
import type { ILogger } from './logger'
import { PreKeyManager } from './pre-key-manager'

interface TransactionContext {
	cache: SignalDataSet
	mutations: SignalDataSet
	dbQueries: number
}

export function makeCacheableSignalKeyStore(
	store: SignalKeyStore,
	logger?: ILogger,
	_cache?: CacheStore
): SignalKeyStore {
	const cache =
		_cache ||
		new NodeCache<SignalDataTypeMap[keyof SignalDataTypeMap]>({
			stdTTL: DEFAULT_CACHE_TTLS.SIGNAL_STORE,
			useClones: false,
			deleteOnExpire: true
		})

	const cacheMutex = new Mutex()

	function getUniqueId(type: string, id: string) {
		return `${type}.${id}`
	}

	return {
		async get(type, ids) {
			return cacheMutex.runExclusive(async () => {
				const data: { [_: string]: SignalDataTypeMap[typeof type] } = {}
				const idsToFetch: string[] = []

				for (const id of ids) {
					const item = (await cache.get<SignalDataTypeMap[typeof type]>(getUniqueId(type, id))) as any
					if (typeof item !== 'undefined') {
						data[id] = item
					} else {
						idsToFetch.push(id)
					}
				}

				if (idsToFetch.length) {
					logger?.trace({ items: idsToFetch.length }, 'loading from store')
					const fetched = await store.get(type, idsToFetch)
					for (const id of idsToFetch) {
						const item = fetched[id]
						if (item) {
							data[id] = item
							await cache.set(getUniqueId(type, id), item as SignalDataTypeMap[keyof SignalDataTypeMap])
						}
					}
				}

				return data
			})
		},
		async set(data) {
			return cacheMutex.runExclusive(async () => {
				let keys = 0
				for (const type in data) {
					for (const id in data[type as keyof SignalDataTypeMap]) {
						await cache.set(getUniqueId(type, id), data[type as keyof SignalDataTypeMap]![id]!)
						keys += 1
					}
				}

				logger?.trace({ keys }, 'updated cache')
				await store.set(data)
			})
		},
		async clear() {
			await cache.flushAll()
			await store.clear?.()
		}
	}
}

export const addTransactionCapability = (
	state: SignalKeyStore,
	logger: ILogger,
	{ maxCommitRetries, delayBetweenTriesMs }: TransactionCapabilityOptions
): SignalKeyStoreWithTransaction => {
	const txStorage = new AsyncLocalStorage<TransactionContext>()

	const keyQueues = new Map<string, PQueue>()

	const txMutexes = new Map<string, Mutex>()
	const txMutexRefCounts = new Map<string, number>()

	const preKeyManager = new PreKeyManager(state, logger)

	function getQueue(key: string): PQueue {
		if (!keyQueues.has(key)) {
			keyQueues.set(key, new PQueue({ concurrency: 1 }))
		}

		return keyQueues.get(key)!
	}

	function getTxMutex(key: string): Mutex {
		if (!txMutexes.has(key)) {
			txMutexes.set(key, new Mutex())
			txMutexRefCounts.set(key, 0)
		}

		return txMutexes.get(key)!
	}

	function acquireTxMutexRef(key: string): void {
		const count = txMutexRefCounts.get(key) ?? 0
		txMutexRefCounts.set(key, count + 1)
	}

	function releaseTxMutexRef(key: string): void {
		const count = (txMutexRefCounts.get(key) ?? 1) - 1
		txMutexRefCounts.set(key, count)

		if (count <= 0) {
			const mutex = txMutexes.get(key)
			if (mutex && !mutex.isLocked()) {
				txMutexes.delete(key)
				txMutexRefCounts.delete(key)
			}
		}
	}

	function isInTransaction(): boolean {
		return !!txStorage.getStore()
	}

	async function commitWithRetry(mutations: SignalDataSet): Promise<void> {
		if (Object.keys(mutations).length === 0) {
			logger.trace('no mutations in transaction')
			return
		}

		logger.trace('committing transaction')

		for (let attempt = 0; attempt < maxCommitRetries; attempt++) {
			try {
				await state.set(mutations)
				logger.trace({ mutationCount: Object.keys(mutations).length }, 'committed transaction')
				return
			} catch (error) {
				const retriesLeft = maxCommitRetries - attempt - 1
				logger.warn(`failed to commit mutations, retries left=${retriesLeft}`)

				if (retriesLeft === 0) {
					throw error
				}

				await delay(delayBetweenTriesMs)
			}
		}
	}

	return {
		get: async (type, ids) => {
			const ctx = txStorage.getStore()

			if (!ctx) {
				return state.get(type, ids)
			}

			const cached = ctx.cache[type] || {}
			const missing = ids.filter(id => !(id in cached))

			if (missing.length > 0) {
				ctx.dbQueries++
				logger.trace({ type, count: missing.length }, 'fetching missing keys in transaction')

				const fetched = await getTxMutex(type).runExclusive(() => state.get(type, missing))

				ctx.cache[type] = ctx.cache[type] || ({} as any)
				Object.assign(ctx.cache[type]!, fetched)
			}

			const result: { [key: string]: any } = {}
			for (const id of ids) {
				const value = ctx.cache[type]?.[id]
				if (value !== undefined && value !== null) {
					result[id] = value
				}
			}

			return result
		},

		set: async data => {
			const ctx = txStorage.getStore()

			if (!ctx) {
				const types = Object.keys(data)

				for (const type_ of types) {
					const type = type_ as keyof SignalDataTypeMap
					if (type === 'pre-key') {
						await preKeyManager.validateDeletions(data, type)
					}
				}

				await Promise.all(
					types.map(type =>
						getQueue(type).add(async () => {
							const typeData = { [type]: data[type as keyof SignalDataTypeMap] } as SignalDataSet
							await state.set(typeData)
						})
					)
				)
				return
			}

			logger.trace({ types: Object.keys(data) }, 'caching in transaction')

			for (const key_ in data) {
				const key = key_ as keyof SignalDataTypeMap

				ctx.cache[key] = ctx.cache[key] || ({} as any)
				ctx.mutations[key] = ctx.mutations[key] || ({} as any)

				if (key === 'pre-key') {
					await preKeyManager.processOperations(data, key, ctx.cache, ctx.mutations, true)
				} else {
					Object.assign(ctx.cache[key]!, data[key])
					Object.assign(ctx.mutations[key]!, data[key])
				}
			}
		},

		isInTransaction,

		transaction: async (work, key) => {
			const existing = txStorage.getStore()

			if (existing) {
				logger.trace('reusing existing transaction context')
				return work()
			}

			const mutex = getTxMutex(key)
			acquireTxMutexRef(key)

			try {
				return await mutex.runExclusive(async () => {
					const ctx: TransactionContext = {
						cache: {},
						mutations: {},
						dbQueries: 0
					}

					logger.trace('entering transaction')

					try {
						const result = await txStorage.run(ctx, work)

						await commitWithRetry(ctx.mutations)

						logger.trace({ dbQueries: ctx.dbQueries }, 'transaction completed')

						return result
					} catch (error) {
						logger.error({ error }, 'transaction failed, rolling back')
						throw error
					}
				})
			} finally {
				releaseTxMutexRef(key)
			}
		}
	}
}

export const initAuthCreds = (): AuthenticationCreds => {
	const identityKey = Curve.generateKeyPair()
	return {
		noiseKey: Curve.generateKeyPair(),
		pairingEphemeralKeyPair: Curve.generateKeyPair(),
		signedIdentityKey: identityKey,
		signedPreKey: signedKeyPair(identityKey, 1),
		registrationId: generateRegistrationId(),
		advSecretKey: randomBytes(32).toString('base64'),
		processedHistoryMessages: [],
		nextPreKeyId: 1,
		firstUnuploadedPreKeyId: 1,
		accountSyncCounter: 0,
		accountSettings: {
			unarchiveChats: false
		},
		registered: false,
		pairingCode: undefined,
		lastPropHash: undefined,
		routingInfo: undefined,
		additionalData: undefined
	}
}
