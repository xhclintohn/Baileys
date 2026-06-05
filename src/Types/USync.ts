import type { BinaryNode } from '../WABinary'
import { USyncUser } from '../WAUSync'

export interface USyncQueryProtocol {
	name: string
	getQueryElement: () => BinaryNode
	getUserElement: (user: USyncUser) => BinaryNode | null

	parser: (data: BinaryNode) => unknown
}
