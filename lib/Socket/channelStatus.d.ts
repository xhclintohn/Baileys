import { proto } from '../../WAProto/index.js';
import type { ChannelStatus } from '../Types/ChannelStatus.js';
import type { AnyMessageContent } from '../Types/index.js';
import type { MediaGenerationOptions, WAMediaUploadFunction } from '../Types/Message.js';
import { type BinaryNode } from '../WABinary/index.js';
export type ChannelStatusOptions = Pick<MediaGenerationOptions, 'backgroundColor' | 'font'>;
export type ChannelStatusDeps = {
    sendNode: (node: BinaryNode) => Promise<unknown>;
    waUploadToServer: WAMediaUploadFunction;
    userJid?: string;
};
export type ChannelStatusSent = {
    id: string;
    channelJid: string;
    message: proto.IMessage;
};
export declare const decodeChannelStatus: (node: BinaryNode) => ChannelStatus | undefined;
export declare const sendChannelStatus: (jid: string, content: AnyMessageContent, deps: ChannelStatusDeps, options?: ChannelStatusOptions) => Promise<ChannelStatusSent>;
//# sourceMappingURL=channelStatus.d.ts.map
