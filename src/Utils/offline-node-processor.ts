import type { BinaryNode } from '../WABinary'

export type MessageType = 'message' | 'call' | 'receipt' | 'notification'

type OfflineNode = {
	type: MessageType
	node: BinaryNode
}

export type OfflineNodeProcessorDeps = {
	isWsOpen?: () => boolean
	onUnexpectedError?: (error: Error, msg: string) => void
	yieldToEventLoop?: () => Promise<void>
}

export type OfflineStanzaInfo = {
	type: MessageType
	pending: number
	processed: number
	failed: number
}

export function makeOfflineNodeProcessor(
	nodeProcessorMap: Map<MessageType, (node: BinaryNode) => Promise<void>>,
	deps: OfflineNodeProcessorDeps = {},
	batchSize = 10
) {
	const nodes: OfflineNode[] = []
	let head = 0
	let processing = false
	let received = 0
	let processed = 0
	let failed = 0
	let disposed = false
	const idleWaiters: Array<() => void> = []
	const stanzaListeners = new Set<(info: OfflineStanzaInfo) => void>()
	const isWsOpen = typeof deps?.isWsOpen === 'function' ? deps.isWsOpen : () => true
	const yieldToEventLoop =
		typeof deps?.yieldToEventLoop === 'function'
			? deps.yieldToEventLoop
			: () => new Promise<void>(resolve => setImmediate(resolve))
	const onUnexpectedError =
		typeof deps?.onUnexpectedError === 'function' ? deps.onUnexpectedError : () => {}

	const pending = () => nodes.length - head
	const isIdle = () => !processing && pending() === 0

	const resolveIdleWaiters = () => {
		if (!isIdle() && !disposed) {
			return
		}

		while (idleWaiters.length) {
			const resolve = idleWaiters.shift()!
			resolve()
		}
	}

	const notifyStanza = (info: OfflineStanzaInfo) => {
		for (const listener of stanzaListeners) {
			try {
				listener(info)
			} catch (err) {
				onUnexpectedError(err as Error, 'offline stanza listener')
			}
		}
	}

	const compact = () => {
		if (head === 0) {
			return
		}

		if (head >= nodes.length) {
			nodes.length = 0
			head = 0
		} else if (head > 64 && head * 2 >= nodes.length) {
			nodes.splice(0, head)
			head = 0
		}
	}

	const runLoop = async () => {
		if (processing) {
			return
		}

		processing = true
		try {
			let inBatch = 0
			while (head < nodes.length) {
				if (disposed || !isWsOpen()) {
					break
				}

				const { type, node } = nodes[head++]!
				const nodeProcessor = nodeProcessorMap.get(type)
				if (!nodeProcessor) {
					failed++
					onUnexpectedError(new Error(`unknown offline node type: ${type}`), 'processing offline node')
				} else {
					try {
						await nodeProcessor(node)
					} catch (err) {
						failed++
						onUnexpectedError(err as Error, `processing offline ${type}`)
					}
				}

				processed++
				notifyStanza({ type, pending: pending(), processed, failed })
				inBatch++
				if (inBatch >= batchSize) {
					inBatch = 0
					compact()
					await yieldToEventLoop()
				}
			}

			compact()
		} finally {
			processing = false
			resolveIdleWaiters()
		}
	}

	const kick = () => {
		if (processing || disposed) {
			return
		}

		runLoop().catch(err => {
			processing = false
			onUnexpectedError(err as Error, 'processing offline nodes')
			resolveIdleWaiters()
		})
	}

	return {
		enqueue(type: MessageType, node: BinaryNode) {
			if (disposed) {
				return
			}

			received++
			nodes.push({ type, node })
			kick()
		},
		get pendingCount() {
			return pending()
		},
		get processedCount() {
			return processed
		},
		get failedCount() {
			return failed
		},
		get receivedCount() {
			return received
		},
		isIdle,
		waitForIdle() {
			if (disposed || isIdle()) {
				return Promise.resolve()
			}

			return new Promise<void>(resolve => {
				idleWaiters.push(resolve)
			})
		},
		onStanzaProcessed(fn: (info: OfflineStanzaInfo) => void) {
			stanzaListeners.add(fn)
			return () => stanzaListeners.delete(fn)
		},
		dispose() {
			if (disposed) {
				return
			}

			disposed = true
			nodes.length = 0
			head = 0
			while (idleWaiters.length) {
				const resolve = idleWaiters.shift()!
				resolve()
			}

			stanzaListeners.clear()
		}
	}
}
