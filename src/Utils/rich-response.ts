import type { proto } from '../../WAProto/index.js'

export type MarkdownTableOptions = {
	title?: string
}

const splitRow = (line: string) => {
	let value = line.trim()
	if (value.startsWith('|')) value = value.slice(1)
	if (value.endsWith('|') && !value.endsWith('\\|')) value = value.slice(0, -1)

	const cells: string[] = []
	let cell = ''
	let escaped = false
	for (const character of value) {
		if (escaped) {
			cell += character
			escaped = false
		} else if (character === '\\') {
			escaped = true
		} else if (character === '|') {
			cells.push(cell.trim())
			cell = ''
		} else {
			cell += character
		}
	}
	if (escaped) cell += '\\'
	cells.push(cell.trim())
	return cells
}

const isSeparatorRow = (line: string) => {
	const cells = splitRow(line)
	return cells.length > 0 && cells.every(cell => /^:?-{3,}:?$/.test(cell))
}

export const parseMarkdownTables = (
	markdown: string,
	options: MarkdownTableOptions = {}
): proto.IAIRichResponseSubMessage[] => {
	if (typeof markdown !== 'string' || !markdown.trim()) {
		throw new TypeError('markdown must be a non-empty string')
	}

	const lines = markdown.replace(/\r\n?/g, '\n').split('\n')
	const submessages: proto.IAIRichResponseSubMessage[] = []
	let prose: string[] = []
	let tableCount = 0

	const flushProse = () => {
		const messageText = prose.join('\n').trim()
		if (messageText) submessages.push({ messageType: 2, messageText })
		prose = []
	}

	for (let index = 0; index < lines.length; ) {
		const header = lines[index]!
		const separator = lines[index + 1]
		if (header.includes('|') && separator !== undefined && isSeparatorRow(separator)) {
			flushProse()
			const rows: Array<{ items: string[]; isHeading: boolean }> = [
				{ items: splitRow(header), isHeading: true }
			]
			index += 2
			while (index < lines.length && lines[index]!.includes('|') && lines[index]!.trim()) {
				rows.push({ items: splitRow(lines[index]!), isHeading: false })
				index += 1
			}

			const width = rows[0]!.items.length
			if (width < 2 || rows.some(row => row.items.length !== width)) {
				throw new Error('Markdown table rows must contain the same number of columns')
			}

			submessages.push({
				messageType: 4,
				tableMetadata: {
					title: tableCount === 0 ? options.title : undefined,
					rows
				}
			})
			tableCount += 1
			continue
		}

		prose.push(header)
		index += 1
	}

	flushProse()
	return submessages
}

export const markdownToAIRichResponse = (
	markdown: string,
	options: MarkdownTableOptions = {}
): proto.IAIRichResponseMessage => ({
	messageType: 1,
	submessages: parseMarkdownTables(markdown, options),
	contextInfo: {
		forwardingScore: 1,
		isForwarded: true,
		forwardedAiBotMessageInfo: { botJid: '867051314767696@bot' },
		forwardOrigin: 4
	}
})
