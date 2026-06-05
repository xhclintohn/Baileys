import type { proto } from '../../WAProto/index.js'
import type { AccountSettings } from './Auth'
import type { QuickReplyAction } from './Bussines.js'
import type { BufferedEventData } from './Events'
import type { LabelActionBody } from './Label'
import type { ChatLabelAssociationActionBody } from './LabelAssociation'
import type { MessageLabelAssociationActionBody } from './LabelAssociation'
import type { MinimalMessage, WAMessageKey } from './Message'

export type WAPrivacyValue = 'all' | 'contacts' | 'contact_blacklist' | 'none'

export type WAPrivacyOnlineValue = 'all' | 'match_last_seen'

export type WAPrivacyGroupAddValue = 'all' | 'contacts' | 'contact_blacklist'

export type WAReadReceiptsValue = 'all' | 'none'

export type WAPrivacyCallValue = 'all' | 'known'

export type WAPrivacyMessagesValue = 'all' | 'contacts'

export type WAPresence = 'unavailable' | 'available' | 'composing' | 'recording' | 'paused'

export const ALL_WA_PATCH_NAMES = [
	'critical_block',
	'critical_unblock_low',
	'regular_high',
	'regular_low',
	'regular'
] as const

export type WAPatchName = (typeof ALL_WA_PATCH_NAMES)[number]

export interface PresenceData {
	lastKnownPresence: WAPresence
	lastSeen?: number
}

export type BotListInfo = {
	jid: string
	personaId: string
}

export type ChatMutation = {
	syncAction: proto.ISyncActionData
	index: string[]
}

export type WAPatchCreate = {
	syncAction: proto.ISyncActionValue
	index: string[]
	type: WAPatchName
	apiVersion: number
	operation: proto.SyncdMutation.SyncdOperation
}

export type Chat = proto.IConversation & {
	lastMessageRecvTimestamp?: number
}

export type ChatUpdate = Partial<
	Chat & {
		conditional: (bufferedData: BufferedEventData) => boolean | undefined
		timestamp?: number
	}
>

export type LastMessageList = MinimalMessage[] | proto.SyncActionValue.ISyncActionMessageRange

export type ChatModification =
	| {
			archive: boolean
			lastMessages: LastMessageList
	  }
	| { pushNameSetting: string }
	| { pin: boolean }
	| {
			mute: number | null
	  }
	| {
			clear: boolean
			lastMessages: LastMessageList
	  }
	| {
			deleteForMe: { deleteMedia: boolean; key: WAMessageKey; timestamp: number }
	  }
	| {
			star: {
				messages: { id: string; fromMe?: boolean }[]
				star: boolean
			}
	  }
	| {
			markRead: boolean
			lastMessages: LastMessageList
	  }
	| { delete: true; lastMessages: LastMessageList }
	| { contact: proto.SyncActionValue.IContactAction | null }
	| { disableLinkPreviews: proto.SyncActionValue.IPrivacySettingDisableLinkPreviewsAction }
	| { addLabel: LabelActionBody }
	| { addChatLabel: ChatLabelAssociationActionBody }
	| { removeChatLabel: ChatLabelAssociationActionBody }
	| { addMessageLabel: MessageLabelAssociationActionBody }
	| { removeMessageLabel: MessageLabelAssociationActionBody }
	| { quickReply: QuickReplyAction }

export type InitialReceivedChatsState = {
	[jid: string]: {
		lastMsgRecvTimestamp?: number
		lastMsgTimestamp: number
	}
}

export type InitialAppStateSyncOptions = {
	accountSettings: AccountSettings
}
