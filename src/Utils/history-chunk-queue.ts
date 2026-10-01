export const HISTORY_CHUNK_STATE = Object.freeze({
	RECEIVED: 'received',
	DOWNLOADED: 'downloaded',
	DECODED: 'decoded',
	APPLIED: 'applied',
	COMPLETION_RECEIPT_SENT: 'completion_receipt_sent',
	RETRY_PENDING: 'retry_pending',
	FAILED: 'failed'
} as const)

export type HistoryChunkState = (typeof HISTORY_CHUNK_STATE)[keyof typeof HISTORY_CHUNK_STATE]

const TERMINAL_STATES = new Set([
    HISTORY_CHUNK_STATE.COMPLETION_RECEIPT_SENT,
    HISTORY_CHUNK_STATE.FAILED
]);
export function makeHistoryChunkQueue(deps: any) {
    const downloadAndDecode = deps.downloadAndDecode;
    const applyChunk = deps.applyChunk;
    const sendCompletionReceipt = deps.sendCompletionReceipt;
    const persistence = deps.persistence || null;
    const onRecentCompleted = deps.onRecentCompleted || (() => { });
    const logger = deps.logger || { info() { }, warn() { }, debug() { }, trace() { }, error() { } };
    const maxRetries = deps.maxRetries ?? 3;
    const backoffBaseMs = deps.backoffBaseMs ?? 1000;
    const setTimer = deps.setTimer || ((fn, ms) => setTimeout(fn, ms));
    const clearTimer = deps.clearTimer || (id => clearTimeout(id));
    const now = deps.now || (() => Date.now());
    const orderedTypes = new Set(deps.orderedSyncTypes ?? []);
    const records = new Map();
    const lastAppliedOrder = new Map();
    const retryTimers = new Map();
    let disposed = false;
    let initPromise = null;
    const isOrdered = (syncType) => orderedTypes.has(syncType);
    const persistPut = async (rec) => {
        if (!persistence?.put) {
            return;
        }
        try {
            const snapshot = {};
            for (const k of Object.keys(rec)) {
                if (k.startsWith('_')) {
                    continue;
                }
                snapshot[k] = rec[k];
            }
            await persistence.put(snapshot);
        }
        catch (err) {
            logger.warn({ err, id: rec.id }, 'failed to persist history chunk record');
        }
    };
    const setState = async (rec, state, extra) => {
        rec.state = state;
        rec.updatedAt = now();
        if (extra) {
            Object.assign(rec, extra);
        }
        await persistPut(rec);
        if (TERMINAL_STATES.has(state) && rec._resolveDone) {
            const resolve = rec._resolveDone;
            rec._resolveDone = undefined;
            resolve(state);
        }
    };
    const init = async () => {
        if (initPromise) {
            return initPromise;
        }
        initPromise = (async () => {
            if (!persistence?.loadAll) {
                return;
            }
            let all = [];
            try {
                all = (await persistence.loadAll()) || [];
            }
            catch (err) {
                logger.warn({ err }, 'failed to load persisted history chunk records');
                return;
            }
            for (const rec of all) {
                if (rec.state === HISTORY_CHUNK_STATE.COMPLETION_RECEIPT_SENT) {
                    trackApplied(rec);
                    continue;
                }
                if (rec.state === HISTORY_CHUNK_STATE.FAILED) {
                    records.set(rec.id, rec);
                    continue;
                }
                if (rec.state === HISTORY_CHUNK_STATE.APPLIED) {
                    trackApplied(rec);
                }
                rec.state = HISTORY_CHUNK_STATE.RECEIVED;
                records.set(rec.id, rec);
            }
            if (records.size) {
                logger.info({ resumed: records.size }, 'resumed persisted history chunk records');
            }
        })();
        return initPromise;
    };
    const trackApplied = (rec) => {
        if (!isOrdered(rec.syncType)) {
            return;
        }
        const prev = lastAppliedOrder.get(rec.syncType);
        if (prev === undefined || rec.chunkOrder > prev) {
            lastAppliedOrder.set(rec.syncType, rec.chunkOrder);
        }
    };
    const smallestNonTerminalOrder = (syncType) => {
        let min;
        for (const rec of records.values()) {
            if (rec.syncType !== syncType || TERMINAL_STATES.has(rec.state)) {
                continue;
            }
            if (min === undefined || rec.chunkOrder < min) {
                min = rec.chunkOrder;
            }
        }
        return min;
    };
    const pickNext = () => {
        let best = null;
        for (const rec of records.values()) {
            if (TERMINAL_STATES.has(rec.state) || rec.state === HISTORY_CHUNK_STATE.RETRY_PENDING) {
                continue;
            }
            if (isOrdered(rec.syncType)) {
                if (rec.chunkOrder !== smallestNonTerminalOrder(rec.syncType)) {
                    continue;
                }
            }
            if (!best) {
                best = rec;
                continue;
            }
            if (isOrdered(rec.syncType) && !isOrdered(best.syncType)) {
                best = rec;
            }
        }
        return best;
    };
    const processOne = async (rec) => {
        if (isOrdered(rec.syncType)) {
            const min = smallestNonTerminalOrder(rec.syncType);
            if (min !== undefined && rec.chunkOrder > min) {
                return;
            }
            const lastApplied = lastAppliedOrder.get(rec.syncType);
            if (lastApplied !== undefined && rec.chunkOrder > lastApplied + 1) {
                logger.warn({ syncType: rec.syncType, chunkOrder: rec.chunkOrder, lastApplied }, 'history chunk order gap detected');
            }
        }
        const meta = {
            msgKey: rec.msgKey,
            syncType: rec.syncType,
            chunkOrder: rec.chunkOrder,
            progress: rec.progress,
            peerDataRequestSessionId: rec.peerDataRequestSessionId,
            messageTimestamp: rec.messageTimestamp,
            isLatest: rec.progress === 100
        };
        try {
            if (rec.state === HISTORY_CHUNK_STATE.RECEIVED) {
                await setState(rec, HISTORY_CHUNK_STATE.DOWNLOADED);
            }
            let decoded = rec._decoded;
            if (rec.state === HISTORY_CHUNK_STATE.DOWNLOADED || !decoded) {
                decoded = await downloadAndDecode(rec.notification);
                rec._decoded = decoded;
                await setState(rec, HISTORY_CHUNK_STATE.DECODED);
            }
            if (rec.state === HISTORY_CHUNK_STATE.DECODED) {
                await applyChunk(decoded, meta);
                trackApplied(rec);
                await setState(rec, HISTORY_CHUNK_STATE.APPLIED);
                if (isOrdered(rec.syncType) && rec.progress === 100) {
                    onRecentCompleted(meta);
                }
            }
            if (rec.state === HISTORY_CHUNK_STATE.APPLIED) {
                await sendCompletionReceipt(rec.msgKey, meta);
                await setState(rec, HISTORY_CHUNK_STATE.COMPLETION_RECEIPT_SENT);
                rec._decoded = undefined;
                logger.debug({ syncType: rec.syncType, chunkOrder: rec.chunkOrder, progress: rec.progress }, 'history chunk fully processed');
            }
        }
        catch (err) {
            rec.attempts = (rec.attempts || 0) + 1;
            rec.lastError = String(err?.message || err);
            const stage = rec.state;
            if (rec.attempts >= maxRetries) {
                await setState(rec, HISTORY_CHUNK_STATE.FAILED);
                logger.error({ msgKey: rec.msgKey, syncType: rec.syncType, chunkOrder: rec.chunkOrder, stage, attempts: rec.attempts, err: rec.lastError }, 'history chunk permanently failed');
            }
            else {
                await setState(rec, HISTORY_CHUNK_STATE.RETRY_PENDING);
                logger.warn({ msgKey: rec.msgKey, syncType: rec.syncType, chunkOrder: rec.chunkOrder, stage, attempts: rec.attempts, err: rec.lastError }, 'history chunk stage failed, scheduling retry');
                scheduleRetry(rec);
            }
        }
    };
    const scheduleRetry = (rec) => {
        if (disposed) {
            return;
        }
        const delay = backoffBaseMs * Math.pow(2, Math.max(0, rec.attempts - 1));
        const timer = setTimer(() => {
            retryTimers.delete(rec.id);
            if (disposed) {
                return;
            }
            if (rec.state === HISTORY_CHUNK_STATE.RETRY_PENDING) {
                rec.state = rec._decoded ? HISTORY_CHUNK_STATE.DECODED : HISTORY_CHUNK_STATE.RECEIVED;
            }
            kick();
        }, delay);
        retryTimers.set(rec.id, timer);
    };
    let loopPromise = null;
    const runLoop = async () => {
        await init();
        let rec;
        while (!disposed && (rec = pickNext())) {
            const before = rec.state;
            await processOne(rec);
            if (records.get(rec.id) === rec && rec.state === before && !TERMINAL_STATES.has(rec.state)) {
                break;
            }
        }
    };
    const kick = () => {
        if (disposed) {
            return undefined;
        }
        if (!loopPromise) {
            loopPromise = new Promise(resolve => {
                setTimer(() => {
                    runLoop()
                        .catch(err => { logger.error({ err }, 'history chunk queue loop error'); })
                        .finally(() => { loopPromise = null; resolve(); });
                }, 0);
            });
        }
        return loopPromise;
    };
    return {
        HISTORY_CHUNK_STATE,
        async enqueue(notification, msgKey, extra = {}) {
            if (disposed) {
                return;
            }
            await init();
            const id = msgKey?.id;
            if (!id) {
                logger.warn('history chunk enqueue without a message id, skipping');
                return;
            }
            const existing = records.get(id);
            if (existing) {
                if (TERMINAL_STATES.has(existing.state)) {
                    logger.debug({ id, state: existing.state }, 'duplicate history chunk ignored');
                    return Promise.resolve(existing.state);
                }
                return existing._done || Promise.resolve();
            }
            const rec = {
                id,
                msgKey,
                syncType: notification?.syncType,
                chunkOrder: notification?.chunkOrder ?? 0,
                progress: notification?.progress,
                peerDataRequestSessionId: notification?.peerDataRequestSessionId,
                notification,
                state: HISTORY_CHUNK_STATE.RECEIVED,
                attempts: 0,
                updatedAt: now(),
                ...extra
            };
            rec._done = new Promise(resolve => { rec._resolveDone = resolve; });
            records.set(id, rec);
            await persistPut(rec);
            kick();
            return rec._done;
        },
        getRecord(id) {
            return records.get(id);
        },
        get size() {
            return records.size;
        },
        lastAppliedOrderFor(syncType) {
            return lastAppliedOrder.get(syncType);
        },
        async drain() {
            kick();
            if (loopPromise) {
                await loopPromise;
            }
        },
        dispose() {
            if (disposed) {
                return;
            }
            disposed = true;
            for (const timer of retryTimers.values()) {
                clearTimer(timer);
            }
            retryTimers.clear();
        }
    };
}