import { mkdir, readdir, readFile } from 'fs/promises'
import { dirname, join } from 'path'
import { proto } from '../../WAProto/index.js'
import type { AuthenticationCreds, AuthenticationState, SignalDataTypeMap } from '../Types'
import type { ILogger } from './logger'
import { initAuthCreds } from './auth-utils'

export type SqliteAuthStateOptions = {
	fileName?: string
	migrateFromFolder?: string
	logger?: ILogger
}

export const useSqliteAuthState = async (
	pathOrFolder: string,
	options: SqliteAuthStateOptions = {}
): Promise<{
	state: AuthenticationState
	saveCreds: () => Promise<void>
	db: any
	close: () => void
}> => {
	const { fileName = 'auth.db', migrateFromFolder, logger } = options
	const dbPath = /\.(db|sqlite|sqlite3)$/i.test(pathOrFolder) ? pathOrFolder : join(pathOrFolder, fileName)

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

	const encode = (value: any) => {
		if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
			return Buffer.concat([Buffer.from([1]), Buffer.from(value)])
		}
		return Buffer.concat([Buffer.from([0]), Buffer.from(JSON.stringify(value, bufReplacer), 'utf8')])
	}

	const decode = (blob: Buffer | Uint8Array) => {
		if (!blob || blob.length === 0) return null
		if (blob[0] === 1) return Buffer.from(blob.subarray(1))
		return JSON.parse(Buffer.from(blob.subarray(1)).toString('utf8'), bufReviver)
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

	let creds = readRaw('creds') as AuthenticationCreds | null
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
				if (value !== null && value !== undefined) {
					data[id] = value
				}
			}
			return data
		},
		set: async (data: any) => {
			const ops: [string, any][] = []
			for (const category in data) {
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
		close: () => db.close()
	}
}
