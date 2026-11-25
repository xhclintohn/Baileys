import { Boom } from '@hapi/boom'
import crypto from 'crypto'
import { proto } from '../../WAProto/index.js'
import type {
	PaymentBackground,
	PaymentInviteOptions,
	PaymentResult,
	RequestPaymentOptions,
	SendPaymentOptions
} from '../Types/index.js'
import type { WAMessageKey } from '../Types/index.js'
import { generateWAMessageFromContent, unixTimestampSeconds } from '../Utils/index.js'

export type PaymentDeps = {
	relayMessage: (jid: string, message: proto.IMessage, opts: { messageId: string }) => Promise<unknown>
	userJid?: string
	meJid?: string
}

const CURRENCY_DECIMALS: Record<string, number> = {
	JPY: 0,
	KRW: 0,
	VND: 0,
	CLP: 0,
	ISK: 0,
	UGX: 0,
	XAF: 0,
	XOF: 0,
	BHD: 3,
	IQD: 3,
	JOD: 3,
	KWD: 3,
	LYD: 3,
	OMR: 3,
	TND: 3
}

const decimalsFor = (currency: string) => CURRENCY_DECIMALS[currency.toUpperCase()] ?? 2

const PAYMENT_REQUEST_TTL_MS = 7 * 24 * 60 * 60 * 1000

const toUnixSeconds = (value: Date | number | undefined, fallbackMs: number) => {
	if (value instanceof Date) return Math.floor(value.getTime() / 1000)
	if (typeof value === 'number') return Math.floor(value / 1000)
	return Math.floor(fallbackMs / 1000)
}

const defaultBackground = (background?: PaymentBackground) =>
	background ?? { id: 'DEFAULT', placeholderArgb: 0xfff0f0f0 }

const send = async (jid: string, content: proto.IMessage, deps: PaymentDeps): Promise<PaymentResult> => {
	const messageSecret = crypto.randomBytes(32)
	const wrapped = generateWAMessageFromContent(jid, { messageContextInfo: { messageSecret }, ...content }, {
		userJid: deps.userJid
	} as any)
	await deps.relayMessage(jid, wrapped.message!, { messageId: wrapped.key.id! })
	return { message: wrapped }
}

export const requestPayment = async (
	jid: string,
	options: RequestPaymentOptions,
	deps: PaymentDeps
): Promise<PaymentResult> => {
	if (!options.amount || options.amount <= 0) {
		throw new Boom('payment request needs an amount greater than 0', { statusCode: 400 })
	}

	if (!options.currency) {
		throw new Boom('payment request needs a currency code', { statusCode: 400 })
	}

	const decimals = decimalsFor(options.currency)
	const currencyCode = options.currency.toUpperCase()
	const noteMessage = options.note ? { extendedTextMessage: { text: options.note } } : undefined

	return send(
		jid,
		{
			requestPaymentMessage: {
				currencyCodeIso4217: currencyCode,
				amount1000: Math.round(options.amount * 1000),
				requestFrom: options.from || deps.meJid || deps.userJid || '',
				expiryTimestamp: toUnixSeconds(options.expiry, Date.now() + PAYMENT_REQUEST_TTL_MS),
				amount: {
					value: Math.round(options.amount * 10 ** decimals),
					offset: decimals,
					currencyCode
				},
				noteMessage,
				background: defaultBackground(options.background)
			}
		},
		deps
	)
}

export const sendPayment = async (
	jid: string,
	options: SendPaymentOptions,
	deps: PaymentDeps
): Promise<PaymentResult> => {
	if (!options.requestMessageKey?.id) {
		throw new Boom('sendPayment needs the key of the payment request', { statusCode: 400 })
	}

	return send(
		jid,
		{
			sendPaymentMessage: {
				requestMessageKey: options.requestMessageKey,
				noteMessage: options.note ? { extendedTextMessage: { text: options.note } } : undefined,
				background: defaultBackground(options.background),
				transactionData: options.transactionData
			}
		},
		deps
	)
}

export const declinePaymentRequest = async (
	jid: string,
	requestMessageKey: WAMessageKey,
	deps: PaymentDeps
): Promise<PaymentResult> => {
	if (!requestMessageKey?.id) {
		throw new Boom('declinePaymentRequest needs the key of the payment request', { statusCode: 400 })
	}

	return send(jid, { declinePaymentRequestMessage: { key: requestMessageKey } }, deps)
}

export const cancelPaymentRequest = async (
	jid: string,
	requestMessageKey: WAMessageKey,
	deps: PaymentDeps
): Promise<PaymentResult> => {
	if (!requestMessageKey?.id) {
		throw new Boom('cancelPaymentRequest needs the key of the payment request', { statusCode: 400 })
	}

	return send(jid, { cancelPaymentRequestMessage: { key: requestMessageKey } }, deps)
}

export const sendPaymentInvite = async (
	jid: string,
	options: PaymentInviteOptions = {},
	deps: PaymentDeps
): Promise<PaymentResult> => {
	return send(
		jid,
		{
			paymentInviteMessage: {
				serviceType: options.serviceType ?? 3,
				expiryTimestamp: options.expiry
					? toUnixSeconds(options.expiry, 0)
					: unixTimestampSeconds() + Math.floor(PAYMENT_REQUEST_TTL_MS / 1000)
			}
		},
		deps
	)
}
