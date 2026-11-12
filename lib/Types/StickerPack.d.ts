import type { WAMediaUpload, WAMessage } from './Message.js';
export type StickerPackSticker = {
    data: WAMediaUpload;
    fileName?: string;
    emojis?: string[];
    isAnimated?: boolean;
    isLottie?: boolean;
    accessibilityLabel?: string;
    mimetype?: string;
};
export type StickerPack = {
    name: string;
    publisher: string;
    description?: string;
    stickers: StickerPackSticker[];
    trayIcon: WAMediaUpload;
    trayIconFileName?: string;
    stickerPackId?: string;
    origin?: 'FIRST_PARTY' | 'THIRD_PARTY' | 'USER_CREATED';
    caption?: string;
};
export type StickerPackResult = {
    message: WAMessage;
    stickerPackId: string;
};
//# sourceMappingURL=StickerPack.d.ts.map
