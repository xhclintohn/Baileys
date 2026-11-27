import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'
import { mkdir, readdir, readFile, stat } from 'fs/promises'
import { dirname, join } from 'path'
import { proto } from '../../WAProto/index.js'
import type { AuthenticationCreds, AuthenticationState, SignalDataTypeMap } from '../Types'
import type { ILogger } from './logger'
import { initAuthCreds } from './auth-utils'

export type SqliteAuthStateOptions = {
	fileName?: string
	migrateFromFolder?: string
	logger?: ILogger
	maxPreKeys?: number
	compactThresholdBytes?: number
	encryptionKey?: string | Buffer
}

const normalizeEncryptionKey = (encryptionKey?: string | Buffer): Buffer | undefined => {
	if (encryptionKey === undefined || encryptionKey === null) {
		return undefined
	}

	if (Buffer.isBuffer(encryptionKey)) {
		if (encryptionKey.length !== 32) {
			throw new Error('encryptionKey Buffer must be exactly 32 bytes for AES-256-GCM')
		}

		return encryptionKey
	}

	if (typeof encryptionKey === 'string') {
		const trimmed = encryptionKey.trim()
		if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
			return Buffer.from(trimmed, 'hex')
		}

		return scryptSync(trimmed, 'toxic-baileys-sqlite-auth', 32)
	}

	throw new Error('encryptionKey must be a 32-byte Buffer or a passphrase string')
}

export const useSqliteAuthState = async (
	pathOrFolder: string,
	options: SqliteAuthStateOptions = {}
): Promise<{
	state: AuthenticationState
	saveCreds: () => Promise<void>
	db: any
	close: () => void
	compact: () => void
	prunePreKeys: () => number
}> => {
	const {
		fileName = 'auth.db',
		migrateFromFolder,
		logger,
		maxPreKeys = 100,
		compactThresholdBytes = 3 * 1024 * 1024,
		encryptionKey
	} = options
	const dbPath = /\.(db|sqlite|sqlite3)$/i.test(pathOrFolder) ? pathOrFolder : join(pathOrFolder, fileName)
	const masterKey = normalizeEncryptionKey(encryptionKey)

	const bufReplacer = (_: string, value: any) => {
		if (Buffer.isBuffer(value) || value instanceof Uint8Array || value?.type === 'Buffer') {
			return {
				type: 'Buffer',
				data: Buffer.from(value?.data || value).toString('base64')
			}
		}

		return value
	}

	const bufReviver = (_: string, value: any) => {
		if (value && typeof value === 'object' && value.type === 'Buffer' && typeof value.data === 'string') {
			return Buffer.from(value.data, 'base64')
		}

		return value
	}

	const encodePlain = (value: any) => {
		if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
			return Buffer.concat([Buffer.from([1]), Buffer.from(value)])
		}

		return Buffer.concat([Buffer.from([0]), Buffer.from(JSON.stringify(value, bufReplacer), 'utf8')])
	}

	const decodePlain = (blob: Buffer) => {
		if (blob[0] === 1) return Buffer.from(blob.subarray(1))
		return JSON.parse(Buffer.from(blob.subarray(1)).toString('utf8'), bufReviver)
	}

	const encode = (value: any) => {
		const plain = encodePlain(value)
		if (!masterKey) {
			return plain
		}

		const iv = randomBytes(12)
		const cipher = createCipheriv('aes-256-gcm', masterKey, iv)
		const encrypted = Buffer.concat([cipher.update(plain), cipher.final()])
		return Buffer.concat([Buffer.from([2]), iv, cipher.getAuthTag(), encrypted])
	}

	const decode = (blob: Buffer | Uint8Array) => {
		if (!blob || blob.length === 0) return null
		const buf = Buffer.from(blob)
		if (buf[0] === 2) {
			if (!masterKey) {
				throw new Error(
					'this auth state is encrypted, pass the same encryptionKey to useSqliteAuthState to open it'
				)
			}

			const iv = buf.subarray(1, 13)
			const tag = buf.subarray(13, 29)
			const decipher = createDecipheriv('aes-256-gcm', masterKey, iv)
			decipher.setAuthTag(tag)
			const plain = Buffer.concat([decipher.update(buf.subarray(29)), decipher.final()])
			return decodePlain(plain)
		}

		return decodePlain(buf)
	}

	const fixName = (s?: string) => s?.replace(/\//g, '__')?.replace(/:/g, '-')
	const keyOf = (category: string, id: string) => fixName(`${category}-${id}`)!

	let DatabaseSync: any
	try {
		;({ DatabaseSync } = await import('node:sqlite'))
	} catch {
		throw new Error(
			"useSqliteAuthState needs the built-in 'node:sqlite' module (Node 22.5+). Upgrade Node, or use useMultiFileAuthState instead."
		)
	}

	await mkdir(dirname(dbPath), { recursive: true }).catch(() => {})

	const db = new DatabaseSync(dbPath)
	db.exec('PRAGMA journal_mode = TRUNCATE')
	db.exec('PRAGMA synchronous = NORMAL')
	db.exec('PRAGMA busy_timeout = 5000')
	db.exec('CREATE TABLE IF NOT EXISTS auth_state (k TEXT PRIMARY KEY, v BLOB NOT NULL) WITHOUT ROWID')

	const qGet = db.prepare('SELECT v FROM auth_state WHERE k = ?')
	const qUpsert = db.prepare(
		'INSERT INTO auth_state(k,v) VALUES(?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v'
	)
	const qDelete = db.prepare('DELETE FROM auth_state WHERE k = ?')
	const qPreKeys = db.prepare("SELECT k FROM auth_state WHERE k LIKE 'pre-key-%'")

	const runTx = (fn: () => void) => {
		db.exec('BEGIN')
		try {
			const r = fn()
			db.exec('COMMIT')
			return r
		} catch (err) {
			db.exec('ROLLBACK')
			throw err
		}
	}

	const readRaw = (k: string) => {
		const row = qGet.get(k) as { v: Buffer } | undefined
		if (!row) return null
		try {
			return decode(row.v)
		} catch (err: any) {
			logger?.warn?.({ k, err: err?.message }, 'sqlite-auth: failed to decode row, treating as missing')
			return null
		}
	}

	const prunePreKeys = (): number => {
		if (!maxPreKeys || maxPreKeys <= 0) {
			return 0
		}

		const rows = qPreKeys.all() as { k: string }[]
		if (rows.length <= maxPreKeys + 20) {
			return 0
		}

		const parsed = rows
			.map(r => ({ k: r.k, id: parseInt(r.k.slice('pre-key-'.length), 10) }))
			.filter(r => Number.isFinite(r.id))
			.sort((a, b) => b.id - a.id)
		const toDelete = parsed.slice(maxPreKeys)
		if (toDelete.length === 0) {
			return 0
		}

		runTx(() => {
			for (const r of toDelete) {
				qDelete.run(r.k)
			}
		})
		logger?.info?.({ pruned: toDelete.length, kept: maxPreKeys }, 'sqlite-auth: pruned old pre-keys')
		return toDelete.length
	}

	const runMigration = async (folder: string) => {
		let files: string[]
		try {
			files = await readdir(folder)
		} catch {
			return 0
		}

		const rows: [string, Buffer][] = []
		for (const file of files) {
			if (!file.endsWith('.json')) continue
			let value: any
			try {
				value = JSON.parse(await readFile(join(folder, file), 'utf8'), bufReviver)
			} catch {
				continue
			}

			if (value === null || value === undefined) continue
			rows.push([file.slice(0, -'.json'.length), encode(value)])
		}

		runTx(() => {
			for (const [k, v] of rows) qUpsert.run(k, v)
		})
		return rows.length
	}

	const hasCreds = () => !!qGet.get('creds')
	if (migrateFromFolder && !hasCreds()) {
		const n = await runMigration(migrateFromFolder)
		if (n > 0) {
			logger?.info?.({ count: n, from: migrateFromFolder }, 'sqlite-auth: migrated legacy auth state')
		}
	}

	prunePreKeys()

	if (compactThresholdBytes > 0) {
		const size = (await stat(dbPath).catch(() => null))?.size || 0
		if (size > compactThresholdBytes) {
			try {
				db.exec('VACUUM')
				logger?.info?.({ size }, 'sqlite-auth: compacted auth database')
			} catch (err: any) {
				logger?.warn?.({ err: err?.message }, 'sqlite-auth: compaction failed')
			}
		}
	}

	const credsRow = qGet.get('creds') as { v: Buffer } | undefined
	let creds = (credsRow ? decode(credsRow.v) : null) as AuthenticationCreds | null
	if (!creds) {
		creds = initAuthCreds()
		qUpsert.run('creds', encode(creds))
	}

	const keys = {
		get: async <T extends keyof SignalDataTypeMap>(type: T, ids: string[]) => {
			const data: { [id: string]: SignalDataTypeMap[T] } = {}
			for (const id of ids) {
				let value = readRaw(keyOf(type, id))
				if (type === 'app-state-sync-key' && value) {
					value = proto.Message.AppStateSyncKeyData.fromObject(value)
				}

				data[id] = value ?? null
			}

			return data
		},
		set: async (data: any) => {
			const ops: [string, any][] = []
			let hasPreKeyUpdates = false
			for (const category in data) {
				if (category === 'pre-key') {
					hasPreKeyUpdates = true
				}

				for (const id in data[category]) {
					ops.push([keyOf(category, id), data[category][id]])
				}
			}

			runTx(() => {
				for (const [k, value] of ops) {
					if (value === null || value === undefined) qDelete.run(k)
					else qUpsert.run(k, encode(value))
				}
			})

			if (hasPreKeyUpdates) {
				prunePreKeys()
			}
		},
		clear: async () => {
			db.prepare("DELETE FROM auth_state WHERE k <> 'creds'").run()
		}
	}

	return {
		state: {
			creds,
			keys
		},
		saveCreds: async () => {
			qUpsert.run('creds', encode(creds))
		},
		db,
		close: () => db.close(),
		compact: () => {
			db.exec('VACUUM')
		},
		prunePreKeys
	}
}
