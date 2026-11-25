export declare const crc32: (data: Buffer) => number;
export type ZipEntry = {
    name: string;
    data: Buffer;
};
export declare const createZip: (entries: ZipEntry[]) => Buffer;
//# sourceMappingURL=zip.d.ts.map
