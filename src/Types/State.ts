import type { Boom } from '@hapi/boom'
import type { Contact } from './Contact'

export type WAConnectionState = 'open' | 'connecting' | 'close'

export type ConnectionState = {
	/** connection is now open, connecting or closed */
	connection: WAConnectionState

	/** the error that caused the connection to close */
	lastDisconnect?: {
		// TODO: refactor and gain independence from Boom
		error: Boom | Error | undefined
		date: Date
	}
	/** is this a new login */
	isNewLogin?: boolean
	/** the current QR code */
	qr?: string
	/** has the device received all pending notifications while it was offline */
	receivedPendingNotifications?: boolean
	/** status of offline drain: complete when fully processed, degraded on timeout */
	offlineDrainStatus?: 'complete' | 'degraded'
	/** legacy connection options */
	legacy?: {
		phoneConnected: boolean
		user?: Contact
	}
	/**
	 * if the client is shown as an active, online client.
	 * If this is false, the primary phone and other devices will receive notifs
	 * */
	isOnline?: boolean

	/**
	 * When you are in this state, WhatsApp prevents outgoing messages and calls.
	 */
	reachoutTimeLock?: ReachoutTimelockState
}

export type ReachoutTimelockState = {
	enforced: boolean
	type?: ReachoutTimelockEnforcementType
	until?: number
}

export enum ReachoutTimelockEnforcementType {
	UNKNOWN = 0,
	ACCOUNT_RESTRICTION = 1,
	SPAM = 2
}

export type NewChatMessageCapInfo = {
	maxMessages?: number
	windowSeconds?: number
}
