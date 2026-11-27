import type { AuthenticationState } from '../Types/index.js';
import type { ILogger } from './logger.js';
export type SqliteAuthStateOptions = {
    fileName?: string;
    migrateFromFolder?: string;
    logger?: ILogger;
    maxPreKeys?: number;
    compactThresholdBytes?: number;
    encryptionKey?: string | Buffer;
};
export declare const useSqliteAuthState: (pathOrFolder: string, options?: SqliteAuthStateOptions) => Promise<{
    state: AuthenticationState;
    saveCreds: () => Promise<void>;
    db: any;
    close: () => void;
    compact: () => void;
    prunePreKeys: () => number;
}>;
//# sourceMappingURL=use-sqlite-auth-state.d.ts.map