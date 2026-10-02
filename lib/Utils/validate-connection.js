import { Boom } from '@hapi/boom';
import { createHash } from 'crypto';
import { proto } from '../../WAProto/index.js';
import { KEY_BUNDLE_TYPE, WA_ADV_ACCOUNT_SIG_PREFIX, WA_ADV_DEVICE_SIG_PREFIX, WA_ADV_HOSTED_ACCOUNT_SIG_PREFIX } from '../Defaults/index.js';
import { getBinaryNodeChild, jidDecode, S_WHATSAPP_NET } from '../WABinary/index.js';
import { Curve, hmacSign } from './crypto.js';
import { encodeBigEndian } from './generics.js';
import { createSignalIdentity } from './signal.js';
const getUserAgent = (config) => {
    return {
        appVersion: {
            primary: config.version[0],
            secondary: config.version[1],
            tertiary: config.version[2]
        },
        platform: proto.ClientPayload.UserAgent.Platform.WEB,
        releaseChannel: proto.ClientPayload.UserAgent.ReleaseChannel.RELEASE,
        osVersion: '0.1',
        device: 'Desktop',
        osBuildNumber: '0.1',
        localeLanguageIso6391: 'en',
        mnc: '000',
        mcc: '000',
        localeCountryIso31661Alpha2: config.countryCode
    };
};
const PLATFORM_MAP = {
    'Mac OS': proto.ClientPayload.WebInfo.WebSubPlatform.DARWIN,
    Windows: proto.ClientPayload.WebInfo.WebSubPlatform.WIN32
};
const getWebInfo = (config) => {
    let webSubPlatform = proto.ClientPayload.WebInfo.WebSubPlatform.WEB_BROWSER;
    if (config.syncFullHistory && PLATFORM_MAP[config.browser[0]] && config.browser[1] === 'Desktop') {
        webSubPlatform = PLATFORM_MAP[config.browser[0]];
    }
    return {
        webSubPlatform
    };
};
const getClientPayload = (config) => {
    const payload = {
        connectType: proto.ClientPayload.ConnectType.WIFI_UNKNOWN,
        connectReason: proto.ClientPayload.ConnectReason.USER_ACTIVATED,
        userAgent: getUserAgent(config)
    };
    payload.webInfo = getWebInfo(config);
    return payload;
};
export const generateLoginNode = (userJid, config) => {
    const { user, device } = jidDecode(userJid);
    const payload = {
        ...getClientPayload(config),
        passive: false,
        pull: true,
        username: +user,
        device: device,
        lidDbMigrated: false
    };
    return proto.ClientPayload.fromObject(payload);
};
export const generateRegistrationNode = ({ registrationId, signedPreKey, signedIdentityKey }, config) => {
    const appVersionBuf = createHash('md5')
        .update(config.version.join('.'))
        .digest();
    const companion = {
        os: config.browser[0],
        platformType: proto.DeviceProps.PlatformType.CHROME,
        requireFullSync: config.syncFullHistory,
        historyType: config.syncFullHistory
            ? proto.DeviceProps.HistorySyncConfig.HistorySyncType.ON_DEMAND
            : proto.DeviceProps.HistorySyncConfig.HistorySyncType.NO_HISTORY
    };
    const companionProto = proto.DeviceProps.encode(companion).finish();
    const registerPayload = {
        ...getClientPayload(config),
        passive: false,
        pull: false,
        devicePairingData: {
            buildHash: appVersionBuf,
            deviceProps: companionProto,
            eRegid: encodeBigEndian(registrationId),
            eKeytype: KEY_BUNDLE_TYPE,
            eIdent: signedIdentityKey.public,
            eSkeyId: encodeBigEndian(signedPreKey.keyId, 3),
            eSkeyVal: signedPreKey.keyPair.public,
            eSkeySig: signedPreKey.signature
        }
    };
    return proto.ClientPayload.fromObject(registerPayload);
};
export const configureSuccessfulPairing = (stanza, { advSecretKey, signedIdentityKey, signalIdentities }) => {
    const msgId = stanza.attrs.id;
    const pairSuccessNode = getBinaryNodeChild(stanza, 'pair-success');
    const deviceIdentityNode = getBinaryNodeChild(pairSuccessNode, 'device-identity');
    const platformNode = getBinaryNodeChild(pairSuccessNode, 'platform');
    const deviceNode = getBinaryNodeChild(pairSuccessNode, 'device');
    const businessNode = getBinaryNodeChild(pairSuccessNode, 'biz');
    if (!deviceIdentityNode || !deviceNode) {
        throw new Boom('Missing device-identity or device in pair success', { data: stanza });
    }
    const { details, hmac, accountType } = proto.ADVSignedDeviceIdentityHMAC.decode(deviceIdentityNode.content);
    const isHosted = accountType === proto.ADVEncryptionType.HOSTED;
    const hmacPrefix = isHosted ? WA_ADV_HOSTED_ACCOUNT_SIG_PREFIX : new Uint8Array(0);
    const advSign = hmacSign(Buffer.concat([hmacPrefix, details]), Buffer.from(advSecretKey, 'base64'));
    if (Buffer.compare(hmac, advSign) !== 0) {
        throw new Boom('Invalid account signature');
    }
    const account = proto.ADVSignedDeviceIdentity.decode(details);
    const { accountSignatureKey, accountSignature, details: deviceDetails } = account;
    const accountMsg = Buffer.concat([
        isHosted ? WA_ADV_HOSTED_ACCOUNT_SIG_PREFIX : WA_ADV_ACCOUNT_SIG_PREFIX,
        deviceDetails,
        signedIdentityKey.public
    ]);
    if (!Curve.verify(accountSignatureKey, accountMsg, accountSignature)) {
        throw new Boom('Invalid account signature');
    }
    const deviceMsg = Buffer.concat([
        isHosted ? Buffer.from([6, 6]) : WA_ADV_DEVICE_SIG_PREFIX,
        deviceDetails,
        signedIdentityKey.public,
        accountSignatureKey
    ]);
    account.deviceSignature = Curve.sign(signedIdentityKey.private, deviceMsg);
    account.deviceSignatureKey = signedIdentityKey.public;
    const identity = createSignalIdentity(deviceNode.attrs.jid, accountSignatureKey);
    const accountEnc = encodeSignedDeviceIdentity(account, false);
    const deviceIdentity = proto.ADVDeviceIdentity.decode(account.details);
    const reply = {
        tag: 'iq',
        attrs: {
            to: S_WHATSAPP_NET,
            type: 'result',
            id: msgId
        },
        content: [
            {
                tag: 'pair-device-sign',
                attrs: {},
                content: [
                    {
                        tag: 'device-identity',
                        attrs: { 'key-index': deviceIdentity.keyIndex.toString() },
                        content: accountEnc
                    }
                ]
            }
        ]
    };
    const authUpdate = {
        account,
        me: {
            id: deviceNode.attrs.jid,
            name: businessNode?.attrs?.name,
            lid: deviceNode.attrs.lid
        },
        signalIdentities: [...(signalIdentities || []), identity],
        platform: platformNode?.attrs?.name
    };
    return {
        creds: authUpdate,
        reply
    };
};
export const encodeSignedDeviceIdentity = (account, includeSignatureKey) => {
    account = { ...account };
    if (!includeSignatureKey || !account.accountSignatureKey?.length) {
        account.accountSignatureKey = null;
    }
    return proto.ADVSignedDeviceIdentity.encode(account).finish();
};
