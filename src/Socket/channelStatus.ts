import { proto } from '../../WAProto/index.js'
import type { ChannelStatus } from '../Types/ChannelStatus.js'
import type { AnyMessageContent } from '../Types/index.js'
import type { MediaGenerationOptions, WAMediaUploadFunction } from '../Types/Message.js'
import { generateMessageIDV2 } from '../Utils/generics.js'
import { generateWAMessageContent } from '../Utils/index.js'
import { type BinaryNode, getBinaryNodeChild } from '../WABinary/index.js'

export type ChannelStatusOptions = Pick<MediaGenerationOptions, 'backgroundColor' | 'font'>

export type ChannelStatusDeps = {
	sendNode: (node: BinaryNode) => Promise<unknown>
	waUploadToServer: WAMediaUploadFunction
	userJid?: string
}

export type ChannelStatusSent = {
	id: string
	channelJid: string
	message: proto.IMessage
}

export const decodeChannelStatus = (node: BinaryNode): ChannelStatus | undefined => {
	const from = node.attrs.from
	if (!from?.endsWith('@newsletter')) {
		return undefined
	}

	const plaintextNode = getBinaryNodeChild(node, 'plaintext')
	if (!plaintextNode?.content) {
		return undefined
	}

	const contentBuf =
		typeof plaintextNode.content === 'string'
			? Buffer.from(plaintextNode.content, 'binary')
			: Buffer.from(plaintextNode.content as Uint8Array)

	let message: proto.IMessage
	try {
		message = proto.Message.decode(contentBuf)
	} catch {
		return undefined
	}

	const extendedText = message.extendedTextMessage

	return {
		id: node.attrs.id || '',
		channelJid: from,
		type: node.attrs.type || 'text',
		serverId: node.attrs.server_id,
		messageTimestamp: +(node.attrs.t || 0),
		offline: !!node.attrs.offline,
		text: extendedText?.text || message.conversation || undefined,
		backgroundArgb: extendedText?.backgroundArgb ?? undefined,
		font: extendedText?.font ?? undefined,
		message
	}
}

export const sendChannelStatus = async (
	jid: string,
	content: AnyMessageContent,
	deps: ChannelStatusDeps,
	options: ChannelStatusOptions = {}
): Promise<ChannelStatusSent> => {
	const { sendNode, waUploadToServer, userJid } = deps

	const inner = await generateWAMessageContent(content, { ...options, upload: waUploadToServer })

	const id = generateMessageIDV2(userJid)
	const bytes = proto.Message.encode(inner).finish()

	await sendNode({
		tag: 'status',
		attrs: {
			to: jid,
			id,
			type: 'text'
		},
		content: [{ tag: 'plaintext', attrs: {}, content: bytes }]
	})

	return { id, channelJid: jid, message: inner }
}
