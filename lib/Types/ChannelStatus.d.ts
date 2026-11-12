import type { proto } from '../../WAProto/index.js';
export type ChannelStatus = {
    id: string;
    channelJid: string;
    type: string;
    serverId?: string;
    messageTimestamp: number;
    offline?: boolean;
    text?: string;
    backgroundArgb?: number;
    font?: number;
    message?: proto.IMessage;
};
//# sourceMappingURL=ChannelStatus.d.ts.map
