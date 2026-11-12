import { proto } from '../../WAProto/index.js';
import type { ILogger } from '../Utils/logger.js';
import type { MediaGenerationOptions, WAMediaUploadFunction } from '../Types/Message.js';
import type { WAMessage, AnyMessageContent } from '../Types/index.js';
import type { SocketConfig } from '../Types/Socket.js';
export type ToxicMessageType = 'PAYMENT' | 'PRODUCT' | 'INTERACTIVE' | 'INTERACTIVE_BUTTONS' | 'ALBUM' | 'EVENT' | 'POLL_RESULT' | 'GROUP_STORY';
export type ToxicSendContent = Record<string, any>;
export declare class ToxicHandler {
    private utils;
    private relayMessage;
    private waUploadToServer;
    private config;
    private sock;
    constructor(waUploadToServer: WAMediaUploadFunction, relayMessageFn: Function, config: SocketConfig & {
        logger: ILogger;
    }, sock: any);
    detectType(content: ToxicSendContent): ToxicMessageType | null;
    handlePayment(content: ToxicSendContent, quoted?: WAMessage): Promise<proto.IMessage>;
    handleProduct(content: ToxicSendContent, jid: string, quoted?: WAMessage): Promise<proto.IMessage>;
    handleInteractive(content: ToxicSendContent, jid: string, quoted?: WAMessage): Promise<proto.IMessage>;
    handleInteractiveButtons(content: ToxicSendContent, jid: string, quoted?: WAMessage): Promise<proto.IMessage>;
    handleAlbum(content: ToxicSendContent, jid: string, quoted?: WAMessage): Promise<WAMessage>;
    handleEvent(content: ToxicSendContent, jid: string, quoted?: WAMessage): Promise<WAMessage>;
    handlePollResult(content: ToxicSendContent, jid: string, quoted?: WAMessage): Promise<WAMessage>;
    handleGroupStory(content: ToxicSendContent, jid: string, quoted?: WAMessage): Promise<WAMessage>;
    sendStatusWhatsApp(content: ToxicSendContent, jids?: string[]): Promise<WAMessage>;
}
export type GroupStatusOptions = Pick<MediaGenerationOptions, 'backgroundColor' | 'font'>;
export type GroupStatusDeps = {
    relayMessage: (jid: string, message: proto.IMessage, opts: {
        messageId: string;
    }) => Promise<unknown>;
    waUploadToServer: WAMediaUploadFunction;
    userJid?: string;
};
export declare const sendGroupStatus: (jid: string, content: AnyMessageContent, deps: GroupStatusDeps, options?: GroupStatusOptions) => Promise<WAMessage>;
export {};
//# sourceMappingURL=groupStatus.d.ts.map