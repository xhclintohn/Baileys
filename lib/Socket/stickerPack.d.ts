import { proto } from '../../WAProto/index.js';
import type { StickerPack, StickerPackResult, WAMediaUploadFunction } from '../Types/index.js';
import type { ILogger } from '../Utils/logger.js';
export type StickerPackDeps = {
    relayMessage: (jid: string, message: proto.IMessage, opts: {
        messageId: string;
    }) => Promise<unknown>;
    upload: WAMediaUploadFunction;
    userJid?: string;
    logger?: ILogger;
};
export declare const sendStickerPack: (jid: string, pack: StickerPack, deps: StickerPackDeps) => Promise<StickerPackResult>;
//# sourceMappingURL=stickerPack.d.ts.map
