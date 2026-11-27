import { existsSync, mkdirSync, readFileSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import pino from 'pino'
import { makeCacheableSignalKeyStore } from './auth-utils'
import { Browsers } from './browser-utils'
import { delay } from './generics'
import { useMultiFileAuthState } from './use-multi-file-auth-state'
import type { WASocket } from '../index'

export interface PairingResult {
	sessionId: string
	userJid: string
	number: string
}

export interface PairingOptions {
	authDir?: string
	timeoutMs?: number
	browser?: [string, string, string]
	newsletterJid?: string
	onCode?: (code: string) => void | Promise<void>
	onConnected?: (result: PairingResult) => void | Promise<void>
	onError?: (error: Error) => void | Promise<void>
}

const activePairs = new Set<string>()

const makeid = (len = 8) => {
	let result = ''
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
	for (let i = 0; i < len; i++) {
		result += chars.charAt(Math.floor(Math.random() * chars.length))
	}
	return result
}

export const buildSessionId = (authDir: string): string | null => {
	try {
		const credsPath = join(authDir, 'creds.json')
		if (!existsSync(credsPath)) return null
		const data = readFileSync(credsPath)
		if (!data || data.length <= 100) return null
		const parsed = JSON.parse(data.toString('utf8'))
		if (!parsed || !(parsed.me || parsed.signedIdentityKey || parsed.noiseKey || parsed.signedPreKey)) return null
		return Buffer.from(data).toString('base64')
	} catch {
		return null
	}
}

export const isPairingActive = (number: string) => activePairs.has(number)

export const startPairing = async (number: string, options: PairingOptions = {}) => {
	const { onCode, onConnected, onError, timeoutMs = 420000, newsletterJid } = options
	if (activePairs.has(number)) {
		onError?.(new Error('A pairing for this number is already in progress. Wait for it to finish.'))
		return
	}
	activePairs.add(number)

	const authDir = options.authDir || join(tmpdir(), 'toxic-pair-' + makeid(8))
	const ownsAuthDir = !options.authDir
	let sock: WASocket | null = null
	let finished = false
	let pairingRequested = false
	let pairingCode: string | null = null
	let codeSent = false
	let reconnectAttempts = 0

	const cleanup = () => {
		try { clearTimeout(globalTimeout) } catch {}
		try { sock?.ev.removeAllListeners('connection.update') } catch {}
		try { sock?.ev.removeAllListeners('creds.update') } catch {}
		try { sock?.ws.close() } catch {}
		if (ownsAuthDir) {
			try { rmSync(authDir, { recursive: true, force: true }) } catch {}
		}
		activePairs.delete(number)
	}

	const fail = (err: unknown) => {
		if (finished) return
		finished = true
		cleanup()
		onError?.(err instanceof Error ? err : new Error(String(err)))
	}

	const globalTimeout = setTimeout(() => fail(new Error('Pairing timed out. Please try again.')), timeoutMs)

	const startSocket = async (): Promise<void> => {
		if (finished) return
		try {
			mkdirSync(authDir, { recursive: true })
			const { state, saveCreds } = await useMultiFileAuthState(authDir)
			const { default: makeWASocket } = await import('../Socket/index.js')

			if (sock?.ev) {
				try { sock.ev.removeAllListeners('connection.update') } catch {}
				try { sock.ev.removeAllListeners('creds.update') } catch {}
			}
			if (sock?.ws) {
				try { sock.ws.close() } catch {}
			}

			sock = makeWASocket({
				auth: {
					creds: state.creds,
					keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
				},
				logger: pino({ level: 'silent' }),
				browser: options.browser || Browsers.android('Chrome'),
				syncFullHistory: false,
				markOnlineOnConnect: false,
				connectTimeoutMs: 60000,
				keepAliveIntervalMs: 10000,
				retryRequestDelayMs: 2000,
				shouldIgnoreJid: jid => !!jid?.endsWith('@g.us'),
				getMessage: async () => undefined
			})

			sock.ev.on('creds.update', saveCreds)

			sock.ev.on('connection.update', async update => {
				try {
					const { connection, lastDisconnect, qr } = update
					if (finished || !sock) return

					if (qr && !state.creds.registered && !pairingRequested) {
						pairingRequested = true
						try {
							const checkResult = await Promise.race([
								sock.onWhatsApp(number).catch(() => []),
								delay(1500).then(() => null)
							])
							const check = Array.isArray(checkResult) ? checkResult[0] : null
							if (check && check.exists === false) {
								return fail(new Error('That number is not on WhatsApp.'))
							}
							if (finished) return
							const code = pairingCode
								? await sock.requestPairingCode(number, pairingCode)
								: await sock.requestPairingCode(number)
							pairingCode = code
							try { await saveCreds() } catch {}
							if (!codeSent) {
								codeSent = true
								onCode?.(code)
							}
						} catch {
							pairingRequested = false
							return fail(new Error('Failed to generate pairing code.'))
						}
					}

					if (connection === 'open') {
						finished = true
						if (newsletterJid) {
							try { await sock.newsletterFollow(newsletterJid) } catch {}
						}
						await delay(3000)
						try { await saveCreds() } catch {}
						let sessionId: string | null = null
						for (let attempt = 0; attempt < 10 && !sessionId; attempt++) {
							sessionId = buildSessionId(authDir)
							if (!sessionId) await delay(2000)
						}
						const rawId = sock.user?.id
						const userJid = rawId ? rawId.split(':')[0] + '@s.whatsapp.net' : number + '@s.whatsapp.net'
						cleanup()
						if (!sessionId) {
							return onError?.(new Error('Paired, but the session ID could not be read. Please try again.'))
						}
						return onConnected?.({ sessionId, userJid, number })
					}

					if (connection === 'close') {
						if (finished) return
						const statusCode = (lastDisconnect?.error as { output?: { statusCode?: number }; statusCode?: number } | undefined)?.output?.statusCode
							|| (lastDisconnect?.error as { statusCode?: number } | undefined)?.statusCode
						if (statusCode === 401) return fail(new Error('Logged out. Please try again.'))
						reconnectAttempts++
						if (reconnectAttempts > 6) return fail(new Error('Connection lost. Please try again.'))
						const wait = statusCode === 515 ? 1000 : Math.min(3000 * Math.pow(1.5, reconnectAttempts - 1), 15000)
						await delay(wait)
						if (finished) return
						try { await saveCreds() } catch {}
						if (!state.creds.registered) pairingRequested = false
						return startSocket()
					}
				} catch (err) {
					fail(err)
				}
			})
		} catch (err) {
			fail(err)
		}
	}

	await startSocket()
}
