export { GroupSessionBuilder } from './group-session-builder.js';
export { SenderKeyDistributionMessage } from './sender-key-distribution-message.js';
export { SenderKeyRecord } from './sender-key-record.js';
export { SenderKeyName } from './sender-key-name.js';
export { GroupCipher } from './group_cipher.js';
export function serializeCiphertextMessage(msg) {
    return Buffer.from(msg.serialize());
}
