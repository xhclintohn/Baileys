import type { WAMessage, WAMessageKey } from './Message.js'

export type PaymentBackground = {
	id?: string
	placeholderArgb?: number
	textArgb?: number
	subtextArgb?: number
}

export type RequestPaymentOptions = {
	amount: number
	currency: string
	note?: string
	expiry?: Date | number
	background?: PaymentBackground
	from?: string
}

export type SendPaymentOptions = {
	requestMessageKey: WAMessageKey
	note?: string
	transactionData?: string
	background?: PaymentBackground
}

export type PaymentInviteOptions = {
	serviceType?: 1 | 2 | 3
	expiry?: Date | number
}

export type PaymentResult = {
	message: WAMessage
}
