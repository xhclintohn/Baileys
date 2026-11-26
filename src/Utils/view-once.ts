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
	includeOwn?: boolean
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
	type: ViewOnceMediaType
	message: WAMessage
}

interface PendingViewOnce {
	message: WAMessage
	info: ViewOnceMediaInfo
	sender: string
	expires: number
}

export const handleViewOnce = (sock: WASocket, options: ViewOnceHandlerOptions) => {
	const { onViewOnce, onError, senderCopyWindowMs = 300000, senderCopyWaitMs = 5000, includeOwn = false } = options
	const copies = new Map<string, CachedCopy[]>()
	const pending: PendingViewOnce[] = []
	let stopped = false

	const pruneCopies = (sender: string) => {
		const list = copies.get(sender)
		if (!list) return
		const now = Date.now()
		const kept = list.filter(c => now - c.ts < senderCopyWindowMs)
		if (kept.length) copies.set(sender, kept)
		else copies.delete(sender)
	}

	const findCopy = (sender: string, type: ViewOnceMediaType) => {
		pruneCopies(sender)
		const list = copies.get(sender) || []
		const sorted = [...list].sort((a, b) => b.ts - a.ts)
		return sorted.find(c => c.type === type) || sorted[0] || null
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
			const buffer = await downloadBuffer(sock, copy.message)
			if (!buffer?.length) return false
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
						list.push({ ts: Date.now(), type: plain.type, message })
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
		}
	}
}
