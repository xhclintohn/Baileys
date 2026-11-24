import type { AuthenticationState } from '../Types/index.js';
import type { ILogger } from './logger.js';
export type SyncKeyAutoResolveResult = 'no-id' | 'present' | 'already-asked' | 'requested' | 'failed';
export type SyncKeyAutoResolveDeps = {
    authState: AuthenticationState;
    requestKey: (keyIds: string[]) => Promise<string>;
    logger?: Pick<ILogger, 'warn'>;
};
export declare const makeSyncKeyAutoResolver: (deps: SyncKeyAutoResolveDeps) => () => Promise<SyncKeyAutoResolveResult>;
