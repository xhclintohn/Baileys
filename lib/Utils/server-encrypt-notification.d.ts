import { type BinaryNode } from '../WABinary/index.js';
import type { ILogger } from './logger.js';
export type ServerEncryptNotificationResult = {
    action: 'in_flight';
} | {
    action: 'prekey_count';
    count: number;
    uploaded: boolean;
} | {
    action: 'digest_ok';
} | {
    action: 'digest_missing_uploaded';
} | {
    action: 'digest_failed';
    code?: number;
} | {
    action: 'pq_count_ignored';
} | {
    action: 'unknown';
};
export type ServerEncryptNotificationContext = {
    query: (node: BinaryNode) => Promise<unknown>;
    uploadPreKeys: () => Promise<void>;
    inFlightPreKeyLow: Set<string>;
    logger: ILogger;
};
export declare function handleServerEncryptNotification(node: BinaryNode, ctx: ServerEncryptNotificationContext): Promise<ServerEncryptNotificationResult>;
