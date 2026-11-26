import { proto } from '../../WAProto/index.js'
import { downloadMediaMessage, isViewOnceMessage, normalizeMessageContent } from './messages'
import type { WAMessage, WAMessageContent } from '../Types'
import type { WASocket } from '../index'

export type ViewOnceMediaType = 'image' | 'video' | 'audio' | 'ptv'

export type ViewOnceMediaMessage =
	| proto.Message.IImageMessage
	| proto.Message.IVideoMessage
	| proto.Message.IAudioMessage
	| proto.Message.IVideoMessage

export interface ViewOnceMediaInfo {
	type: ViewOnceMediaType
	media: ViewOnceMediaMessage
}

export interface ViewOnceResult {
	key: WAMessage['key']
	chatJid: string
	sender: string
	type: ViewOnceMediaType
	buffer: Buffer
	mimetype?: string
	caption?: string
	message: WAMessage
	via: 'direct' | 'sender-copy'
}

export interface ViewOnceHandlerOptions {
	onViewOnce: (result: ViewOnceResult) => void | Promise<void>
	onError?: (error: Error, message: WAMessage) => void | Promise<void>
	senderCopyWindowMs?: number
	senderCopyWaitMs?: number
	senderCopyCacheMs?: number
	includeOwn?: boolean
}

export interface CachedSenderCopy {
	message: WAMessage
	type: ViewOnceMediaType
	ts: number
	buffer?: Buffer
}

export interface ViewOnceHandler {
	stop: () => void
	getSenderCopy: (senderJid: string, type?: ViewOnceMediaType) => CachedSenderCopy | null
	downloadSenderCopy: (senderJid: string, type?: ViewOnceMediaType) => Promise<{ buffer: Buffer; type: ViewOnceMediaType; mimetype?: string; message: WAMessage } | null>
}

const MEDIA_FIELDS: { field: string; type: ViewOnceMediaType }[] = [
	{ field: 'imageMessage', type: 'image' },
	{ field: 'videoMessage', type: 'video' },
	{ field: 'ptvMessage', type: 'ptv' },
	{ field: 'audioMessage', type: 'audio' }
]

const pickMedia = (content: WAMessageContent | undefined | null): ViewOnceMediaInfo | null => {
	if (!content) return null
	for (const { field, type } of MEDIA_FIELDS) {
		const media = (content as Record<string, unknown>)[field] as ViewOnceMediaMessage | undefined
		if (media) return { type, media }
	}
	return null
}

const hasMediaKeys = (media: ViewOnceMediaMessage | undefined | null) =>
	!!(media && (('url' in media && media.url) || ('directPath' in media && media.directPath) || ('mediaKey' in media && media.mediaKey)))

export const getViewOnceMedia = (content: WAMessageContent | null | undefined): ViewOnceMediaInfo | null => {
	if (!content) return null
	const normalized = normalizeMessageContent(content)
	const info = pickMedia(normalized)
	if (!info) return null
	const flagged = (info.media as { viewOnce?: boolean | null }).viewOnce === true
	if (!isViewOnceMessage(content) && !flagged) return null
	return info
}

const downloadBuffer = async (sock: WASocket, message: WAMessage) =>
	downloadMediaMessage(message, 'buffer', {}, { logger: sock.logger, reuploadRequest: sock.updateMediaMessage })

export const downloadViewOnceMessage = async (sock: WASocket, message: WAMessage): Promise<Buffer | null> => {
	const info = getViewOnceMedia(message.message)
	if (!info || !hasMediaKeys(info.media)) return null
	try {
		const buffer = await downloadBuffer(sock, message)
		return buffer?.length ? buffer : null
	} catch {
		return null
	}
}

const senderOf = (message: WAMessage) => {
	const raw = message.key?.participant || message.key?.remoteJid || ''
	return raw.split(':')[0] || ''
}

interface CachedCopy {
	ts: number
	seq: number
	type: ViewOnceMediaType
	message: WAMessage
	buffer?: Buffer
}

interface PendingViewOnce {
	message: WAMessage
	info: ViewOnceMediaInfo
	sender: string
	expires: number
}

const MAX_COPIES_PER_SENDER = 10

const numericCore = (jid: string) => (jid || '').split('@')[0]?.split(':')[0]?.replace(/\D/g, '') || ''

export const handleViewOnce = (sock: WASocket, options: ViewOnceHandlerOptions): ViewOnceHandler => {
	const { onViewOnce, onError, senderCopyWindowMs = 300000, senderCopyWaitMs = 5000, senderCopyCacheMs = 86400000, includeOwn = false } = options
	const copies = new Map<string, CachedCopy[]>()
	const pending: PendingViewOnce[] = []
	let stopped = false
	let seqCounter = 0

	const pruneCopies = (sender: string) => {
		const list = copies.get(sender)
		if (!list) return
		const now = Date.now()
		const kept = list.filter(c => now - c.ts < senderCopyCacheMs)
		if (kept.length) copies.set(sender, kept)
		else copies.delete(sender)
	}

	const byNewest = (a: CachedCopy, b: CachedCopy) => (b.ts - a.ts) || (b.seq - a.seq)

	const findCopy = (sender: string, type: ViewOnceMediaType) => {
		pruneCopies(sender)
		const now = Date.now()
		const list = (copies.get(sender) || []).filter(c => now - c.ts < senderCopyWindowMs)
		const sorted = [...list].sort(byNewest)
		return sorted.find(c => c.type === type) || sorted[0] || null
	}

	const lookupCopy = (senderJid: string, type?: ViewOnceMediaType): CachedCopy | null => {
		const key = (senderJid || '').split(':')[0] || ''
		const candidates: CachedCopy[] = []
		const collect = (k: string) => {
			pruneCopies(k)
			candidates.push(...(copies.get(k) || []))
		}
		if (copies.has(key)) collect(key)
		if (!candidates.length) {
			const core = numericCore(senderJid)
			if (core) {
				for (const k of copies.keys()) {
					if (numericCore(k) === core) collect(k)
				}
			}
		}
		if (!candidates.length) return null
		const sorted = candidates.sort(byNewest)
		return (type ? sorted.find(c => c.type === type) : undefined) || sorted[0] || null
	}

	const deliver = async (message: WAMessage, info: ViewOnceMediaInfo, buffer: Buffer, via: ViewOnceResult['via']) => {
		const media = info.media as { mimetype?: string | null; caption?: string | null }
		await onViewOnce({
			key: message.key,
			chatJid: message.key?.remoteJid || '',
			sender: senderOf(message),
			type: info.type,
			buffer,
			mimetype: media.mimetype || undefined,
			caption: media.caption || undefined,
			message,
			via
		})
	}

	const trySenderCopy = async (item: PendingViewOnce) => {
		const copy = findCopy(item.sender, item.info.type)
		if (!copy) return false
		try {
			const buffer = copy.buffer?.length ? copy.buffer : await downloadBuffer(sock, copy.message)
			if (!buffer?.length) return false
			copy.buffer = buffer
			await deliver(item.message, item.info, buffer, 'sender-copy')
			return true
		} catch {
			return false
		}
	}

	const expirePending = () => {
		const now = Date.now()
		for (let i = pending.length - 1; i >= 0; i--) {
			const item = pending[i]
			if (item && item.expires <= now) {
				pending.splice(i, 1)
				onError?.(new Error('View-once media arrived without keys and no sender copy was found'), item.message)
			}
		}
	}

	const expiryTimer = setInterval(expirePending, 1000)

	const onUpsert = async ({ messages }: { messages: WAMessage[] }) => {
		if (stopped) return
		for (const message of messages) {
			try {
				if (!message.message) continue
				if (!includeOwn && message.key?.fromMe) continue
				const sender = senderOf(message)
				const info = getViewOnceMedia(message.message)

				if (!info) {
					const plain = pickMedia(normalizeMessageContent(message.message))
					if (plain && hasMediaKeys(plain.media)) {
						const list = copies.get(sender) || []
						list.push({ ts: Date.now(), seq: ++seqCounter, type: plain.type, message })
						while (list.length > MAX_COPIES_PER_SENDER) list.shift()
						copies.set(sender, list)
						for (let i = pending.length - 1; i >= 0; i--) {
							const item = pending[i]
							if (item && item.sender === sender) {
								if (await trySenderCopy(item)) pending.splice(i, 1)
							}
						}
					}
					continue
				}

				if (hasMediaKeys(info.media)) {
					const buffer = await downloadViewOnceMessage(sock, message)
					if (buffer) {
						await deliver(message, info, buffer, 'direct')
						continue
					}
				}

				const item: PendingViewOnce = { message, info, sender, expires: Date.now() + senderCopyWaitMs }
				if (!(await trySenderCopy(item))) {
					pending.push(item)
				}
			} catch (err) {
				onError?.(err instanceof Error ? err : new Error(String(err)), message)
			}
		}
	}

	sock.ev.on('messages.upsert', onUpsert)

	return {
		stop: () => {
			stopped = true
			clearInterval(expiryTimer)
			try { sock.ev.off('messages.upsert', onUpsert) } catch {}
			pending.length = 0
			copies.clear()
		},
		getSenderCopy: (senderJid, type) => {
			const copy = lookupCopy(senderJid, type)
			if (!copy) return null
			return { message: copy.message, type: copy.type, ts: copy.ts, buffer: copy.buffer }
		},
		downloadSenderCopy: async (senderJid, type) => {
			const copy = lookupCopy(senderJid, type)
			if (!copy) return null
			try {
				const buffer = copy.buffer?.length ? copy.buffer : await downloadBuffer(sock, copy.message)
				if (!buffer?.length) return null
				copy.buffer = buffer
				const media = pickMedia(normalizeMessageContent(copy.message.message))?.media as { mimetype?: string | null } | undefined
				return { buffer, type: copy.type, mimetype: media?.mimetype || undefined, message: copy.message }
			} catch {
				return null
			}
		}
	}
}
