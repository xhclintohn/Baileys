import logger from './logger.js';
export const makeSyncKeyAutoResolver = (deps) => {
    const { authState, requestKey } = deps;
    const log = deps.logger ?? logger;
    const asked = new Set();
    return async () => {
        try {
            const keyId = authState.creds.myAppStateKeyId;
            if (!keyId) {
                return 'no-id';
            }
            const stored = await authState.keys.get('app-state-sync-key', [keyId]);
            if (stored[keyId]) {
                return 'present';
            }
            if (asked.has(keyId)) {
                return 'already-asked';
            }
            await requestKey([keyId]);
            asked.add(keyId);
            return 'requested';
        }
        catch (error) {
            log.warn({ error }, 'failed to resolve the missing sync value');
            return 'failed';
        }
    };
};
