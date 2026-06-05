import type { BinaryNode } from '../WABinary'

export function buildAckStanza(node: BinaryNode, errorCode?: number, meId?: string): BinaryNode {
	const { tag, attrs } = node
	const stanza: BinaryNode = {
		tag: 'ack',
		attrs: {
			id: attrs.id!,
			to: attrs.from!,
			class: tag
		}
	}

	if (errorCode) {
		stanza.attrs.error = errorCode.toString()
	}

	if (attrs.participant) {
		stanza.attrs.participant = attrs.participant
	}

	if (attrs.recipient) {
		stanza.attrs.recipient = attrs.recipient
	}

	if (attrs.type) {
		stanza.attrs.type = attrs.type
	}

	if (tag === 'message' && meId) {
		stanza.attrs.from = meId
	}

	return stanza
}
