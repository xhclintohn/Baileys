import { MIN_PREKEY_COUNT } from '../Defaults/index.js';
import { getBinaryNodeChild, S_WHATSAPP_NET } from '../WABinary/index.js';
export async function handleServerEncryptNotification(node, ctx) {
    const { query, uploadPreKeys, inFlightPreKeyLow, logger } = ctx;
    const stanzaId = node.attrs.id;
    if (stanzaId && inFlightPreKeyLow.has(stanzaId)) {
        return { action: 'in_flight' };
    }
    const countChild = getBinaryNodeChild(node, 'count');
    if (countChild) {
        const count = +countChild.attrs.value;
        const shouldUploadMorePreKeys = count < MIN_PREKEY_COUNT;
        logger.debug({ count, shouldUploadMorePreKeys }, 'recv pre-key count');
        if (shouldUploadMorePreKeys) {
            if (stanzaId)
                inFlightPreKeyLow.add(stanzaId);
            try {
                await uploadPreKeys();
            }
            finally {
                if (stanzaId)
                    inFlightPreKeyLow.delete(stanzaId);
            }
        }
        return { action: 'prekey_count', count, uploaded: shouldUploadMorePreKeys };
    }
    if (getBinaryNodeChild(node, 'digest')) {
        try {
            await query({
                tag: 'iq',
                attrs: { xmlns: 'encrypt', type: 'get', to: S_WHATSAPP_NET },
                content: [{ tag: 'digest', attrs: {} }]
            });
            logger.debug('key bundle digest checked');
            return { action: 'digest_ok' };
        }
        catch (error) {
            const code = Number(error?.data);
            if (code === 404) {
                logger.info('server has no key bundle for us (digest 404), uploading pre-keys');
                await uploadPreKeys();
                return { action: 'digest_missing_uploaded' };
            }
            logger.warn({ error, code }, 'failed to check key bundle digest');
            return { action: 'digest_failed', code: Number.isNaN(code) ? undefined : code };
        }
    }
    if (getBinaryNodeChild(node, 'pq_count')) {
        logger.debug('recv post-quantum pre-key count, ignoring');
        return { action: 'pq_count_ignored' };
    }
    logger.info({ node }, 'unknown server encrypt notification');
    return { action: 'unknown' };
}
