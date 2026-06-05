import PQueue from 'p-queue'
import type { SignalDataSet, SignalDataTypeMap, SignalKeyStore } from '../Types'
import type { ILogger } from './logger'

export class PreKeyManager {
	private readonly queues = new Map<string, PQueue>()

	constructor(
		private readonly store: SignalKeyStore,
		private readonly logger: ILogger
	) {}

	private getQueue(keyType: string): PQueue {
		if (!this.queues.has(keyType)) {
			this.queues.set(keyType, new PQueue({ concurrency: 1 }))
		}

		return this.queues.get(keyType)!
	}

	async processOperations(
		data: SignalDataSet,
		keyType: keyof SignalDataTypeMap,
		transactionCache: SignalDataSet,
		mutations: SignalDataSet,
		isInTransaction: boolean
	): Promise<void> {
		const keyData = data[keyType]
		if (!keyData) return

		return this.getQueue(keyType).add(async () => {
			transactionCache[keyType] = transactionCache[keyType] || ({} as any)
			mutations[keyType] = mutations[keyType] || ({} as any)

			const deletions: string[] = []
			const updates: Record<string, any> = {}

			for (const keyId in keyData) {
				if (keyData[keyId] === null) {
					deletions.push(keyId)
				} else {
					updates[keyId] = keyData[keyId]
				}
			}

			if (Object.keys(updates).length > 0) {
				Object.assign(transactionCache[keyType]!, updates)
				Object.assign(mutations[keyType]!, updates)
			}

			if (deletions.length > 0) {
				await this.processDeletions(keyType, deletions, transactionCache, mutations, isInTransaction)
			}
		})
	}

	private async processDeletions(
		keyType: keyof SignalDataTypeMap,
		ids: string[],
		transactionCache: SignalDataSet,
		mutations: SignalDataSet,
		isInTransaction: boolean
	): Promise<void> {
		if (isInTransaction) {
			for (const keyId of ids) {
				if (transactionCache[keyType]?.[keyId]) {
					transactionCache[keyType][keyId] = null
					mutations[keyType]![keyId] = null
				} else {
					this.logger.warn(`Skipping deletion of non-existent ${keyType} in transaction: ${keyId}`)
				}
			}
		} else {
			const existingKeys = await this.store.get(keyType, ids)
			for (const keyId of ids) {
				if (existingKeys[keyId]) {
					transactionCache[keyType]![keyId] = null
					mutations[keyType]![keyId] = null
				} else {
					this.logger.warn(`Skipping deletion of non-existent ${keyType}: ${keyId}`)
				}
			}
		}
	}

	async validateDeletions(data: SignalDataSet, keyType: keyof SignalDataTypeMap): Promise<void> {
		const keyData = data[keyType]
		if (!keyData) return

		return this.getQueue(keyType).add(async () => {
			const deletionIds = Object.keys(keyData).filter(id => keyData[id] === null)
			if (deletionIds.length === 0) return

			const existingKeys = await this.store.get(keyType, deletionIds)
			for (const keyId of deletionIds) {
				if (!existingKeys[keyId]) {
					this.logger.warn(`Skipping deletion of non-existent ${keyType}: ${keyId}`)
					delete data[keyType]![keyId]
				}
			}
		})
	}
}
