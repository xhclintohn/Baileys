import { Boom } from '@hapi/boom';
import { expandAppStateKeys } from 'whatsapp-rust-bridge';
import { proto } from '../../WAProto/index.js';
import { LabelAssociationType } from '../Types/LabelAssociation.js';
import { getBinaryNodeChild, getBinaryNodeChildren, isJidGroup, jidNormalizedUser } from '../WABinary/index.js';
import { aesDecrypt, aesEncrypt, hmacSign } from './crypto.js';
import { toNumber } from './generics.js';
import { LT_HASH_ANTI_TAMPERING } from './lt-hash.js';
import { downloadContentFromMessage } from './messages-media.js';
import { emitSyncActionResults, processContactAction } from './sync-action-utils.js';
const mutationKeys = (keydata) => {
    const keys = expandAppStateKeys(keydata);
    return {
        indexKey: keys.indexKey,
        valueEncryptionKey: keys.valueEncryptionKey,
        valueMacKey: keys.valueMacKey,
        snapshotMacKey: keys.snapshotMacKey,
        patchMacKey: keys.patchMacKey
    };
};
const generateMac = (operation, data, keyId, key) => {
    const opByte = operation === proto.SyncdMutation.SyncdOperation.SET ? 0x01 : 0x02;
    const keyIdBuffer = typeof keyId === 'string' ? Buffer.from(keyId, 'base64') : keyId;
    const keyData = new Uint8Array(1 + keyIdBuffer.length);
    keyData[0] = opByte;
    keyData.set(keyIdBuffer, 1);
    const last = new Uint8Array(8);
    last[7] = keyData.length;
    const total = new Uint8Array(keyData.length + data.length + last.length);
    total.set(keyData, 0);
    total.set(data, keyData.length);
    total.set(last, keyData.length + data.length);
    const hmac = hmacSign(total, key, 'sha512');
    return hmac.subarray(0, 32);
};
const to64BitNetworkOrder = (e) => {
    const buff = Buffer.alloc(8);
    buff.writeUint32BE(e, 4);
    return buff;
};
export const makeLtHashGenerator = ({ indexValueMap, hash }) => {
    indexValueMap = { ...indexValueMap };
    const addBuffs = [];
    const subBuffs = [];
    return {
        mix: ({ indexMac, valueMac, operation }) => {
            const indexMacBase64 = Buffer.from(indexMac).toString('base64');
            const prevOp = indexValueMap[indexMacBase64];
            if (operation === proto.SyncdMutation.SyncdOperation.REMOVE) {
                if (!prevOp) {
                    return;
                }
                delete indexValueMap[indexMacBase64];
            }
            else {
                addBuffs.push(valueMac);
                indexValueMap[indexMacBase64] = { valueMac };
            }
            if (prevOp) {
                subBuffs.push(prevOp.valueMac);
            }
        },
        finish: () => {
            const result = LT_HASH_ANTI_TAMPERING.subtractThenAdd(hash, subBuffs, addBuffs);
            return {
                hash: Buffer.from(result),
                indexValueMap
            };
        }
    };
};
const generateSnapshotMac = (lthash, version, name, key) => {
    const total = Buffer.concat([lthash, to64BitNetworkOrder(version), Buffer.from(name, 'utf-8')]);
    return hmacSign(total, key, 'sha256');
};
const generatePatchMac = (snapshotMac, valueMacs, version, type, key) => {
    const total = Buffer.concat([snapshotMac, ...valueMacs, to64BitNetworkOrder(version), Buffer.from(type, 'utf-8')]);
    return hmacSign(total, key);
};
export const newLTHashState = () => ({ version: 0, hash: Buffer.alloc(128), indexValueMap: {} });
export const ensureLTHashStateVersion = (state) => {
    if (typeof state.version !== 'number' || isNaN(state.version)) {
        state.version = 0;
    }
    return state;
};
export const MAX_SYNC_ATTEMPTS = 2;
export const isMissingKeyError = (error) => {
    return error?.data?.isMissingKey === true;
};
export const isAppStateSyncIrrecoverable = (error, attempts) => {
    return attempts >= MAX_SYNC_ATTEMPTS || error?.name === 'TypeError';
};
export const encodeSyncdPatch = async ({ type, index, syncAction, apiVersion, operation }, myAppStateKeyId, state, getAppStateSyncKey) => {
    const key = !!myAppStateKeyId ? await getAppStateSyncKey(myAppStateKeyId) : undefined;
    if (!key) {
        throw new Boom(`myAppStateKey ("${myAppStateKeyId}") not present`, { data: { isMissingKey: true } });
    }
    const encKeyId = Buffer.from(myAppStateKeyId, 'base64');
    state = { ...state, indexValueMap: { ...state.indexValueMap } };
    const indexBuffer = Buffer.from(JSON.stringify(index));
    const dataProto = proto.SyncActionData.fromObject({
        index: indexBuffer,
        value: syncAction,
        padding: new Uint8Array(0),
        version: apiVersion
    });
    const encoded = proto.SyncActionData.encode(dataProto).finish();
    const keyValue = mutationKeys(key.keyData);
    const encValue = aesEncrypt(encoded, keyValue.valueEncryptionKey);
    const valueMac = generateMac(operation, encValue, encKeyId, keyValue.valueMacKey);
    const indexMac = hmacSign(indexBuffer, keyValue.indexKey);
    const generator = makeLtHashGenerator(state);
    generator.mix({ indexMac, valueMac, operation });
    Object.assign(state, generator.finish());
    state.version += 1;
    const snapshotMac = generateSnapshotMac(state.hash, state.version, type, keyValue.snapshotMacKey);
    const patch = {
        patchMac: generatePatchMac(snapshotMac, [valueMac], state.version, type, keyValue.patchMacKey),
        snapshotMac: snapshotMac,
        keyId: { id: encKeyId },
        mutations: [
            {
                operation: operation,
                record: {
                    index: {
                        blob: indexMac
                    },
                    value: {
                        blob: Buffer.concat([encValue, valueMac])
                    },
                    keyId: { id: encKeyId }
                }
            }
        ]
    };
    const base64Index = indexMac.toString('base64');
    state.indexValueMap[base64Index] = { valueMac };
    return { patch, state };
};
