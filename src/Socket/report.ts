import { randomBytes } from 'crypto'
import { proto } from '../../WAProto/index.js'
import type { WAMessage } from '../Types'
import {
	SPAM_FLOWS,
	type SpamReportOptions,
	type SpamReportResult,
	type SpamReportTargetResult
} from '../Types/Report'
import { extractReportingTokenContentForMessage } from '../Utils/reporting-utils'
import { getBinaryNodeChild, isJidGroup, S_WHATSAPP_NET, type BinaryNode } from '../WABinary'

export type ReportDeps = {
	query: (node: BinaryNode) => Promise<BinaryNode>
	meJid?: string
	updateBlockStatus?: (jid: string, action: 'block' | 'unblock') => Promise<void>
}

const TRACE_ID_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

const generateTraceId = () => {
	const bytes = randomBytes(24)
	let id = ''
	for (const byte of bytes) {
		id += TRACE_ID_ALPHABET[byte % TRACE_ID_ALPHABET.length]
	}

	return id
}

const mediaTypeOf = (message: proto.IMessage | null | undefined) => {
	if (!message) {
		return undefined
	}

	if (message.videoMessage?.gifPlayback) {
		return 'gif'
	}

	if (message.imageMessage) {
		return 'image'
	}

	if (message.videoMessage) {
		return 'video'
	}

	if (message.audioMessage) {
		return 'audio'
	}

	return undefined
}

const messageTimestamp = (message: WAMessage) => {
	const ts = message.messageTimestamp
	if (!ts) {
		return '0'
	}

	return typeof ts === 'number' ? String(ts) : ts.toString()
}

const resolveSpamFlow = (options: SpamReportOptions, fallback: SpamReportOptions['spamFlow']) =>
	options.spamFlow ?? options.flow ?? fallback

const buildSpamMessageNode = (message: WAMessage, meJid?: string): BinaryNode => {
	const senderJid =
		message.key.participantAlt ?? message.key.participant ?? (message.key.fromMe ? meJid : message.key.remoteJid)
	const isGroup = !!message.key.remoteJid && isJidGroup(message.key.remoteJid)
	const messageAttrs: BinaryNode['attrs'] = {
		id: message.key.id || '',
		t: messageTimestamp(message)
	}
	if (senderJid) {
		if (isGroup) {
			messageAttrs.from = message.key.remoteJid!
			messageAttrs.participant = senderJid
		} else {
			messageAttrs.from = senderJid
		}
	}

	const messageContent: BinaryNode[] = []
	if (message.message) {
		const raw = extractReportingTokenContentForMessage(
			Buffer.from(proto.Message.encode(message.message).finish())
		)
		if (raw && raw.length > 0) {
			const mediatype = mediaTypeOf(message.message)
			messageContent.push({
				tag: 'raw',
				attrs: { v: '3', ...(mediatype ? { mediatype } : {}) },
				content: raw
			})
		}
	}

	return {
		tag: 'message',
		attrs: messageAttrs,
		content: messageContent
	}
}

export const buildSpamReportNode = (message: WAMessage, options: SpamReportOptions, meJid?: string): BinaryNode => {
	const spamListAttrs: BinaryNode['attrs'] = {
		spam_flow: resolveSpamFlow(options, SPAM_FLOWS.CHAT)!,
		wi_trace_id: options.traceId ?? generateTraceId()
	}
	if (options.groupJid) {
		spamListAttrs.jid = options.groupJid
	}

	if (options.source) {
		spamListAttrs.source = options.source
	}

	if (options.groupSubject) {
		spamListAttrs.subject = options.groupSubject
	}

	return {
		tag: 'iq',
		attrs: {
			xmlns: 'spam',
			to: S_WHATSAPP_NET,
			type: 'set'
		},
		content: [
			{
				tag: 'spam_list',
				attrs: spamListAttrs,
				content: [buildSpamMessageNode(message, meJid)]
			}
		]
	}
}

export const buildTargetReportNode = (jid: string, options: SpamReportOptions = {}, meJid?: string): BinaryNode => {
	const spamListAttrs: BinaryNode['attrs'] = {
		spam_flow: resolveSpamFlow(options, SPAM_FLOWS.OVERFLOW_MENU)!,
		wi_trace_id: options.traceId ?? generateTraceId(),
		jid
	}
	if (options.source) {
		spamListAttrs.source = options.source
	}

	if (options.groupSubject) {
		spamListAttrs.subject = options.groupSubject
	}

	return {
		tag: 'iq',
		attrs: {
			xmlns: 'spam',
			to: S_WHATSAPP_NET,
			type: 'set'
		},
		content: [
			{
				tag: 'spam_list',
				attrs: spamListAttrs,
				content: (options.messages ?? []).map(message => buildSpamMessageNode(message, meJid))
			}
		]
	}
}

const parseReportId = (result: BinaryNode): string | null => {
	const report = getBinaryNodeChild(result, 'report')
	if (report) {
		if (report.attrs.id) {
			return report.attrs.id
		}

		if (typeof report.content === 'string' && report.content) {
			return report.content
		}
	}

	const node = getBinaryNodeChild(result, 'report_id')
	if (!node?.content) {
		return null
	}

	return typeof node.content === 'string' ? node.content : node.content.toString()
}

export const reportSpam = async (
	messages: WAMessage[],
	deps: ReportDeps,
	options: SpamReportOptions = {}
): Promise<SpamReportResult[]> => {
	const results: SpamReportResult[] = []
	for (const message of messages) {
		const node = buildSpamReportNode(message, options, deps.meJid)
		const result = await deps.query(node)
		results.push({ reportId: parseReportId(result), messageId: message.key.id || '' })
	}

	return results
}

export const reportTarget = async (
	jid: string,
	deps: ReportDeps,
	options: SpamReportOptions = {}
): Promise<SpamReportTargetResult> => {
	const node = buildTargetReportNode(jid, options, deps.meJid)
	const result = await deps.query(node)
	return {
		jid,
		flow: resolveSpamFlow(options, SPAM_FLOWS.OVERFLOW_MENU)!,
		reported: true,
		reportId: parseReportId(result),
		node
	}
}

export const reportContact = async (
	jid: string,
	messages: WAMessage[],
	deps: ReportDeps,
	options: SpamReportOptions = {}
) => {
	void jid
	return reportSpam(messages, deps, { spamFlow: SPAM_FLOWS.CHAT, ...options })
}

export const reportGroup = async (
	jid: string,
	messages: WAMessage[],
	deps: ReportDeps,
	options: SpamReportOptions = {}
) => reportSpam(messages, deps, { spamFlow: SPAM_FLOWS.GROUP_INFO, groupJid: jid, ...options })

export const reportStatus = async (
	jid: string,
	messages: WAMessage[],
	deps: ReportDeps,
	options: SpamReportOptions = {}
) => {
	void jid
	return reportSpam(messages, deps, { spamFlow: SPAM_FLOWS.STATUS_POST, ...options })
}

export const reportNewsletter = async (
	jid: string,
	messages: WAMessage[],
	deps: ReportDeps,
	options: SpamReportOptions = {}
) => {
	void jid
	return reportSpam(messages, deps, { spamFlow: SPAM_FLOWS.NEWSLETTER_INFO, ...options })
}

export const reportChannelStatus = async (
	jid: string,
	messages: WAMessage[],
	deps: ReportDeps,
	options: SpamReportOptions = {}
) => {
	void jid
	return reportSpam(messages, deps, { spamFlow: SPAM_FLOWS.CHANNEL_STATUS, ...options })
}

export const reportEvent = async (
	jid: string,
	messages: WAMessage[],
	deps: ReportDeps,
	options: SpamReportOptions = {}
) => {
	void jid
	return reportSpam(messages, deps, { spamFlow: SPAM_FLOWS.EVENT_INFO, ...options })
}

export const reportAndBlock = async (
	jid: string,
	messages: WAMessage[],
	deps: ReportDeps,
	options: SpamReportOptions = {}
) => {
	if (!deps.updateBlockStatus) {
		throw new Error('reportAndBlock needs updateBlockStatus')
	}

	const results = await reportContact(jid, messages, deps, options)
	await deps.updateBlockStatus(jid, 'block')
	return results
}
