export type OfflineDrainStatus = 'complete' | 'degraded'

export type OfflineResumeMetrics = {
	previewCount: number
	requestedBatches: number
	received: number
	pending: number
	processed: number
	failed: number
	terminalReceived: boolean
	serverTerminalCount: number
	drainMs: number
}

export type OfflineResumeControllerDeps = {
	sendBatchRequest: (count: number) => void
	finalize: (status: OfflineDrainStatus, metrics: OfflineResumeMetrics) => void
	logger?: {
		info: (...args: any[]) => void
		warn: (...args: any[]) => void
		debug: (...args: any[]) => void
		trace?: (...args: any[]) => void
	}
	setTimer?: (fn: () => void, ms: number) => any
	clearTimer?: (id: any) => void
	now?: () => number
	batchSize?: number
	refillThreshold?: number
	refillDebounceMs?: number
	drainTimeoutMs?: number
}

type OfflineQueue = {
	pendingCount: number
	receivedCount: number
	processedCount: number
	failedCount: number
	isIdle: () => boolean
	waitForIdle: () => Promise<void>
	onStanzaProcessed?: (fn: () => void) => () => void
}

export function makeOfflineResumeController(deps: OfflineResumeControllerDeps) {
	const sendBatchRequest = deps.sendBatchRequest
	const finalizeCb = deps.finalize
	const logger = deps.logger || { info() {}, warn() {}, debug() {}, trace() {} }
	const setTimer = deps.setTimer || ((fn, ms) => setTimeout(fn, ms))
	const clearTimer = deps.clearTimer || ((id: any) => clearTimeout(id))
	const now = deps.now || (() => Date.now())
	const batchSize = deps.batchSize ?? 200
	const refillThreshold = deps.refillThreshold ?? 200
	const refillDebounceMs = deps.refillDebounceMs ?? 100
	const drainTimeoutMs = deps.drainTimeoutMs ?? 60000

	let queue: OfflineQueue | null = null
	let unsubscribeQueue: (() => void) | null = null
	let active = false
	let previewCount = 0
	let requestedBatches = 0
	let terminalReceived = false
	let serverTerminalCount = 0
	let batchInFlight = false
	let finalized = false
	let disposed = false
	let awaitingIdle = false
	let startedMs = 0
	let drainTimer: any = undefined
	let refillTimer: any = undefined

	const pending = () => (queue ? queue.pendingCount : 0)

	const metrics = (): OfflineResumeMetrics => ({
		previewCount,
		requestedBatches,
		received: queue ? queue.receivedCount : 0,
		pending: pending(),
		processed: queue ? queue.processedCount : 0,
		failed: queue ? queue.failedCount : 0,
		terminalReceived,
		serverTerminalCount,
		drainMs: startedMs ? now() - startedMs : 0
	})

	const clearRefillTimer = () => {
		if (refillTimer !== undefined) {
			clearTimer(refillTimer)
			refillTimer = undefined
		}
	}

	const clearDrainTimer = () => {
		if (drainTimer !== undefined) {
			clearTimer(drainTimer)
			drainTimer = undefined
		}
	}

	const doFinalize = (status: OfflineDrainStatus) => {
		if (finalized || disposed) {
			return
		}

		finalized = true
		active = false
		clearRefillTimer()
		clearDrainTimer()
		const m = metrics()
		if (status === 'degraded') {
			logger.warn(m, 'offline drain finalized as degraded (terminal or local queue did not settle in time)')
		} else {
			logger.info(m, 'offline drain complete')
		}

		try {
			finalizeCb(status, m)
		} catch (err) {
			logger.warn({ err }, 'offline drain finalize callback threw')
		}
	}

	const tryFinalize = () => {
		if (finalized || disposed || !terminalReceived) {
			return
		}

		if (!queue || queue.isIdle()) {
			doFinalize('complete')
			return
		}

		if (awaitingIdle) {
			return
		}

		awaitingIdle = true
		queue.waitForIdle().then(() => {
			awaitingIdle = false
			if (disposed || finalized) {
				return
			}

			if (queue!.isIdle()) {
				doFinalize('complete')
			}
		})
	}

	const requestBatch = () => {
		if (disposed || finalized || terminalReceived || batchInFlight) {
			return
		}

		batchInFlight = true
		requestedBatches++
		try {
			sendBatchRequest(batchSize)
			logger.debug({ batchSize, requestedBatches, pending: pending() }, 'requested offline batch')
		} catch (err) {
			batchInFlight = false
			logger.warn({ err }, 'failed to send offline batch request')
		}
	}

	const scheduleRefill = () => {
		if (disposed || finalized || terminalReceived || batchInFlight) {
			return
		}

		if (refillTimer !== undefined) {
			return
		}

		if (pending() > refillThreshold) {
			return
		}

		refillTimer = setTimer(() => {
			refillTimer = undefined
			requestBatch()
		}, refillDebounceMs)
	}

	return {
		attachQueue(q: OfflineQueue) {
			queue = q
			if (unsubscribeQueue) {
				unsubscribeQueue()
			}

			unsubscribeQueue = queue.onStanzaProcessed
				? queue.onStanzaProcessed(() => {
						scheduleRefill()
						tryFinalize()
					})
				: null
		},
		begin() {
			if (active || disposed) {
				return
			}

			active = true
			startedMs = now()
			if (drainTimeoutMs > 0) {
				drainTimer = setTimer(() => {
					drainTimer = undefined
					if (!finalized && !disposed) {
						doFinalize('degraded')
					}
				}, drainTimeoutMs)
			}
		},
		handlePreview(count: number | string | undefined) {
			if (disposed) {
				return
			}

			if (!active) {
				this.begin()
			}

			previewCount = Number(count) || 0
			logger.info({ previewCount }, 'offline preview received')
			requestBatch()
		},
		noteReceived() {
			if (disposed || finalized) {
				return
			}

			batchInFlight = false
			scheduleRefill()
		},
		handleTerminal(count: number | string | undefined) {
			if (disposed) {
				return
			}

			if (!active) {
				this.begin()
			}

			terminalReceived = true
			serverTerminalCount = Number(count) || 0
			clearRefillTimer()
			logger.info({ serverTerminalCount, pending: pending() }, 'offline server terminal received')
			tryFinalize()
		},
		isActive() {
			return active && !finalized
		},
		isFinalized() {
			return finalized
		},
		metrics,
		dispose() {
			if (disposed) {
				return
			}

			disposed = true
			active = false
			clearRefillTimer()
			clearDrainTimer()
			if (unsubscribeQueue) {
				unsubscribeQueue()
				unsubscribeQueue = null
			}
		}
	}
}
