import type { AuthenticationState } from '../Types/index.js';
export type MultiFileAuthStateOptions = {
    maxPreKeys?: number;
};
export declare const useMultiFileAuthState: (folder: string, options?: MultiFileAuthStateOptions) => Promise<{
    state: AuthenticationState;
    saveCreds: () => Promise<void>;
}>;
//# sourceMappingURL=use-multi-file-auth-state.d.ts.map
