const CRC_TABLE = (() => {
	const table = new Int32Array(256)
	for (let n = 0; n < 256; n++) {
		let c = n
		for (let k = 0; k < 8; k++) {
			c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
		}

		table[n] = c
	}

	return table
})()

export const crc32 = (data: Buffer): number => {
	let crc = 0xffffffff
	for (let i = 0; i < data.length; i++) {
		crc = CRC_TABLE[(crc ^ data[i]!) & 0xff]! ^ (crc >>> 8)
	}

	return (crc ^ 0xffffffff) >>> 0
}

export type ZipEntry = {
	name: string
	data: Buffer
}

const dosDateTime = (date: Date): { time: number; date: number } => {
	const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2)
	const dosDate = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
	return { time, date: dosDate }
}

export const createZip = (entries: ZipEntry[]): Buffer => {
	const now = dosDateTime(new Date())
	const localParts: Buffer[] = []
	const centralParts: Buffer[] = []
	let offset = 0

	for (const { name, data } of entries) {
		const nameBuf = Buffer.from(name, 'utf-8')
		const crc = crc32(data)
		const size = data.length

		const localHeader = Buffer.alloc(30)
		localHeader.writeUInt32LE(0x04034b50, 0)
		localHeader.writeUInt16LE(20, 4)
		localHeader.writeUInt16LE(0, 6)
		localHeader.writeUInt16LE(0, 8)
		localHeader.writeUInt16LE(now.time, 10)
		localHeader.writeUInt16LE(now.date, 12)
		localHeader.writeUInt32LE(crc, 14)
		localHeader.writeUInt32LE(size, 18)
		localHeader.writeUInt32LE(size, 22)
		localHeader.writeUInt16LE(nameBuf.length, 26)
		localHeader.writeUInt16LE(0, 28)

		localParts.push(localHeader, nameBuf, data)

		const centralHeader = Buffer.alloc(46)
		centralHeader.writeUInt32LE(0x02014b50, 0)
		centralHeader.writeUInt16LE(20, 4)
		centralHeader.writeUInt16LE(20, 6)
		centralHeader.writeUInt16LE(0, 8)
		centralHeader.writeUInt16LE(0, 10)
		centralHeader.writeUInt16LE(now.time, 12)
		centralHeader.writeUInt16LE(now.date, 14)
		centralHeader.writeUInt32LE(crc, 16)
		centralHeader.writeUInt32LE(size, 20)
		centralHeader.writeUInt32LE(size, 24)
		centralHeader.writeUInt16LE(nameBuf.length, 28)
		centralHeader.writeUInt16LE(0, 30)
		centralHeader.writeUInt16LE(0, 32)
		centralHeader.writeUInt16LE(0, 34)
		centralHeader.writeUInt16LE(0, 36)
		centralHeader.writeUInt32LE(0, 38)
		centralHeader.writeUInt32LE(offset, 42)

		centralParts.push(centralHeader, nameBuf)

		offset += localHeader.length + nameBuf.length + data.length
	}

	const centralDir = Buffer.concat(centralParts)
	const endRecord = Buffer.alloc(22)
	endRecord.writeUInt32LE(0x06054b50, 0)
	endRecord.writeUInt16LE(0, 4)
	endRecord.writeUInt16LE(0, 6)
	endRecord.writeUInt16LE(entries.length, 8)
	endRecord.writeUInt16LE(entries.length, 10)
	endRecord.writeUInt32LE(centralDir.length, 12)
	endRecord.writeUInt32LE(offset, 16)
	endRecord.writeUInt16LE(0, 20)

	return Buffer.concat([...localParts, centralDir, endRecord])
}
