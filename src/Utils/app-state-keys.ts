import { hkdf } from './crypto'

export function expandAppStateKeys(keydata: Uint8Array) {
	const expanded = hkdf(keydata, 160, { info: 'WhatsApp Mutation Keys' })
	return {
		indexKey: expanded.slice(0, 32),
		valueEncryptionKey: expanded.slice(32, 64),
		valueMacKey: expanded.slice(64, 96),
		snapshotMacKey: expanded.slice(96, 128),
		patchMacKey: expanded.slice(128, 160)
	}
}
