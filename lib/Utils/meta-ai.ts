import { createCipheriv, createDecipheriv } from 'crypto'
import { proto } from '../../WAProto/index.js'
import { hkdf } from './crypto.js'
import { unpadRandomMax16 } from './generics.js'

const BOT_MESSAGE_INFO = 'Bot Message'
const KEY_LENGTH = 32

const toBuffer = (value: any): Buffer => {
	if (Buffer.isBuffer(value)) return value
	if (value instanceof Uint8Array) return Buffer.from(value.buffer, value.byteOffset, value.byteLength)
	return Buffer.from(value)
}

const normalizeLidJid = (jid?: string) => {
	if (!jid || !jid.endsWith('@lid') || !jid.includes(':')) return jid
	return `${jid.split(':')[0]}@lid`
}

const selectMsgIdCandidates = (messageKey: any) => {
	const seen = new Set<string>()
	const result: string[] = []
	for (const id of [messageKey?.botEditTargetId, messageKey?.stanzaId, messageKey?.metaTargetId]) {
		const s = id ? String(id) : ''
		if (s && !seen.has(s)) {
			seen.add(s)
			result.push(s)
		}
	}
	return result
}

const selectTargetJidCandidates = (messageKey: any) => {
	const seen = new Set<string>()
	const result: string[] = []
	for (const jid of [normalizeLidJid(messageKey?.meId), normalizeLidJid(messageKey?.meLid)]) {
		const s = jid ? String(jid) : ''
		if (s && !seen.has(s)) {
			seen.add(s)
			result.push(s)
		}
	}
	return result
}

export const parseUnifiedResponseData = (data: any) => {
	if (!data) return null
	try {
		let buf: Buffer
		if (Buffer.isBuffer(data)) buf = data
		else if (data instanceof Uint8Array) buf = Buffer.from(data)
		else if (typeof data === 'string') buf = Buffer.from(data, 'base64')
		else if (data.type === 'Buffer' && Array.isArray(data.data)) buf = Buffer.from(data.data)
		else return null
		return JSON.parse(buf.toString('utf8'))
	} catch {
		return null
	}
}

export const textFromUnifiedResponse = (data: any) => {
	const j = parseUnifiedResponseData(data)
	if (!j) return null
	const parts: string[] = []
	for (const section of j.sections || []) {
		const t = section?.view_model?.primitive?.text
		if (t) parts.push(t)
	}
	return parts.length ? parts.join('\n') : null
}

export const textFromRichResponse = (rr: any) => {
	if (!rr) return null
	if (Array.isArray(rr.submessages)) {
		const parts = rr.submessages.map((sm: any) => sm?.messageText).filter((t: any) => typeof t === 'string' && t.length)
		if (parts.length) return parts.join('\n')
	}
	return textFromUnifiedResponse(rr.unifiedResponse?.data)
}

export const extractMetaAiText = (message: any) => {
	if (!message) return null
	const body = message.protocolMessage?.editedMessage || message
	return body.extendedTextMessage?.text ?? body.conversation ?? textFromRichResponse(body.richResponseMessage) ?? null
}

export const decodeUnifiedResponseInPlace = (message: any) => {
	if (!message || typeof message !== 'object') return message
	const bodies = [message, message.protocolMessage?.editedMessage, message.editedMessage].filter(Boolean)
	for (const body of bodies) {
		const ur = body.richResponseMessage?.unifiedResponse
		if (ur && ur.data != null && ur.decodedData === undefined) {
			ur.decodedData = parseUnifiedResponseData(ur.data)
			const txt = textFromUnifiedResponse(ur.data)
			if (txt != null) ur.text = txt
		}
	}
	return message
}

export const decodeDecryptedMsmsgMessage = (decrypted: any) => {
	const buf = toBuffer(decrypted)
	try {
		const unpadded = Buffer.from(unpadRandomMax16(buf))
		const decoded = proto.Message.decode(unpadded)
		const hasContent = Object.keys(decoded).some(k => k !== 'messageContextInfo' && (decoded as any)[k] != null)
		if (hasContent) return decodeUnifiedResponseInPlace(decoded)
	} catch {}
	return decodeUnifiedResponseInPlace(proto.Message.decode(buf))
}

export const decryptMsmsgBotMessage = async (messageSecret: any, messageKey: any, msMsg: any) => {
	if (!messageSecret || (messageSecret instanceof Uint8Array && !messageSecret.byteLength)) {
		throw new Error('Missing required messageSecret for msmsg decryption')
	}
	if (!messageKey?.participant) throw new Error('Missing required participant for msmsg decryption')
	if (!messageKey?.meId) throw new Error('Missing required meId for msmsg decryption')
	if (!msMsg?.encIv) throw new Error('Missing required encIv for msmsg decryption')
	if (!msMsg?.encPayload) throw new Error('Missing required encPayload for msmsg decryption')

	const msgIdCandidates = selectMsgIdCandidates(messageKey)
	if (!msgIdCandidates.length) throw new Error('Missing required target message id for msmsg decryption')

	const targetJidCandidates = selectTargetJidCandidates(messageKey)
	if (!targetJidCandidates.length) throw new Error('Missing required target JID for msmsg decryption')

	const botJidBuf = Buffer.from(String(messageKey.participant))
	const payload = toBuffer(msMsg.encPayload)
	const iv = toBuffer(msMsg.encIv)

	const baseKey = Buffer.from(hkdf(toBuffer(messageSecret), KEY_LENGTH, { info: BOT_MESSAGE_INFO }))

	let lastError: any
	for (const msgId of msgIdCandidates) {
		const idBuf = Buffer.from(msgId)
		for (const targetJid of targetJidCandidates) {
			const info = Buffer.concat([idBuf, Buffer.from(targetJid), botJidBuf])
			const key = Buffer.from(hkdf(baseKey, KEY_LENGTH, { info }))
			const aad = Buffer.concat([idBuf, Buffer.from([0x00]), botJidBuf])
			try {
				const decipher = createDecipheriv('aes-256-gcm', key, iv)
				decipher.setAAD(aad)
				const tag = payload.subarray(payload.length - 16)
				const data = payload.subarray(0, payload.length - 16)
				decipher.setAuthTag(tag)
				return Buffer.concat([decipher.update(data), decipher.final()])
			} catch (e) {
				lastError = e
			}
		}
	}

	const err: any = new Error('msmsg decryption failed: all key derivation candidates exhausted')
	err.cause = lastError
	throw err
}
