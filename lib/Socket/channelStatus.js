import { proto } from '../../WAProto/index.js';
import { generateMessageIDV2 } from '../Utils/generics.js';
import { generateWAMessageContent } from '../Utils/index.js';
import { getBinaryNodeChild } from '../WABinary/index.js';
export const decodeChannelStatus = (node) => {
    const from = node.attrs.from;
    if (!from?.endsWith('@newsletter')) {
        return undefined;
    }
    const plaintextNode = getBinaryNodeChild(node, 'plaintext');
    if (!plaintextNode?.content) {
        return undefined;
    }
    const contentBuf = typeof plaintextNode.content === 'string'
        ? Buffer.from(plaintextNode.content, 'binary')
        : Buffer.from(plaintextNode.content);
    let message;
    try {
        message = proto.Message.decode(contentBuf);
    }
    catch {
        return undefined;
    }
    const extendedText = message.extendedTextMessage;
    return {
        id: node.attrs.id || '',
        channelJid: from,
        type: node.attrs.type || 'text',
        serverId: node.attrs.server_id,
        messageTimestamp: +(node.attrs.t || 0),
        offline: !!node.attrs.offline,
        text: extendedText?.text || message.conversation || undefined,
        backgroundArgb: extendedText?.backgroundArgb ?? undefined,
        font: extendedText?.font ?? undefined,
        message
    };
};
export const sendChannelStatus = async (jid, content, deps, options = {}) => {
    const { sendNode, waUploadToServer, userJid } = deps;
    const inner = await generateWAMessageContent(content, { ...options, upload: waUploadToServer });
    const id = generateMessageIDV2(userJid);
    const bytes = proto.Message.encode(inner).finish();
    await sendNode({
        tag: 'status',
        attrs: {
            to: jid,
            id,
            type: 'text'
        },
        content: [{ tag: 'plaintext', attrs: {}, content: bytes }]
    });
    return { id, channelJid: jid, message: inner };
};
//# sourceMappingURL=channelStatus.js.map
