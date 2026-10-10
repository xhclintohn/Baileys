import { hkdf } from './crypto.js';

const HASH_LENGTH = 128;

class LTHashAntiTampering {
    constructor(salt = 'WhatsApp Patch Integrity') {
        this.salt = salt;
    }
    add(hash, items) {
        let result = hash;
        for (const item of items) {
            result = this._addSingle(result, item);
        }
        return result;
    }
    subtract(hash, items) {
        let result = hash;
        for (const item of items) {
            result = this._subtractSingle(result, item);
        }
        return result;
    }
    subtractThenAdd(hash, subItems, addItems) {
        return this.add(this.subtract(hash, subItems), addItems);
    }
    _addSingle(hash, item) {
        const derived = hkdf(Buffer.from(item), HASH_LENGTH, { info: this.salt });
        return this.performPointwiseWithOverflow(hash, derived, (a, b) => (a + b) & 0xffff);
    }
    _subtractSingle(hash, item) {
        const derived = hkdf(Buffer.from(item), HASH_LENGTH, { info: this.salt });
        return this.performPointwiseWithOverflow(hash, derived, (a, b) => (a - b) & 0xffff);
    }
    performPointwiseWithOverflow(hash, other, op) {
        const a = Buffer.from(hash);
        const b = Buffer.from(other);
        const out = Buffer.alloc(HASH_LENGTH);
        for (let i = 0; i < HASH_LENGTH; i += 2) {
            const x = a.readUInt16LE(i);
            const y = b.readUInt16LE(i);
            out.writeUInt16LE(op(x, y) & 0xffff, i);
        }
        return out;
    }
}

export const LT_HASH_ANTI_TAMPERING = new LTHashAntiTampering();
