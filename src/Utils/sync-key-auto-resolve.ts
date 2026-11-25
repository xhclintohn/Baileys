import type { AuthenticationState } from '../Types'
import logger, { type ILogger } from './logger'

export type SyncKeyAutoResolveResult = 'no-id' | 'present' | 'already-asked' | 'requested' | 'failed'

export type SyncKeyAutoResolveDeps = {
	authState: AuthenticationState
	requestKey: (keyIds: string[]) => Promise<string>
	logger?: Pick<ILogger, 'warn'>
}

export const makeSyncKeyAutoResolver = (deps: SyncKeyAutoResolveDeps) => {
	const { authState, requestKey } = deps
	const log = deps.logger ?? logger
	const asked = new Set<string>()

	return async (): Promise<SyncKeyAutoResolveResult> => {
		try {
			const keyId = authState.creds.myAppStateKeyId
			if (!keyId) {
				return 'no-id'
			}

			const stored = await authState.keys.get('app-state-sync-key', [keyId])
			if (stored[keyId]) {
				return 'present'
			}

			if (asked.has(keyId)) {
				return 'already-asked'
			}

			await requestKey([keyId])
			asked.add(keyId)
			return 'requested'
		} catch (error) {
			log.warn({ error }, 'failed to resolve the missing sync value')
			return 'failed'
		}
	}
}
