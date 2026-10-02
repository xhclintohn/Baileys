import * as nodeCrypto from 'crypto';
export function generateSenderKey() {
    return nodeCrypto.randomBytes(32);
}
export function generateSenderKeyId() {
    return nodeCrypto.randomInt(2147483647);
}
export function generateSenderSigningKey(keyPair) {
    if (!keyPair) {
        const { generateKeyPairSync } = nodeCrypto;
        const keys = generateKeyPairSync('ed25519');
        return {
            public: Buffer.from(keys.publicKey.export({ type: 'spki', format: 'der' }).slice(-32)),
            private: Buffer.from(keys.privateKey.export({ type: 'pkcs8', format: 'der' }).slice(-32))
        };
    }
    return keyPair;
}
