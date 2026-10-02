import { Boom } from '@hapi/boom';
import { proto } from '../../WAProto/index.js';
import { areJidsSameUser, isHostedLidUser, isHostedPnUser, isJidBroadcast, isJidGroup, isJidMetaAI, isJidNewsletter, isJidStatusBroadcast, isLidUser, isPnUser } from '../WABinary/index.js';
import { unpadRandomMax16 } from './generics.js';
export const getDecryptionJid = async (sender, repository) => {
    if (isLidUser(sender) || isHostedLidUser(sender)) {
        return sender;
    }
    const mapped = await repository.lidMapping.getLIDForPN(sender);
    return mapped || sender;
};
export const decodeMessageNode = (stanza, meId, meLid) => {
    let msgType;
    let chatId;
    let author;
    const msgId = stanza.attrs.id;
    const from = stanza.attrs.from;
    const participant = stanza.attrs.participant;
    const recipient = stanza.attrs.recipient;
    const isMe = (jid) => areJidsSameUser(jid, meId);
    const isMeLid = (jid) => areJidsSameUser(jid, meLid);
    if (isJidNewsletter(from) || isJidGroup(from) || isJidStatusBroadcast(from) || isJidBroadcast(from)) {
        msgType = isJidNewsletter(from) ? 'newsletter' : isJidGroup(from) ? 'group' : 'broadcast';
        chatId = from;
        author = participant || from;
    }
    else if (isMe(from) || isMeLid(from)) {
        msgType = 'from_me';
        chatId = recipient || from;
        author = from;
    }
    else {
        msgType = 'other';
        chatId = from;
        author = from;
    }
    const fromMe = isMe(from) || isMeLid(from) || !!stanza.attrs?.category;
    const pushName = stanza.attrs.notify;
    const key = {
        remoteJid: chatId,
        fromMe,
        id: msgId,
        participant: participant || undefined
    };
    return {
        fullMessage: {
            key,
            messageTimestamp: +stanza.attrs.t,
            pushName,
            broadcast: isJidBroadcast(from) || undefined
        },
        author,
        sender: author
    };
};
export const decryptMessageNode = (stanza, meId, meLid, repository, logger) => {
    const { fullMessage, author, sender } = decodeMessageNode(stanza, meId, meLid);
    return {
        fullMessage,
        category: stanza.attrs.category,
        author,
        async decrypt() {
            let decryptables = 0;
            if (Array.isArray(stanza.content)) {
                for (const { tag, attrs, content } of stanza.content) {
                    if (tag === 'verified_name' && content instanceof Uint8Array) {
                        const cert = proto.VerifiedNameCertificate.decode(content);
                        const details = proto.VerifiedNameCertificate.Details.decode(cert.details);
                        fullMessage.verifiedBizName = details.verifiedName;
                    }
                    if (tag === 'unavailable' && attrs.type === 'view_once') {
                        fullMessage.key.isViewOnce = true;
                    }
                    if (tag !== 'enc' && tag !== 'plaintext') {
                        continue;
                    }
                    if (!(content instanceof Uint8Array)) {
                        continue;
                    }
                    decryptables += 1;
                    let msgBuffer;
                    try {
                        const e2eType = tag === 'plaintext' ? 'msg' : attrs.type;
                        const jid = await getDecryptionJid(sender, repository);
                        msgBuffer = await repository.decryptMessage({
                            jid,
                            type: e2eType,
                            ciphertext: content
                        });
                        let msg = proto.Message.decode(tag === 'plaintext' ? msgBuffer : unpadRandomMax16(msgBuffer));
                        if (msg.senderKeyDistributionMessage) {
                            try {
                                await repository.processSenderKeyDistributionMessage({
                                    item: msg.senderKeyDistributionMessage,
                                    authorJid: author
                                });
                            }
                            catch (err) {
                                logger.error({ key: fullMessage.key, err }, 'failed to process sender key distribution message');
                            }
                        }
                        if (fullMessage.message) {
                            Object.assign(fullMessage.message, msg);
                        }
                        else {
                            fullMessage.message = msg;
                        }
                    }
                    catch (err) {
                        logger.error({ key: fullMessage.key, err }, 'failed to decrypt message');
                        fullMessage.messageStubType = proto.WebMessageInfo.StubType.CIPHERTEXT;
                        fullMessage.messageStubParameters = [err.message];
                    }
                }
            }
            if (!decryptables) {
                fullMessage.messageStubType = proto.WebMessageInfo.StubType.CIPHERTEXT;
                fullMessage.messageStubParameters = ['Message has no content'];
            }
        }
    };
};
