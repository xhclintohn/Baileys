import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, hkdfSync } from 'crypto'
import * as curve from 'libsignal/src/curve'
import { KEY_BUNDLE_TYPE } from '../Defaults'
import type { KeyPair } from '../Types'

export function md5(buffer: Buffer | Uint8Array) {
	return createHash('md5').update(buffer).digest()
}

export function hkdf(
	buffer: Uint8Array | Buffer,
	expandedLength: number,
	info: { salt?: Buffer; info?: string } = {}
): Buffer {
	const salt = info.salt ? Buffer.from(info.salt) : Buffer.alloc(0)
	const infoBuf = info.info ? Buffer.from(info.info) : Buffer.alloc(0)
	return Buffer.from(hkdfSync('sha256', buffer, salt, infoBuf, expandedLength))
}

const { subtle } = globalThis.crypto

export const generateSignalPubKey = (pubKey: Uint8Array | Buffer) =>
	pubKey.length === 33 ? pubKey : Buffer.concat([KEY_BUNDLE_TYPE, pubKey])

export const Curve = {
	generateKeyPair: (): KeyPair => {
		const { pubKey, privKey } = curve.generateKeyPair()
		return {
			private: Buffer.from(privKey),
			public: Buffer.from(pubKey.slice(1))
		}
	},
	sharedKey: (privateKey: Uint8Array, publicKey: Uint8Array) => {
		const shared = curve.calculateAgreement(generateSignalPubKey(publicKey), privateKey)
		return Buffer.from(shared)
	},
	sign: (privateKey: Uint8Array, buf: Uint8Array) => curve.calculateSignature(privateKey, buf),
	verify: (pubKey: Uint8Array, message: Uint8Array, signature: Uint8Array) => {
		try {
			curve.verifySignature(generateSignalPubKey(pubKey), message, signature)
			return true
		} catch (error) {
			return false
		}
	}
}

export const signedKeyPair = (identityKeyPair: KeyPair, keyId: number) => {
	const preKey = Curve.generateKeyPair()
	const pubKey = generateSignalPubKey(preKey.public)

	const signature = Curve.sign(identityKeyPair.private, pubKey)

	return { keyPair: preKey, signature, keyId }
}

const GCM_TAG_LENGTH = 128 >> 3

export function aesEncryptGCM(plaintext: Uint8Array, key: Uint8Array, iv: Uint8Array, additionalData: Uint8Array) {
	const cipher = createCipheriv('aes-256-gcm', key, iv)
	cipher.setAAD(additionalData)
	return Buffer.concat([cipher.update(plaintext), cipher.final(), cipher.getAuthTag()])
}

export function aesDecryptGCM(ciphertext: Uint8Array, key: Uint8Array, iv: Uint8Array, additionalData: Uint8Array) {
	const decipher = createDecipheriv('aes-256-gcm', key, iv)
	const enc = ciphertext.slice(0, ciphertext.length - GCM_TAG_LENGTH)
	const tag = ciphertext.slice(ciphertext.length - GCM_TAG_LENGTH)
	decipher.setAAD(additionalData)
	decipher.setAuthTag(tag)
	return Buffer.concat([decipher.update(enc), decipher.final()])
}

export function aesEncryptCTR(plaintext: Uint8Array, key: Uint8Array, iv: Uint8Array) {
	const cipher = createCipheriv('aes-256-ctr', key, iv)
	return Buffer.concat([cipher.update(plaintext), cipher.final()])
}

export function aesDecryptCTR(ciphertext: Uint8Array, key: Uint8Array, iv: Uint8Array) {
	const decipher = createDecipheriv('aes-256-ctr', key, iv)
	return Buffer.concat([decipher.update(ciphertext), decipher.final()])
}

export function aesDecrypt(buffer: Uint8Array, key: Uint8Array) {
	return aesDecryptWithIV(buffer.slice(16, buffer.length), key, buffer.slice(0, 16))
}

export function aesDecryptWithIV(buffer: Uint8Array, key: Uint8Array, IV: Uint8Array) {
	const decipher = createDecipheriv('aes-256-cbc', key, IV)
	return Buffer.concat([decipher.update(buffer), decipher.final()])
}

export function aesEncrypt(buffer: Uint8Array | Buffer, key: Uint8Array | Buffer) {
	const IV = randomBytes(16)
	const cipher = createCipheriv('aes-256-cbc', key, IV)
	return Buffer.concat([IV, cipher.update(buffer), cipher.final()])
}

export function aesEncrypWithIV(buffer: Buffer, key: Buffer, IV: Buffer) {
	const cipher = createCipheriv('aes-256-cbc', key, IV)
	return Buffer.concat([cipher.update(buffer), cipher.final()])
}

export function hmacSign(buffer: Buffer | Uint8Array, key: Buffer | Uint8Array, variant: 'sha256' | 'sha512' = 'sha256') {
	return createHmac(variant, key).update(buffer).digest()
}

export function sha256(buffer: Buffer) {
	return createHash('sha256').update(buffer).digest()
}

export async function derivePairingCodeKey(pairingCode: string, salt: Buffer): Promise<Buffer> {
	const key = await subtle.importKey(
		'raw',
		Buffer.from(pairingCode),
		{ name: 'HKDF', hash: 'SHA-256' },
		false,
		['deriveBits']
	)
	const bits = await subtle.deriveBits(
		{ name: 'HKDF', hash: 'SHA-256', salt, info: new Uint8Array(0) },
		key,
		32 * 8
	)
	return Buffer.from(bits)
}
