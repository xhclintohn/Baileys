import { downloadMediaMessage, isViewOnceMessage, normalizeMessageContent } from './messages.js';
const MEDIA_FIELDS = [
    { field: 'imageMessage', type: 'image' },
    { field: 'videoMessage', type: 'video' },
    { field: 'ptvMessage', type: 'ptv' },
    { field: 'audioMessage', type: 'audio' }
];
const pickMedia = (content) => {
    if (!content)
        return null;
    for (const { field, type } of MEDIA_FIELDS) {
        const media = content[field];
        if (media)
            return { type, media };
    }
    return null;
};
const hasMediaKeys = (media) => !!(media && (('url' in media && media.url) || ('directPath' in media && media.directPath) || ('mediaKey' in media && media.mediaKey)));
export const getViewOnceMedia = (content) => {
    if (!content)
        return null;
    const normalized = normalizeMessageContent(content);
    const info = pickMedia(normalized);
    if (!info)
        return null;
    const flagged = info.media.viewOnce === true;
    if (!isViewOnceMessage(content) && !flagged)
        return null;
    return info;
};
const downloadBuffer = async (sock, message) => downloadMediaMessage(message, 'buffer', {}, { logger: sock.logger, reuploadRequest: sock.updateMediaMessage });
export const downloadViewOnceMessage = async (sock, message) => {
    const info = getViewOnceMedia(message.message);
    if (!info || !hasMediaKeys(info.media))
        return null;
    try {
        const buffer = await downloadBuffer(sock, message);
        return buffer?.length ? buffer : null;
    }
    catch {
        return null;
    }
};
const senderOf = (message) => {
    const raw = message.key?.participant || message.key?.remoteJid || '';
    return raw.split(':')[0];
};
const MAX_COPIES_PER_SENDER = 10;
const numericCore = (jid) => (jid || '').split('@')[0]?.split(':')[0]?.replace(/\D/g, '') || '';
export const handleViewOnce = (sock, options) => {
    const { onViewOnce, onError, senderCopyWindowMs = 300000, senderCopyWaitMs = 5000, senderCopyCacheMs = 86400000, includeOwn = false } = options;
    const copies = new Map();
    const pending = [];
    let stopped = false;
    let seqCounter = 0;
    const pruneCopies = (sender) => {
        const list = copies.get(sender);
        if (!list)
            return;
        const now = Date.now();
        const kept = list.filter(c => now - c.ts < senderCopyCacheMs);
        if (kept.length)
            copies.set(sender, kept);
        else
            copies.delete(sender);
    };
    const byNewest = (a, b) => (b.ts - a.ts) || (b.seq - a.seq);
    const findCopy = (sender, type) => {
        pruneCopies(sender);
        const now = Date.now();
        const list = (copies.get(sender) || []).filter(c => now - c.ts < senderCopyWindowMs);
        const sorted = [...list].sort(byNewest);
        return sorted.find(c => c.type === type) || sorted[0] || null;
    };
    const lookupCopy = (senderJid, type) => {
        const key = (senderJid || '').split(':')[0] || '';
        const candidates = [];
        const collect = (k) => {
            pruneCopies(k);
            candidates.push(...(copies.get(k) || []));
        };
        if (copies.has(key))
            collect(key);
        if (!candidates.length) {
            const core = numericCore(senderJid);
            if (core) {
                for (const k of copies.keys()) {
                    if (numericCore(k) === core)
                        collect(k);
                }
            }
        }
        if (!candidates.length)
            return null;
        const sorted = candidates.sort(byNewest);
        return (type ? sorted.find(c => c.type === type) : undefined) || sorted[0] || null;
    };
    const deliver = async (message, info, buffer, via) => {
        const media = info.media;
        await onViewOnce({
            key: message.key,
            chatJid: message.key?.remoteJid || '',
            sender: senderOf(message),
            type: info.type,
            buffer,
            mimetype: media.mimetype || undefined,
            caption: media.caption || undefined,
            message,
            via
        });
    };
    const trySenderCopy = async (item) => {
        const copy = findCopy(item.sender, item.info.type);
        if (!copy)
            return false;
        try {
            const buffer = copy.buffer?.length ? copy.buffer : await downloadBuffer(sock, copy.message);
            if (!buffer?.length)
                return false;
            copy.buffer = buffer;
            await deliver(item.message, item.info, buffer, 'sender-copy');
            return true;
        }
        catch {
            return false;
        }
    };
    const expirePending = () => {
        const now = Date.now();
        for (let i = pending.length - 1; i >= 0; i--) {
            if (pending[i].expires <= now) {
                const [item] = pending.splice(i, 1);
                onError?.(new Error('View-once media arrived without keys and no sender copy was found'), item.message);
            }
        }
    };
    const expiryTimer = setInterval(expirePending, 1000);
    const onUpsert = async ({ messages }) => {
        if (stopped)
            return;
        for (const message of messages) {
            try {
                if (!message.message)
                    continue;
                if (!includeOwn && message.key?.fromMe)
                    continue;
                const sender = senderOf(message);
                const info = getViewOnceMedia(message.message);
                if (!info) {
                    const plain = pickMedia(normalizeMessageContent(message.message));
                    if (plain && hasMediaKeys(plain.media)) {
                        const list = copies.get(sender) || [];
                        list.push({ ts: Date.now(), seq: ++seqCounter, type: plain.type, message });
                        while (list.length > MAX_COPIES_PER_SENDER)
                            list.shift();
                        copies.set(sender, list);
                        for (let i = pending.length - 1; i >= 0; i--) {
                            if (pending[i].sender === sender) {
                                const item = pending[i];
                                if (await trySenderCopy(item))
                                    pending.splice(i, 1);
                            }
                        }
                    }
                    continue;
                }
                if (hasMediaKeys(info.media)) {
                    const buffer = await downloadViewOnceMessage(sock, message);
                    if (buffer) {
                        await deliver(message, info, buffer, 'direct');
                        continue;
                    }
                }
                const item = { message, info, sender, expires: Date.now() + senderCopyWaitMs };
                if (!(await trySenderCopy(item))) {
                    pending.push(item);
                }
            }
            catch (err) {
                onError?.(err instanceof Error ? err : new Error(String(err)), message);
            }
        }
    };
    sock.ev.on('messages.upsert', onUpsert);
    return {
        stop: () => {
            stopped = true;
            clearInterval(expiryTimer);
            try { sock.ev.off('messages.upsert', onUpsert); } catch { }
            pending.length = 0;
            copies.clear();
        },
        getSenderCopy: (senderJid, type) => {
            const copy = lookupCopy(senderJid, type);
            if (!copy)
                return null;
            return { message: copy.message, type: copy.type, ts: copy.ts, buffer: copy.buffer };
        },
        downloadSenderCopy: async (senderJid, type) => {
            const copy = lookupCopy(senderJid, type);
            if (!copy)
                return null;
            try {
                const buffer = copy.buffer?.length ? copy.buffer : await downloadBuffer(sock, copy.message);
                if (!buffer?.length)
                    return null;
                copy.buffer = buffer;
                const media = pickMedia(normalizeMessageContent(copy.message.message))?.media;
                return { buffer, type: copy.type, mimetype: media?.mimetype || undefined, message: copy.message };
            }
            catch {
                return null;
            }
        }
    };
};
//# sourceMappingURL=view-once.js.map
