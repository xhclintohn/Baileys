import { hkdf } from './crypto'

const HASH_LENGTH = 128

class LTHashAntiTampering {
	salt: string
	constructor(salt = 'WhatsApp Patch Integrity') {
		this.salt = salt
	}
	add(hash: Buffer | Uint8Array, items: Uint8Array[]) {
		let result: Buffer | Uint8Array = hash
		for (const item of items) {
			result = this._addSingle(result, item)
		}
		return result
	}
	subtract(hash: Buffer | Uint8Array, items: Uint8Array[]) {
		let result: Buffer | Uint8Array = hash
		for (const item of items) {
			result = this._subtractSingle(result, item)
		}
		return result
	}
	subtractThenAdd(hash: Buffer | Uint8Array, subItems: Uint8Array[], addItems: Uint8Array[]) {
		return this.add(this.subtract(hash, subItems), addItems)
	}
	_addSingle(hash: Buffer | Uint8Array, item: Uint8Array) {
		const derived = hkdf(Buffer.from(item), HASH_LENGTH, { info: this.salt })
		return this.performPointwiseWithOverflow(hash, derived, (a, b) => (a + b) & 0xffff)
	}
	_subtractSingle(hash: Buffer | Uint8Array, item: Uint8Array) {
		const derived = hkdf(Buffer.from(item), HASH_LENGTH, { info: this.salt })
		return this.performPointwiseWithOverflow(hash, derived, (a, b) => (a - b) & 0xffff)
	}
	performPointwiseWithOverflow(
		hash: Buffer | Uint8Array,
		other: Buffer | Uint8Array,
		op: (a: number, b: number) => number
	) {
		const a = Buffer.from(hash)
		const b = Buffer.from(other)
		const out = Buffer.alloc(HASH_LENGTH)
		for (let i = 0; i < HASH_LENGTH; i += 2) {
			const x = a.readUInt16LE(i)
			const y = b.readUInt16LE(i)
			out.writeUInt16LE(op(x, y) & 0xffff, i)
		}
		return out
	}
}

export const LT_HASH_ANTI_TAMPERING = new LTHashAntiTampering()
