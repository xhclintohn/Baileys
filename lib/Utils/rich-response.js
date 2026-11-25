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
const splitRow = (line) => {
    let value = line.trim();
    if (value.startsWith('|'))
        value = value.slice(1);
    if (value.endsWith('|') && !value.endsWith('\\|'))
        value = value.slice(0, -1);
    const cells = [];
    let cell = '';
    let escaped = false;
    for (const character of value) {
        if (escaped) {
            cell += character;
            escaped = false;
        }
        else if (character === '\\') {
            escaped = true;
        }
        else if (character === '|') {
            cells.push(cell.trim());
            cell = '';
        }
        else {
            cell += character;
        }
    }
    if (escaped)
        cell += '\\';
    cells.push(cell.trim());
    return cells;
};
const isSeparatorRow = (line) => {
    const cells = splitRow(line);
    return cells.length > 0 && cells.every(cell => /^:?-{3,}:?$/.test(cell));
};
export const parseMarkdownTables = (markdown, options = {}) => {
    if (typeof markdown !== 'string' || !markdown.trim()) {
        throw new TypeError('markdown must be a non-empty string');
    }
    const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
    const submessages = [];
    let prose = [];
    let tableCount = 0;
    const flushProse = () => {
        const messageText = prose.join('\n').trim();
        if (messageText)
            submessages.push({ messageType: 2, messageText });
        prose = [];
    };
    for (let index = 0; index < lines.length;) {
        const header = lines[index];
        const separator = lines[index + 1];
        if (header.includes('|') && separator !== undefined && isSeparatorRow(separator)) {
            flushProse();
            const rows = [
                { items: splitRow(header), isHeading: true }
            ];
            index += 2;
            while (index < lines.length && lines[index].includes('|') && lines[index].trim()) {
                rows.push({ items: splitRow(lines[index]), isHeading: false });
                index += 1;
            }
            const width = rows[0].items.length;
            if (width < 2 || rows.some(row => row.items.length !== width)) {
                throw new Error('Markdown table rows must contain the same number of columns');
            }
            submessages.push({
                messageType: 4,
                tableMetadata: {
                    title: tableCount === 0 ? options.title : undefined,
                    rows
                }
            });
            tableCount += 1;
            continue;
        }
        prose.push(header);
        index += 1;
    }
    flushProse();
    return submessages;
};
export const markdownToAIRichResponse = (markdown, options = {}) => ({
    messageType: 1,
    submessages: parseMarkdownTables(markdown, options),
    contextInfo: {
        forwardingScore: 1,
        isForwarded: true,
        forwardedAiBotMessageInfo: { botJid: '867051314767696@bot' },
        forwardOrigin: 4
    }
});
//# sourceMappingURL=rich-response.js.map
