import { randomUUID } from 'crypto';
import { generateWAMessageFromContent } from './messages.js';

export async function sendHtml(sockOrJid, jidOrHtml, htmlOrOpts, maybeOpts) {
    let sock, jid, html, opts;
    if (sockOrJid && typeof sockOrJid === 'object' && typeof sockOrJid.relayMessage === 'function') {
        sock = sockOrJid;
        jid = jidOrHtml;
        html = htmlOrOpts || '';
        opts = maybeOpts || {};
    } else {
        jid = sockOrJid;
        html = jidOrHtml || '';
        opts = htmlOrOpts || {};
        sock = opts.sock;
    }
    if (!sock || typeof sock.relayMessage !== 'function') {
        throw new Error('sendHtml requires a socket with relayMessage (pass sock as first arg)');
    }
    const waMsg = generateWAMessageFromContent(
        jid,
        {
            botForwardedMessage: {
                message: {
                    richResponseMessage: {
                        messageType: 1,
                        unifiedResponse: {
                            data: Buffer.from(
                                JSON.stringify({
                                    __typename: 'GenAIUnifiedResponse',
                                    response_id: randomUUID(),
                                    sections: [
                                        {
                                            __typename: 'GenAIUnifiedResponseSection',
                                            view_model: {
                                                __typename: 'GenAISingleLayoutViewModel',
                                                primitive: {
                                                    __typename: 'FOAHtmlPrimitiveDemoDONOTUSE',
                                                    trusted_sources: [],
                                                    payload: String(html).trim()
                                                }
                                            }
                                        }
                                    ]
                                })
                            ).toString('base64')
                        },
                        contextInfo: {
                            isForwarded: true,
                            forwardOrigin: 4,
                            ...(opts.contextInfo || {})
                        }
                    }
                }
            }
        },
        { quoted: opts.quoted, userJid: opts.userJid }
    );
    await sock.relayMessage(jid, waMsg.message, { messageId: waMsg.key.id, quoted: opts.quoted });
    return waMsg;
}
