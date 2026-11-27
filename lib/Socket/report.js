import { randomBytes } from 'crypto';
import { proto } from '../../WAProto/index.js';
import { SPAM_FLOWS } from '../Types/Report.js';
import { extractReportingTokenContentForMessage } from '../Utils/reporting-utils.js';
import { getBinaryNodeChild, isJidGroup, S_WHATSAPP_NET } from '../WABinary/index.js';
const TRACE_ID_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const generateTraceId = () => {
    const bytes = randomBytes(24);
    let id = '';
    for (const byte of bytes) {
        id += TRACE_ID_ALPHABET[byte % TRACE_ID_ALPHABET.length];
    }
    return id;
};
const mediaTypeOf = (message) => {
    if (!message) {
        return undefined;
    }
    if (message.videoMessage?.gifPlayback) {
        return 'gif';
    }
    if (message.imageMessage) {
        return 'image';
    }
    if (message.videoMessage) {
        return 'video';
    }
    if (message.audioMessage) {
        return 'audio';
    }
    return undefined;
};
const messageTimestamp = (message) => {
    const ts = message.messageTimestamp;
    if (!ts) {
        return '0';
    }
    return typeof ts === 'number' ? String(ts) : ts.toString();
};
const resolveSpamFlow = (options, fallback) => options.spamFlow ?? options.flow ?? fallback;
const buildSpamMessageNode = (message, meJid) => {
    const senderJid = message.key.participantAlt ?? message.key.participant ?? (message.key.fromMe ? meJid : message.key.remoteJid);
    const isGroup = !!message.key.remoteJid && isJidGroup(message.key.remoteJid);
    const messageAttrs = {
        id: message.key.id || '',
        t: messageTimestamp(message)
    };
    if (senderJid) {
        if (isGroup) {
            messageAttrs.from = message.key.remoteJid;
            messageAttrs.participant = senderJid;
        }
        else {
            messageAttrs.from = senderJid;
        }
    }
    const messageContent = [];
    if (message.message) {
        const raw = extractReportingTokenContentForMessage(Buffer.from(proto.Message.encode(message.message).finish()));
        if (raw && raw.length > 0) {
            const mediatype = mediaTypeOf(message.message);
            messageContent.push({
                tag: 'raw',
                attrs: { v: '3', ...(mediatype ? { mediatype } : {}) },
                content: raw
            });
        }
    }
    return {
        tag: 'message',
        attrs: messageAttrs,
        content: messageContent
    };
};
export const buildSpamReportNode = (message, options, meJid) => {
    const spamListAttrs = {
        spam_flow: resolveSpamFlow(options, SPAM_FLOWS.CHAT),
        wi_trace_id: options.traceId ?? generateTraceId()
    };
    if (options.groupJid) {
        spamListAttrs.jid = options.groupJid;
    }
    if (options.source) {
        spamListAttrs.source = options.source;
    }
    if (options.groupSubject) {
        spamListAttrs.subject = options.groupSubject;
    }
    return {
        tag: 'iq',
        attrs: {
            xmlns: 'spam',
            to: S_WHATSAPP_NET,
            type: 'set'
        },
        content: [
            {
                tag: 'spam_list',
                attrs: spamListAttrs,
                content: [buildSpamMessageNode(message, meJid)]
            }
        ]
    };
};
export const buildTargetReportNode = (jid, options = {}, meJid) => {
    const spamListAttrs = {
        spam_flow: resolveSpamFlow(options, SPAM_FLOWS.OVERFLOW_MENU),
        wi_trace_id: options.traceId ?? generateTraceId(),
        jid
    };
    if (options.source) {
        spamListAttrs.source = options.source;
    }
    if (options.groupSubject) {
        spamListAttrs.subject = options.groupSubject;
    }
    return {
        tag: 'iq',
        attrs: {
            xmlns: 'spam',
            to: S_WHATSAPP_NET,
            type: 'set'
        },
        content: [
            {
                tag: 'spam_list',
                attrs: spamListAttrs,
                content: (options.messages ?? []).map(message => buildSpamMessageNode(message, meJid))
            }
        ]
    };
};
const parseReportId = (result) => {
    const report = getBinaryNodeChild(result, 'report');
    if (report) {
        if (report.attrs.id) {
            return report.attrs.id;
        }
        if (typeof report.content === 'string' && report.content) {
            return report.content;
        }
    }
    const node = getBinaryNodeChild(result, 'report_id');
    if (!node?.content) {
        return null;
    }
    return typeof node.content === 'string' ? node.content : node.content.toString();
};
export const reportSpam = async (messages, deps, options = {}) => {
    const results = [];
    for (const message of messages) {
        const node = buildSpamReportNode(message, options, deps.meJid);
        const result = await deps.query(node);
        results.push({ reportId: parseReportId(result), messageId: message.key.id || '' });
    }
    return results;
};
export const reportTarget = async (jid, deps, options = {}) => {
    const node = buildTargetReportNode(jid, options, deps.meJid);
    const result = await deps.query(node);
    return {
        jid,
        flow: resolveSpamFlow(options, SPAM_FLOWS.OVERFLOW_MENU),
        reported: true,
        reportId: parseReportId(result),
        node
    };
};
export const reportContact = async (jid, messages, deps, options = {}) => {
    void jid;
    return reportSpam(messages, deps, { spamFlow: SPAM_FLOWS.CHAT, ...options });
};
export const reportGroup = async (jid, messages, deps, options = {}) => reportSpam(messages, deps, { spamFlow: SPAM_FLOWS.GROUP_INFO, groupJid: jid, ...options });
export const reportStatus = async (jid, messages, deps, options = {}) => {
    void jid;
    return reportSpam(messages, deps, { spamFlow: SPAM_FLOWS.STATUS_POST, ...options });
};
export const reportNewsletter = async (jid, messages, deps, options = {}) => {
    void jid;
    return reportSpam(messages, deps, { spamFlow: SPAM_FLOWS.NEWSLETTER_INFO, ...options });
};
export const reportChannelStatus = async (jid, messages, deps, options = {}) => {
    void jid;
    return reportSpam(messages, deps, { spamFlow: SPAM_FLOWS.CHANNEL_STATUS, ...options });
};
export const reportEvent = async (jid, messages, deps, options = {}) => {
    void jid;
    return reportSpam(messages, deps, { spamFlow: SPAM_FLOWS.EVENT_INFO, ...options });
};
export const reportAndBlock = async (jid, messages, deps, options = {}) => {
    if (!deps.updateBlockStatus) {
        throw new Error('reportAndBlock needs updateBlockStatus');
    }
    const results = await reportContact(jid, messages, deps, options);
    await deps.updateBlockStatus(jid, 'block');
    return results;
};
//# sourceMappingURL=report.js.map