import { deriveSecrets } from 'libsignal/src/crypto.js';
export class SenderMessageKey {
    constructor(iteration, seed) {
        this.iteration = 0;
        this.iv = Buffer.alloc(0);
        this.cipherKey = Buffer.alloc(0);
        this.seed = Buffer.alloc(0);
        const derivative = deriveSecrets(seed, Buffer.alloc(32), Buffer.from('WhisperGroup'));
        const keys = new Uint8Array(32);
        keys.set(new Uint8Array(derivative[0].slice(16)));
        keys.set(new Uint8Array(derivative[1].slice(0, 16)), 16);
        this.iv = Buffer.from(derivative[0].slice(0, 16));
        this.cipherKey = Buffer.from(keys);
        this.iteration = iteration;
        this.seed = seed;
    }
    getIteration() {
        return this.iteration;
    }
    getIv() {
        return this.iv;
    }
    getCipherKey() {
        return this.cipherKey;
    }
    getSeed() {
        return this.seed;
    }
}
