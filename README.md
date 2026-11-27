If you find this project helpful, consider [following me on GitHub](https://github.com/xhclintohn).

# toxic-baileys

<div align="center">

[![npm version](https://img.shields.io/npm/v/toxic-baileys.svg?style=for-the-badge)](https://www.npmjs.com/package/toxic-baileys)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)
[![npm downloads](https://img.shields.io/npm/dm/toxic-baileys.svg?style=for-the-badge)](https://www.npmjs.com/package/toxic-baileys)
[![GitHub](https://img.shields.io/badge/GitHub-Repository-blue?style=for-the-badge&logo=github)](https://github.com/xhclintohn/Baileys)
[![Node](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen?style=for-the-badge)](https://nodejs.org)

</div>

This is **toxic-baileys** — a feature-packed fork of the Baileys WhatsApp Web API. It adds LID identity mapping, AI group support, cross-platform interoperability, extended message types, and more reliable connection handling on top of upstream Baileys.

**Maintainer:** xh_clinton

---

> [!IMPORTANT]
> ### LID Mapping — Critical Feature in This Fork
> WhatsApp has rolled out **Linked Identity (LID)** JIDs as part of its cross-platform interoperability initiative. Group messages and status updates now arrive with `@lid` domain JIDs instead of standard `@s.whatsapp.net` phone-number JIDs. **Without LID resolution, you cannot identify who sent a message in many groups.**
>
> This fork ships a complete `LIDMappingStore` (bidirectional LRU cache + persistent key store) and `UsyncLIDProtocol` so your bot always knows the real phone number behind every `@lid` JID. See the **[LID Mapping System](#-lid-mapping-system)** section for full integration details.

---

## 📑 Table of Contents

- [📋 Changelog](#-changelog)
- [⭐ Features](#-features)
- [📦 Installation](#-installation)
  - [Via npm](#via-npm)
  - [Via Yarn](#via-yarn)
  - [From GitHub (edge)](#from-github-edge)
  - [Drop-in replacement for `@whiskeysockets/baileys`](#drop-in-replacement-for-whiskeysocketsbaileys)
- [🚀 Quick Start](#-quick-start)
- [🔗 Connection & Configuration](#-connection--configuration)
- [🔐 Authentication State Management](#-authentication-state-management)
- [🆔 LID Mapping System](#-lid-mapping-system)
- [📲 Pairing Handler](#-pairing-handler)
- [🖼️ Chat Wallpaper](#-chat-wallpaper)
- [🎨 Chat Themes](#-chat-themes)
- [👁️ View Once](#-view-once)
- [🤖 AI Groups](#-ai-groups)
- [🔄 Interoperability API](#-interoperability-api)
- [📡 USync Protocol](#-usync-protocol)
- [💬 Sending Messages](#-sending-messages)
  - [Basic Messages](#basic-messages)
  - [Media Messages](#media-messages)
  - [Interactive Messages](#interactive-messages)
  - [Album Messages](#album-messages)
  - [Event Messages](#event-messages)
  - [Poll & Poll Result Messages](#poll--poll-result-messages)
  - [Group Status Messages](#group-status-messages)
  - [Payment Request Messages](#payment-request-messages)
  - [Product Messages](#product-messages)
  - [Button & Template Messages](#button--template-messages)
- [🧩 Rich Message Builders](#-rich-message-builders)
- [📨 Chat & Message Management](#-chat--message-management)
- [👥 Group Management](#-group-management)
- [👤 User & Profile Management](#-user--profile-management)
- [🏷️ Username Management](#-username-management)
- [📰 Newsletter / Channel Management](#-newsletter--channel-management)
- [🔒 Privacy & Block Management](#-privacy--block-management)
- [🗄️ Data Store Implementation](#-data-store-implementation)
- [🛠️ Utility Functions](#-utility-functions)
- [✅ Best Practices & Tips](#-best-practices--tips)
  - [Connection Stability](#connection-stability)
  - [LID Mapping](#lid-mapping)
  - [Performance](#performance)
- [⚖️ Important Legal Notice](#-important-legal-notice)
- [🆘 Getting Help](#-getting-help)
- [📄 License](#-license)

## 📋 Changelog

Every version and what changed in it is listed in [CHANGELOG.md](CHANGELOG.md).

[![Changelog](https://img.shields.io/badge/Changelog-View%20all%20versions-blue?style=for-the-badge)](CHANGELOG.md)

---

## ⭐ Features
A quick tour of what you get out of the box

<details>
<summary>Click to see all features</summary>

- **Modern & Fast** — Latest WA version `[2,3000,1054660005]`, optimised pre-key upload (812 keys)
- **Full LID Identity Resolution** — Bidirectional LIDPN mapping with LRU cache, USync lookup, and persistent storage
- **Pairing Handler** — `startPairing()` generates a pairing code fast (no artificial delays, capped number check), keeps the code valid across reconnects, and hands you the session ID on connect
- **Chat Wallpaper** — Set a custom group chat wallpaper/theme image with `CHAT_THEME_SETTING` (encrypted upload + `chat_theme` envelope)
- **Chat Themes** — Set built-in chat theme presets or a solid background color with doodle toggle, no image upload needed
- **View Once** — Send view-once media, and handle incoming view-once with `handleViewOnce()` which downloads it and recovers it from the sender's own copy when WhatsApp withholds the keys
- **AI Groups Support** — Create and manage WhatsApp's AI-powered group type
- **Cross-Platform Interop** — Third-party integrator management (BirdyChat, Haiket, and more)
- **Enhanced Stability** — Improved connection handling, socket end handlers, `ev.destroy()` on close, cleaner pre-key retry logic
- **Multi-Device Support** — Full WhatsApp multi-device protocol with improved `historySyncConfig`
- **End-to-End Encryption** — Signal Protocol, `inlineInitialPayloadInE2EeMsg: true`
- **Extended Message Types** — Interactive, album, event, poll result, group status, payment, product
- **Advanced Group Management** — Group controls, group status V2, communities support
- **Flexible Auth** — Multi-file auth state with `makeCacheableSignalKeyStore`
- **Compact Sessions** — `useSqliteAuthState()` keeps your whole session in one small database file instead of thousands of JSON files, prunes old pre-keys automatically, and can migrate an existing multi-file session without re-pairing
- **Sound Stickers** — stickers with audio decode as a normal `stickerMessage` with the audio attached, instead of arriving as empty messages
- **Full Newsletter/Channel API** — Follow, create, metadata, `newsletterId()` helper, fixed join/leave v2 endpoints
- **Developer Friendly** — `toxicHandler` and `ToxicHandler` exposed on socket, `fetchAccountReachoutTimelock`, `fetchNewChatMessageCap`, `registerSocketEndHandler`, clean API
- **WebSocket Improvements** — `perMessageDeflate: false`, 100 MB max payload

</details>

---

## 📦 Installation
Pick whichever one suits you

### Via npm
```bash
npm install toxic-baileys
```

### Via Yarn
```bash
yarn add toxic-baileys
```

### From GitHub (edge)
```bash
npm install github:xhclintohn/Baileys
```

### Drop-in replacement for `@whiskeysockets/baileys`
```json
{
 "dependencies": {
 "@whiskeysockets/baileys": "npm:toxic-baileys@latest"
 }
}
```

---

## 🚀 Quick Start
Get connected in under a minute.

<details>
<summary>Basic Connection (QR Code)</summary>

```javascript
import makeWASocket, {
  useMultiFileAuthState,
  Browsers,
  makeCacheableSignalKeyStore,
  DisconnectReason,
} from 'toxic-baileys';
import pino from 'pino';

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

  const sock = makeWASocket({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
    },
    logger: pino({ level: 'silent' }),
    browser: Browsers.android('Chrome'),
    syncFullHistory: false,
    markOnlineOnConnect: false,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) console.log('Scan this QR:', qr);
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) connectToWhatsApp();
    } else if (connection === 'open') {
      console.log('Connected! Bot LID:', sock.user?.lid);
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const m of messages) {
      if (!m.message) continue;
      console.log('Message:', JSON.stringify(m, undefined, 2));
    }
  });
}

connectToWhatsApp().catch(console.error);
```
</details>

<details>
<summary>Pairing Code (no QR)</summary>

```javascript
import makeWASocket, {
  useMultiFileAuthState,
  Browsers,
  makeCacheableSignalKeyStore,
} from 'toxic-baileys';
import pino from 'pino';

async function connectWithPairing() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

  const sock = makeWASocket({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
    },
    logger: pino({ level: 'silent' }),
    browser: Browsers.android('Chrome'),
    syncFullHistory: false,
    markOnlineOnConnect: false,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async ({ qr }) => {
    if (qr && !state.creds.registered) {
      const phoneNumber = '254712345678'; // no + or spaces
      const code = await sock.requestPairingCode(phoneNumber);
      console.log('Pairing Code:', code);
    }
  });
}

connectWithPairing().catch(console.error);
```
</details>

---

## 🔗 Connection & Configuration
Tune how your bot connects to WhatsApp.

<details>
<summary>Full Socket Configuration</summary>

```javascript
import makeWASocket, { Browsers, makeCacheableSignalKeyStore } from 'toxic-baileys';
import NodeCache from '@cacheable/node-cache';

const groupCache = new NodeCache({ stdTTL: 300, useClones: false });

const sock = makeWASocket({
 browser: Browsers.android('Chrome'),
 syncFullHistory: true,
 markOnlineOnConnect: false,
 connectTimeoutMs: 60_000,
 defaultQueryTimeoutMs: 60_000,
 keepAliveIntervalMs: 30_000,
 generateHighQualityLinkPreview: true,
 cachedGroupMetadata: async (jid) => groupCache.get(jid),
 getMessage: async (key) => await yourStore.getMessage(key),
});

sock.ev.on('groups.update', async ([event]) => {
 const metadata = await sock.groupMetadata(event.id);
 groupCache.set(event.id, metadata);
});
```
</details>

---

## 🔐 Authentication State Management
How your bot remembers who it is between restarts

<details>
<summary>Multi-File Auth (Development)</summary>

```javascript
import makeWASocket, { useMultiFileAuthState } from 'toxic-baileys';

const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
const sock = makeWASocket({ auth: state });
sock.ev.on('creds.update', saveCreds);
```

> Tip: pass `{ maxPreKeys: 100 }` as the second argument to automatically delete old pre-key files and keep the folder small: `useMultiFileAuthState('./auth_info', { maxPreKeys: 100 })`.
</details>

<details>
<summary>Compact SQLite Auth (Recommended)</summary>

One database file instead of thousands of JSON files. Old pre-keys are pruned automatically (newest 100 kept by default), the file compacts itself when it grows, and you can migrate an existing multi-file session in place — no re-pairing needed. Needs Node 22.5+ (uses the built-in `node:sqlite`, no extra packages).

```javascript
import makeWASocket, { useSqliteAuthState } from 'toxic-baileys';

// Fresh session, stored in ./auth_info/auth.db
const { state, saveCreds } = await useSqliteAuthState('./auth_info');

// Or migrate an existing multi-file session folder (creds.json + key files)
const migrated = await useSqliteAuthState('./auth_info', { migrateFromFolder: './auth_info' });

const sock = makeWASocket({ auth: state });
sock.ev.on('creds.update', saveCreds);
```

Options: `maxPreKeys` (default `100`, set `0` to keep everything), `compactThresholdBytes` (default 3 MB — the database vacuums itself on startup when bigger), and `encryptionKey` (a passphrase or 32-byte Buffer to encrypt the session at rest with AES-256-GCM; pass the same key every time you open it).
</details>

<details>
<summary>Custom Database Auth (Production)</summary>

```javascript
import makeWASocket, { makeCacheableSignalKeyStore } from 'toxic-baileys';

const myAuthState = {
 creds: await db.getAuthCreds(),
 keys: makeCacheableSignalKeyStore(await db.getSignalKeys(), console)
};
const sock = makeWASocket({ auth: myAuthState });
sock.ev.on('creds.update', async (creds) => await db.saveAuthCreds(creds));
```
</details>

---

## 🆔 LID Mapping System

> [!IMPORTANT]
> **This is one of the most critical new features in this fork.** WhatsApp is migrating groups to use Linked Identity (LID) JIDs — identifiers in the `@lid` domain that replace `@s.whatsapp.net` phone-number JIDs for privacy and cross-platform reasons. If you receive a message from `1234567890:0@lid` and don't have a mapping, you cannot identify the sender.

<details>
<summary>What is a LID, anyway?</summary>

A **Linked Identity (LID)** is an opaque numeric identifier assigned to each WhatsApp account in the `@lid` domain. WhatsApp uses LIDs in groups to decouple a person's phone number from their group identity. The LID is stable across phone number changes and is used for the Signal encryption protocol in newer group types.

```
Standard JID: 254712345678@s.whatsapp.net phone number visible
LID JID: 9876543210:0@lid opaque — phone number hidden
```

</details>
<details>
<summary>How the mapping store works</summary>

This fork implements `LIDMappingStore` in `src/Signal/lid-mapping.ts`:

```
┌─────────────────────────────────────────────────────┐
│ LIDMappingStore │
│ │
│ LRU Cache (3-day TTL, auto-purge) │
│ pn:{pnUser} lidUser │
│ lid:{lidUser} pnUser │
│ │
│ SignalKeyStoreWithTransaction │
│ lid-mapping/{pnUser} lidUser │
│ lid-mapping/{lidUser}_reverse pnUser │
│ │
│ USync Lookup (UsyncLIDProtocol) │
│ Query WhatsApp servers via w:sync IQ │
└─────────────────────────────────────────────────────┘
```

**Persistent file naming** (with `useMultiFileAuthState`):
```
Session/
 lid-mapping-{pnUser}.json pnUser lidUser
 lid-mapping-{lidUser}_reverse.json lidUser pnUser (reverse lookup)
```

</details>
<details>
<summary><code>me.lid</code> — your bot's own LID</summary>

When your bot pairs with WhatsApp, its own LID is stored in the session credentials:

```javascript
// Stored automatically by configureSuccessfulPairing()
// Access it any time after connecting:
const myLid = sock.user?.lid;
console.log('My LID:', myLid); // e.g. "9876543210@lid"
```

</details>
<details>
<summary>The <code>lidDbMigrated</code> login flag</summary>

The login payload includes `lidDbMigrated: false`. This signals to WhatsApp that the client has not yet migrated its local LID database, which causes WhatsApp to push down a full set of LIDPN mappings on the initial connection — seeding your local store automatically.

</details>
<details>
<summary>API reference</summary>

```typescript
// On the socket (via SignalRepositoryWithLIDStore):
sock.signalRepository.lidMapping.getPNForLID(lidJid) // string | null
sock.signalRepository.lidMapping.getLIDForPN(pnJid) // string | null
sock.signalRepository.lidMapping.getPNsForLIDs(lidJids[]) // LIDMapping[] | null
sock.signalRepository.lidMapping.getLIDsForPNs(pnJids[]) // LIDMapping[] | null
sock.signalRepository.lidMapping.storeLIDPNMappings(pairs[]) // void

// Type:
type LIDMapping = { lid: string; pn: string }
```

</details>
<details>
<summary>Live integration example</summary>

```javascript
import makeWASocket, { useMultiFileAuthState, makeCacheableSignalKeyStore } from 'toxic-baileys';

const { state, saveCreds } = await useMultiFileAuthState('./Session');
const lidPhoneCache = new Map();

const sock = makeWASocket({
 auth: {
 creds: state.creds,
 keys: makeCacheableSignalKeyStore(state.keys, console)
 }
});

sock.ev.on('creds.update', saveCreds);

// Wire up LID globals for use throughout your bot
globalThis.resolvePhoneFromLid = (lidJid) => {
 // synchronous — only works if the mapping is already cached
 return null;
};

globalThis.resolvePhoneFromLidAsync = async (lidJid) => {
 return await sock.signalRepository.lidMapping.getPNForLID(lidJid);
};

// Keep the in-memory cache warm from live LID mapping events
sock.ev.on('lid-mapping.update', (map) => {
 for (const [lid, pn] of Object.entries(map)) {
 const lidNum = lid.split('@')[0].split(':')[0];
 const phone = String(pn).split('@')[0].split(':')[0].replace(/\D/g, '');
 if (lidNum && phone) lidPhoneCache.set(lidNum, phone);
 }
});

// Resolving a sender from a group message
sock.ev.on('messages.upsert', async ({ messages }) => {
 for (const m of messages) {
 const sender = m.key.participant || m.key.remoteJid || '';
 if (sender.endsWith('@lid')) {
 const resolved = await sock.signalRepository.lidMapping.getPNForLID(sender);
 console.log(`LID ${sender} ${resolved ?? 'unknown'}`);
 }
 }
});
```

</details>
<details>
<summary>Multi-layer resolution (recommended pattern)</summary>

For maximum reliability, resolve LIDs in this priority order:

```javascript
async function resolveLid(lidJid, sock, lidPhoneCache) {
 const lidNum = lidJid.split('@')[0].split(':')[0].replace(/\D/g, '');
 if (!lidNum) return null;

 // 1. In-memory LRU cache (fastest)
 const cached = lidPhoneCache?.get(lidNum);
 if (cached) return String(cached).replace(/\D/g, '') + '@s.whatsapp.net';

 // 2. Baileys LIDMappingStore (LRU + persistent key store)
 const fromStore = await sock.signalRepository?.lidMapping?.getPNForLID(lidJid);
 if (fromStore) {
 const num = fromStore.split('@')[0].replace(/\D/g, '');
 if (num) { lidPhoneCache?.set(lidNum, num); return num + '@s.whatsapp.net'; }
 }

 // 3. Session file (lid-mapping-{lidNum}_reverse.json)
 try {
 const revFile = `./Session/lid-mapping-${lidNum}_reverse.json`;
 if (fs.existsSync(revFile)) {
 const jid = JSON.parse(fs.readFileSync(revFile, 'utf-8'));
 const num = String(jid).split('@')[0].replace(/\D/g, '');
 if (num && num !== lidNum) {
 lidPhoneCache?.set(lidNum, num);
 return num + '@s.whatsapp.net';
 }
 }
 } catch {}

 // 4. Group metadata participant scan (network call — use sparingly)
 try {
 const meta = await sock.groupMetadata(chatJid);
 for (const p of meta.participants || []) {
 const pLid = (p.lid || p.id || '').split('@')[0].split(':')[0].replace(/\D/g, '');
 if (pLid !== lidNum) continue;
 const pBase = p.id || p.jid || '';
 if (pBase && !pBase.endsWith('@lid')) {
 const num = pBase.split('@')[0].replace(/\D/g, '');
 if (num) { lidPhoneCache?.set(lidNum, num); return num + '@s.whatsapp.net'; }
 }
 }
 } catch {}

 return null; // unresolvable — pass lidJid through and let WhatsApp handle it
}
```

</details>

> [!NOTE]
> **Session file cleanup warning:** If your bot cleans up session files periodically, make sure `lid-mapping-*` files are preserved in your keep-list, or your mapping cache will be lost on restart and need to be re-fetched from WhatsApp's servers.

---

## 📲 Pairing Handler

Generate a WhatsApp pairing code and get a ready-to-use session ID when the user links — one function call, no socket boilerplate. The handler requests the code as soon as the socket is ready (no artificial delays), checks the number is on WhatsApp without blocking the code, re-registers the **same** code if the connection drops, and builds the session ID (base64 `creds.json`) once paired.

> [!NOTE]
> `startPairing` is a toxic-baileys utility — it only exists in this fork. The default browser fingerprint is Android/Chrome, the same one Toxic-MD runs, and it pairs fine from any phone.

<details>
<summary>Pairing example</summary>

```js
import { startPairing, isPairingActive } from '@whiskeysockets/baileys'

const number = '254712345678'

if (isPairingActive(number)) {
    console.log('A pairing for this number is already running')
} else {
    await startPairing(number, {
        onCode: (code) => {
            console.log('Pairing code:', code)
        },
        onConnected: ({ sessionId, userJid }) => {
            console.log('Paired:', userJid)
            console.log('Session ID:', sessionId)
        },
        onError: (error) => {
            console.error('Pairing failed:', error.message)
        }
    })
}
```

Options:

- `authDir` — folder for the temporary auth state (default: a temp folder that is deleted after pairing)
- `timeoutMs` — give up after this long (default: 420000)
- `browser` — linked-device fingerprint (default: `Browsers.android('Chrome')`)
- `newsletterJid` — optional channel JID to follow right after pairing, e.g. `120363425667150709@newsletter`
- `onCode(code)` — called once with the pairing code
- `onConnected({ sessionId, userJid, number })` — called after a successful link; `sessionId` is the base64 session you can store and reuse
- `onError(error)` — called if pairing fails or times out

One pairing per number runs at a time — a second call for the same number fails fast with an error. `isPairingActive(number)` tells you if one is already running, and `buildSessionId(authDir)` builds a session ID from any existing auth folder.

</details>

---

## 🖼️ Chat Wallpaper

Set a custom wallpaper (chat theme image) for a group. The image is uploaded as encrypted media and applied with a `CHAT_THEME_SETTING` protocol message, so every member sees the new background.

> [!NOTE]
> This needs toxic-baileys — the `chat-wallpaper-image` media type and the `chat_theme` message envelope are fork features. The bot also has to be a group admin, since WhatsApp only lets admins change a group's theme.

<details>
<summary>How to set a group wallpaper</summary>

```javascript
import { encryptedStream, generateMessageIDV2, proto } from 'toxic-baileys';
import { unlink } from 'fs/promises';

async function setGroupWallpaper(sock, jid, image, options = {}) {
  const media = Buffer.isBuffer(image)
    ? image
    : typeof image === 'string'
      ? { url: image }
      : image;

  const { mediaKey, encFilePath, fileSha256, fileEncSha256 } =
    await encryptedStream(media, 'chat-wallpaper-image', { logger: sock.logger });

  let directPath;
  try {
    const uploaded = await sock.waUploadToServer(encFilePath, {
      mediaType: 'chat-wallpaper-image',
      fileEncSha256B64: fileEncSha256.toString('base64'),
      timeoutMs: options.mediaUploadTimeoutMs,
    });
    directPath = uploaded.directPath;
  } finally {
    await unlink(encFilePath).catch(() => {});
  }
  if (!directPath) throw new Error('wallpaper upload returned no directPath');

  const message = {
    protocolMessage: {
      type: proto.Message.ProtocolMessage.Type.CHAT_THEME_SETTING,
      chatThemeSetting: {
        settingTimestampMs: options.settingTimestampMs ?? Date.now(),
        customImage: {
          directPath,
          mediaKey,
          fileEncSha256,
          fileSha256,
          dimLevel: options.dimLevel ?? 0,
        },
      },
    },
  };

  const messageId = options.messageId || generateMessageIDV2(sock.user?.id);
  await sock.relayMessage(jid, message, {
    messageId,
    additionalAttributes: { type: 'media' },
  });
  return { key: { remoteJid: jid, fromMe: true, id: messageId }, message };
}
```

Usage:

```javascript
// from a file path
await setGroupWallpaper(sock, jid, './wallpaper.jpg');

// from a URL, with dimming
await setGroupWallpaper(sock, jid, 'https://example.com/wallpaper.jpg', { dimLevel: 0 });

// from a Buffer
await setGroupWallpaper(sock, jid, buffer);
```

`dimLevel` controls how much the image is dimmed behind the chat (0 = no dimming). `jid` is the group JID, e.g. `120363000000000000@g.us`.

</details>

---

## 🎨 Chat Themes

Set one of WhatsApp's built-in chat themes, or a solid background color, for a chat or group. No image upload needed — the theme is applied with the same `CHAT_THEME_SETTING` protocol message as wallpapers.

> [!NOTE]
> This needs toxic-baileys — `setChatTheme`, `setChatThemeColor` and `clearChatTheme` are fork features. For groups, the bot has to be a group admin, since WhatsApp only lets admins change a group's theme.

<details>
<summary>How to set a chat theme</summary>

```javascript
import { CHAT_THEMES } from 'toxic-baileys';

// built-in preset
await sock.setChatTheme(jid, 'Emerald@Minimal');

// solid background color (ARGB), doodle pattern off
await sock.setChatThemeColor(jid, {
  backgroundLightArgb: 0xFFFF0000,
  backgroundDarkArgb: 0xFFFF0000,
  isDoodleEnabled: false,
});

// back to no theme
await sock.clearChatTheme(jid);

console.log(CHAT_THEMES);
```

Available presets: `Default-Blue@Minimal`, `Default-Blue@Tonal@Minimal`, `Emerald@Minimal`, `Emerald@Tonal@Minimal`, `Pink@Minimal`, `Red@Minimal`, `Royal-Blue@Minimal`, `Tyrian-Purple@Minimal`, `WhatsApp-Green@Minimal`.

`setChatTheme` also accepts a full `chatThemeSetting` object if you need one of the other wallpaper kinds (stock image, or the default wallpaper with a doodle toggle). `setChatThemeColor` accepts `colorLight`/`colorDark` hex strings instead of the ARGB numbers.

</details>

---

## 👁️ View Once

### Sending view once

Add `viewOnce: true` to any image, video or audio message:

```js
await sock.sendMessage(jid, { image: fs.readFileSync('./img.jpg'), viewOnce: true })
await sock.sendMessage(jid, { video: fs.readFileSync('./vid.mp4'), viewOnce: true })
await sock.sendMessage(jid, { audio: fs.readFileSync('./voice.ogg'), ptt: true, viewOnce: true })
```

### Handling incoming view once

Use `handleViewOnce` — it watches incoming messages, detects view-once media, downloads it, and hands you the buffer. When WhatsApp withholds the media keys (the "unavailable" stub some phone-sent view-once arrives as), it automatically recovers the media from the sender's own keyed copy that arrives alongside it.

> [!NOTE]
> `handleViewOnce` is a toxic-baileys utility — it only exists in this fork.

```js
import { handleViewOnce } from '@whiskeysockets/baileys'

const handler = handleViewOnce(sock, {
    onViewOnce: async ({ buffer, type, sender, chatJid, via }) => {
        console.log('View-once recovered:', type, 'from', sender, 'in', chatJid, 'via', via)
        await sock.sendMessage(sock.user.id, { image: buffer })
    },
    onError: (error) => console.log('View-once failed:', error.message)
})

// later, to stop listening:
handler.stop()
```

Options:

- `onViewOnce(result)` — called with `{ key, chatJid, sender, type, buffer, mimetype, caption, message, via }`; `via` is `'direct'` when the view-once itself carried keys, or `'sender-copy'` when it was recovered from the sender's own copy
- `onError(error, message)` — called when a view-once cannot be recovered
- `senderCopyWindowMs` — how long sender copies stay available for recovery (default: 300000)
- `senderCopyWaitMs` — how long to wait for a sender copy to arrive before giving up (default: 5000)
- `senderCopyCacheMs` — how long sender copies are kept in the cache for later retrieval (default: 86400000, 24 hours)
- `includeOwn` — also process your own outgoing view-once (default: false)

The returned handler can also fetch a sender copy later, for example when a user replies to an old view-once asking for it again:

```js
const got = await handler.downloadSenderCopy(senderJid, 'image')
if (got) await sock.sendMessage(chatJid, { image: got.buffer })
```

- `handler.getSenderCopy(senderJid, type?)` — returns the newest cached sender copy `{ message, type, ts, buffer? }` or `null`
- `handler.downloadSenderCopy(senderJid, type?)` — returns `{ buffer, type, mimetype, message }` or `null`; uses the already-downloaded buffer when the copy was recovered before, so it still works if WhatsApp has deleted the media since

Lower-level pieces are exported too if you want to build your own flow: `getViewOnceMedia(content)` detects view-once media (wrapper or inline flag) and returns `{ type, media }`, and `downloadViewOnceMessage(sock, message)` downloads one view-once message directly, returning `null` when it carries no keys.

---

## 🤖 AI Groups

WhatsApp introduced AI-powered groups — special group types that include an AI bot participant. This fork exposes full management of these groups via `makeAIGroupsSocket` (which is included in the socket chain automatically).

<details>
<summary>Socket chain</summary>

```
makeWASocket
 └─ makeInteropSocket
 └─ makeAIGroupsSocket
 └─ makeCommunitiesSocket
 └─ makeGroupsSocket
 └─ ...
```

</details>

<details>
<summary>AI group events</summary>

```javascript
// Automatically fires when an AI group is created
sock.ev.on('groups.upsert', ([groupMeta]) => {
 console.log('New group:', groupMeta.id, groupMeta.subject);
});

// Fires on participant changes (add/remove/promote/demote) in AI groups
sock.ev.on('group-participants.update', ({ id, participants, action }) => {
 console.log(`${action} in ${id}:`, participants);
});
```

</details>

<details>
<summary>AI group metadata</summary>

```javascript
// Fetch full metadata for an AI group (uses interactive query)
const meta = await sock.aiGroupMetadata('1234567890@g.us');
console.log('AI group subject:', meta.subject);
console.log('Participants:', meta.participants);
```

</details>

<details>
<summary>Add a bot to an AI group</summary>

```javascript
// Add an AI bot participant to an AI group
await sock.aiGroupAddBot('1234567890@g.us');
```

</details>

---

## 🔄 Interoperability API

WhatsApp's interoperability (interop) system allows messages to be exchanged with third-party messaging platforms. This fork exposes the full interop socket layer via `makeInteropSocket`.

**Supported integrators**

| ID | Name | Notes |
|---|---|---|
| `12` | BirdyChat | Cross-platform messaging bridge |
| `13` | Haiket | Cross-platform messaging bridge |

<details>
<summary>Fetch available integrators</summary>

```javascript
const integrators = await sock.fetchIntegrators();
/*
[
 {
 id: 12,
 name: 'BirdyChat',
 status: 'active', // 'active' | 'onboarding' | 'removed'
 identifierType: 'pn', // 'email' | 'pn' | 'username'
 optedIn: false,
 features: { groupMessaging: true }
 },
 ...
]
*/
```

</details>
<details>
<summary>Accept the interop Terms of Service</summary>

```javascript
// Must be called before opting in to any integrator
await sock.acceptInteropTOS();
```

</details>
<details>
<summary>Opt in to integrators</summary>

```javascript
// Opt in to all default integrators (BirdyChat + Haiket)
await sock.optInIntegrators();

// Opt in to specific integrators by ID
await sock.optInIntegrators([12]);
```

</details>

---

## 📡 USync Protocol

`WAUSync` is WhatsApp's batch user-info query system. This fork exports the full USync module so you can run structured queries against WhatsApp's `w:sync:user` IQ namespace.

**Available protocols**

| Protocol Class | Purpose |
|---|---|
| `USyncContactProtocol` | Resolve contact info |
| `USyncDeviceProtocol` | Fetch registered devices |
| `USyncDisappearingModeProtocol` | Get disappearing message settings |
| `USyncStatusProtocol` | Fetch user status |
| `USyncTextStatusProtocol` | Fetch a user's text status (with emoji and expiry) |
| `USyncPictureProtocol` | Fetch a user's profile picture ID/direct path |
| `USyncUsernameProtocol` | Resolve usernames |
| `UsyncBotProfileProtocol` | Fetch AI bot profile data |
| `UsyncLIDProtocol` | Resolve LID phone-number pairs |

<details>
<summary>Running a USync query</summary>

```javascript
import { USyncQuery, USyncUser } from 'toxic-baileys';

const query = new USyncQuery()
 .withContext('interactive')
 .withLIDProtocol()
 .withDeviceProtocol();

const user = new USyncUser().withPhone('254712345678@s.whatsapp.net');
query.withUser(user);

const result = await sock.executeUSyncQuery(query);
console.log(result);
```

</details>
<details>
<summary>MEX / GraphQL queries</summary>

For structured server queries, this fork exposes `executeWMexQuery` — a GraphQL-style query executor over WhatsApp's `w:mex` IQ namespace:

```javascript
import { executeWMexQuery } from 'toxic-baileys';

const result = await executeWMexQuery(
 { userId: '254712345678' }, // variables
 'xwa2_user_profile', // queryId (WhatsApp's internal query name)
 'xwa2_user_profile', // dataPath (key in the response data object)
 sock.query.bind(sock), // query function
 sock.generateMessageTag.bind(sock)
);
console.log('MEX result:', result);
```

</details>

---

## 💬 Sending Messages

### Basic Messages

<details>
<summary>Text, Reply, Mention, Forward, Edit, Delete, React</summary>

```javascript
await sock.sendMessage(jid, { text: 'Hello World!' });
await sock.sendMessage(jid, { text: 'Reply!' }, { quoted: m });
await sock.sendMessage(jid, { text: 'Hi @user!', mentions: ['254712345678@s.whatsapp.net'] });
await sock.sendMessage(jid, { forward: m });

const sent = await sock.sendMessage(jid, { text: 'Original' });
await sock.sendMessage(jid, { text: 'Edited!', edit: sent.key });
await sock.sendMessage(jid, { delete: sent.key });

await sock.sendMessage(jid, { react: { text: '', key: m.key } });
await sock.sendMessage(jid, { react: { text: '', key: m.key } }); // remove reaction
```
</details>

### Media Messages

<details>
<summary>Image, Video, Audio, Document, Sticker, View Once</summary>

```javascript
await sock.sendMessage(jid, { image: { url: './image.jpg' }, caption: 'Caption' });
await sock.sendMessage(jid, { image: fs.readFileSync('./img.jpg') });
await sock.sendMessage(jid, { video: { url: './video.mp4' }, caption: 'Video' });
await sock.sendMessage(jid, { video: { url: './animation.mp4' }, gifPlayback: true });
await sock.sendMessage(jid, { audio: { url: './voice.ogg' }, mimetype: 'audio/ogg; codecs=opus', ptt: true });
await sock.sendMessage(jid, { audio: { url: './song.mp3' }, mimetype: 'audio/mp4' });
await sock.sendMessage(jid, { document: { url: './file.pdf' }, fileName: 'MyDoc.pdf', mimetype: 'application/pdf' });
await sock.sendMessage(jid, { sticker: { url: './sticker.webp' } });
await sock.sendMessage(jid, { image: fs.readFileSync('./img.jpg'), viewOnce: true });
```
</details>

### Interactive Messages

<details>
<summary>Interactive Message with Native Flow Buttons</summary>

```javascript
// Copy button
await sock.sendMessage(jid, {
 interactiveMessage: {
 header: 'toxic-baileys™',
 title: 'Hello World',
 footer: 'By 𝐱𝐡_𝐜𝐥𝐢𝐧𝐭𝐨𝐧 ',
 buttons: [
 {
 name: 'cta_copy',
 buttonParamsJson: JSON.stringify({ display_text: 'Copy Code', id: '1', copy_code: 'TOXIC123' })
 }
 ]
 }
}, { quoted: m });

// URL button
await sock.sendMessage(jid, {
 interactiveMessage: {
 header: 'Visit Us',
 title: 'toxic-baileys',
 footer: 'GitHub',
 buttons: [
 {
 name: 'cta_url',
 buttonParamsJson: JSON.stringify({ display_text: 'Open GitHub', url: 'https://github.com/xhclintohn/Baileys' })
 }
 ]
 }
}, { quoted: m });

// With image thumbnail
await sock.sendMessage(jid, {
 interactiveMessage: {
 header: 'With Image',
 title: 'toxic-baileys™',
 footer: 'Best Baileys Fork',
 image: { url: 'https://example.com/image.jpg' },
 buttons: [
 { name: 'cta_copy', buttonParamsJson: JSON.stringify({ display_text: 'Copy', id: '1', copy_code: 'HELLO' }) }
 ]
 }
}, { quoted: m });

// Single select list
await sock.sendMessage(jid, {
 interactiveMessage: {
 header: 'Choose',
 title: 'Menu',
 footer: 'Select below',
 nativeFlowMessage: {
 buttons: [
 {
 name: 'single_select',
 buttonParamsJson: JSON.stringify({
 title: 'Options',
 sections: [
 {
 title: 'Commands',
 rows: [
 { title: 'Option 1', description: 'First', id: 'opt_1' },
 { title: 'Option 2', description: 'Second', id: 'opt_2' }
 ]
 }
 ]
 })
 }
 ]
 }
 }
}, { quoted: m });

// With externalAdReply
await sock.sendMessage(jid, {
 interactiveMessage: {
 header: 'Premium',
 title: 'toxic-baileys™',
 footer: 'By 𝐱𝐡_𝐜𝐥𝐢𝐧𝐭𝐨𝐧',
 externalAdReply: {
 title: 'toxic-baileys',
 body: 'Best WhatsApp Library',
 mediaType: 1,
 thumbnailUrl: 'https://example.com/thumb.jpg',
 sourceUrl: 'https://github.com/xhclintohn/Baileys',
 showAdAttribution: true,
 renderLargerThumbnail: true
 },
 buttons: [
 { name: 'cta_url', buttonParamsJson: JSON.stringify({ display_text: 'Visit', url: 'https://github.com/xhclintohn/Baileys' }) }
 ]
 }
}, { quoted: m });
```
</details>

<details>
<summary>sendInteractive — one call, handles iOS automatically</summary>

Interactive buttons don't render reliably when the bot account itself is paired from an iPhone. `sendInteractive` checks the paired device's platform for you and falls back to a plain text message on iOS instead of sending a button payload that won't show up right:

```javascript
await sock.sendInteractive(jid, 'Tap below to continue');

// with options
await sock.sendInteractive(jid, 'Tap below to continue', {
 title: 'Bot',
 subtitle: 'Q',
 footer: 'In-app signup',
 buttonName: 'inapp_signup',
 quoted: m
});

// same function, other names if you prefer them
await sock.inappsignup(jid, 'Tap below to continue');
await sock.inapp_signup(jid, 'Tap below to continue');
```
</details>

### Album Messages

<details>
<summary>Send multiple images/videos in a single album</summary>

```javascript
await sock.sendMessage(jid, {
 albumMessage: [
 { image: fs.readFileSync('./photo1.jpg'), caption: 'First photo' },
 { image: { url: 'https://example.com/photo2.jpg' }, caption: 'Second photo' },
 { video: fs.readFileSync('./clip.mp4'), caption: 'A video clip' }
 ]
}, { quoted: m });
```
</details>

### Event Messages

<details>
<summary>Send WhatsApp event invitations</summary>

```javascript
await sock.sendMessage(jid, {
 eventMessage: {
 isCanceled: false,
 name: 'toxic-baileys Launch',
 description: 'Join us for the launch!',
 location: { degreesLatitude: -1.2921, degreesLongitude: 36.8219, name: 'Nairobi, Kenya' },
 joinLink: 'https://call.whatsapp.com/video/your-link',
 startTime: String(Math.floor(Date.now() / 1000) + 3600),
 endTime: String(Math.floor(Date.now() / 1000) + 7200),
 extraGuestsAllowed: true
 }
}, { quoted: m });
```
</details>

### Poll & Poll Result Messages

<details>
<summary>Polls and displaying poll results</summary>

```javascript
// Create poll
await sock.sendMessage(jid, {
 poll: {
 name: 'Best WhatsApp library?',
 values: ['toxic-baileys', 'Baileys', 'Other'],
 selectableCount: 1
 }
});

// Display poll results
await sock.sendMessage(jid, {
 pollResultMessage: {
 name: 'Best Library Results',
 pollVotes: [
 { optionName: 'toxic-baileys', optionVoteCount: '42' },
 { optionName: 'Baileys', optionVoteCount: '10' },
 { optionName: 'Other', optionVoteCount: '2' }
 ]
 }
}, { quoted: m });
```
</details>

### Group Status Messages

<details>
<summary>Post status/story to a group (Group Status V2)</summary>

There are two ways to post a group status. `toxicHandler` gives you a `groupStatusMessage` wrapper that takes care of the details for you:

```javascript
await sock.sendMessage(groupJid, { groupStatusMessage: { text: 'Hello group! ' } });
await sock.sendMessage(groupJid, { groupStatusMessage: { image: fs.readFileSync('./banner.jpg'), caption: 'Update!' } });
await sock.sendMessage(groupJid, { groupStatusMessage: { video: fs.readFileSync('./promo.mp4'), caption: 'Promo' } });
await sock.sendMessage(groupJid, { groupStatusMessage: { audio: fs.readFileSync('./audio.mp4'), mimetype: 'audio/mp4' } });

// Using ToxicHandler directly (exposed on socket)
const storyResult = await sock.toxicHandler.handleGroupStory(content, groupJid, quotedMsg);
```

Or send a regular media/text message with the status `contextInfo` set directly — this is what you'll want if you're building a command like `.gstatus` that reposts whatever a user replies with:

```javascript
const buffer = await downloadMediaMessage(quotedImageMessage, 'buffer');

await sock.sendMessage(groupJid, {
 image: buffer,
 caption: 'Update!',
 contextInfo: {
 isGroupStatus: true,
 statusSourceType: 'IMAGE', // IMAGE | VIDEO | GIF | AUDIO | TEXT | MUSIC_STANDALONE
 statusAttributions: [{ type: 10 }],
 statusAudienceMetadata: { audienceType: 'CLOSE_FRIENDS' }
 }
});

// Same idea for video, audio, or plain text — just swap the content key
await sock.sendMessage(groupJid, {
 text: 'Check out this update!',
 contextInfo: {
 isGroupStatus: true,
 statusSourceType: 'TEXT',
 statusAttributions: [{ type: 10 }],
 statusAudienceMetadata: { audienceType: 'CLOSE_FRIENDS' }
 }
});
```
</details>

<details>
<summary>Post your own status to groups and private contacts</summary>

`sendStatusMention` posts a status (story) from your own account and builds the audience for you: pass group JIDs and it expands them to their participants, pass user JIDs and they are added directly. Works for text, image, video and audio (voice-note style) statuses.

```javascript
// Text status seen by a whole group + one private contact
await sock.sendStatusMention({ text: 'New update is live!' }, [groupJid, '2547xxxxxxxx@s.whatsapp.net']);

// Image status
await sock.sendStatusMention({ image: fs.readFileSync('./banner.jpg'), caption: 'Promo' }, [groupJid]);

// Audio status (voice note style)
await sock.sendStatusMention({ audio: fs.readFileSync('./note.mp3') }, [groupJid]);
```

For full manual control you can also send to `status@broadcast` yourself and pass `statusJidList` in the message options to choose exactly who receives it.
</details>

### Payment Request Messages

<details>
<summary>Send payment requests</summary>

```javascript
await sock.sendMessage(jid, {
 requestPaymentMessage: {
 currency: 'KES',
 amount: 500000,
 from: m.sender,
 background: { id: 'DEFAULT', placeholderArgb: 0xFFF0F0F0 }
 }
}, { quoted: m });
```
</details>

### Product Messages

<details>
<summary>Send product catalog messages</summary>

```javascript
await sock.sendMessage(jid, {
 productMessage: {
 title: 'Premium Script',
 description: 'Best bot script available',
 thumbnail: { url: 'https://example.com/product.jpg' },
 productId: 'PROD001',
 retailerId: 'xhclinton',
 url: 'https://github.com/xhclintohn/Baileys',
 body: 'Full featured automation',
 footer: 'Special price',
 priceAmount1000: 10000,
 currencyCode: 'USD',
 buttons: [{ name: 'cta_url', buttonParamsJson: JSON.stringify({ display_text: 'Buy Now', url: 'https://github.com/xhclintohn/Baileys' }) }]
 }
}, { quoted: m });
```
</details>

### Button & Template Messages

<details>
<summary>Classic buttons, list messages, template buttons</summary>

```javascript
// Classic buttons
await sock.sendMessage(jid, {
 text: 'Choose:',
 footer: 'toxic-baileys™',
 buttons: [
 { buttonId: 'btn_1', buttonText: { displayText: 'Option 1' }, type: 1 },
 { buttonId: 'btn_2', buttonText: { displayText: 'Option 2' }, type: 1 }
 ],
 headerType: 1
});

// List message
await sock.sendMessage(jid, {
 text: 'Pick one:',
 footer: 'toxic-baileys™',
 title: 'Menu',
 buttonText: 'Open List',
 sections: [
 {
 title: 'Section 1',
 rows: [
 { title: 'Item 1', rowId: 'row_1', description: 'Description 1' },
 { title: 'Item 2', rowId: 'row_2', description: 'Description 2' }
 ]
 }
 ]
});
```
</details>

---

## 🧩 Rich Message Builders

The `WABuilder` module ships as part of the package now — `Button`, `ButtonV2`, `Carousel`, `AIRich`, and `Toolkit`. Each builder takes your socket instance and gives you a chainable API instead of hand-writing raw message payloads.

Every class is also exported under a few shorter names, in case you'd rather import it as something else:

```javascript
import { AIRich, RichMessage, Rich, RichMsg, RichAI } from 'toxic-baileys'; // all the same class
import { Button, Buttons, Btns } from 'toxic-baileys'; // all the same class
import { ButtonV2, ButtonsV2, BtnsV2, NewButtons } from 'toxic-baileys'; // all the same class
```

<details>
<summary>Button — media + button rows</summary>

```javascript
import { Button } from 'toxic-baileys';

const btn = new Button(sock)
 .setTitle('Choose an option')
 .setBody('Pick one of the buttons below')
 .setFooter('Powered by toxic-baileys')
 .setImage('./banner.jpg')
 .addReply('Option A', 'opt_a')
 .addReply('Option B', 'opt_b')
 .addUrl('Visit site', 'https://example.com');

await btn.send(jid);
```
</details>

<details>
<summary>ButtonV2 — native interactive buttons</summary>

```javascript
import { ButtonV2 } from 'toxic-baileys';

const btn = new ButtonV2(sock)
 .setBody('Native button layout')
 .addButton('Click me', 'click_id');

await btn.send(jid);
```
</details>

<details>
<summary>Carousel — swipeable cards</summary>

```javascript
import { Carousel } from 'toxic-baileys';

const carousel = new Carousel(sock);
// build cards via the card API, then:
await carousel.send(jid);
```
</details>

<details>
<summary>AIRich — Meta AI-style rich responses</summary>

Builds the same rich response format Meta AI uses in WhatsApp: text with inline citations/hyperlinks/LaTeX, code blocks, tables, and source lists, all rendered as one message.

```javascript
import { AIRich } from 'toxic-baileys';

const reply = new AIRich(sock)
 .setTitle('Answer')
 .addText('Here is your answer, with a [source](https://example.com) cited inline.')
 .addCode('javascript', 'console.log("hello world")')
 .addTable([
 ['Name', 'Value'],
 ['foo', '123']
 ]);

await reply.send(jid, { quoted: m });
```

`Toolkit` is the set of static helpers `AIRich` and the other builders use internally (`Toolkit.resize`, `Toolkit.fetchBuffer`, `Toolkit.resolveMedia`, `Toolkit.getMp4Preview`, etc.) — useful on their own if you're building custom payloads.

Image resizing goes through `sharp` and video thumbnail extraction through `fluent-ffmpeg`, both optional — if they're not installed, those specific features fall back gracefully instead of throwing.
</details>

---

## 📨 Chat & Message Management

<details>
<summary>Read receipts, archive, pin, delete, star</summary>

```javascript
await sock.readMessages([m.key]);
await sock.sendReadReceipt(jid, participant, [m.key.id]);
await sock.chatModify({ archive: true, lastMessages: [{ key: m.key, messageTimestamp: m.messageTimestamp }] }, jid);
await sock.chatModify({ pin: true }, jid);
await sock.chatModify({ delete: true, lastMessages: [{ key: m.key, messageTimestamp: m.messageTimestamp }] }, jid);
await sock.chatModify({ star: { messages: [{ id: m.key.id, fromMe: m.key.fromMe }], star: true } }, jid);
await sock.sendMessage(jid, { delete: m.key });
```
</details>

---

## 👥 Group Management

<details>
<summary>Create, modify, manage participants</summary>

```javascript
const group = await sock.groupCreate('Group Name', ['254712345678@s.whatsapp.net']);
await sock.groupParticipantsUpdate(jid, ['254712345678@s.whatsapp.net'], 'add');
await sock.groupParticipantsUpdate(jid, ['254712345678@s.whatsapp.net'], 'remove');
await sock.groupParticipantsUpdate(jid, ['254712345678@s.whatsapp.net'], 'promote');
await sock.groupParticipantsUpdate(jid, ['254712345678@s.whatsapp.net'], 'demote');
await sock.groupUpdateSubject(jid, 'New Name');
await sock.groupUpdateDescription(jid, 'New description');
await sock.groupSettingUpdate(jid, 'announcement');
await sock.groupSettingUpdate(jid, 'not_announcement');
await sock.groupSettingUpdate(jid, 'locked');
await sock.groupSettingUpdate(jid, 'unlocked');
await sock.groupLeave(jid);
const inviteCode = await sock.groupInviteCode(jid);
const meta = await sock.groupMetadata(jid);
const all = await sock.groupFetchAllParticipating();
```
</details>

---

## 👤 User & Profile Management

<details>
<summary>Profile photo, status, presence</summary>

```javascript
await sock.updateProfilePicture(jid, { url: './avatar.jpg' });
await sock.removeProfilePicture(jid);
const pp = await sock.profilePictureUrl(jid, 'image');
await sock.updateProfileStatus('Hey there! I am using toxic-baileys™');
await sock.updateProfileName('My Bot Name');
await sock.fetchStatus(jid);
const exists = await sock.onWhatsApp('254712345678@s.whatsapp.net');
await sock.sendPresenceUpdate('available', jid);
await sock.sendPresenceUpdate('composing', jid);
await sock.sendPresenceUpdate('recording', jid);
await sock.sendPresenceUpdate('paused', jid);
```
</details>

---

## 🏷️ Username Management

WhatsApp usernames (the `@username` handles, separate from phone numbers) — checking availability, claiming one, and looking people up by theirs.

<details>
<summary>Set and manage your own username</summary>

```javascript
// Check if a username is free before you try to claim it
const check = await sock.checkUsername('my_bot_name');
if (check.available) {
 await sock.setUsername('my_bot_name');
} else {
 console.log('Taken. Suggestions:', check.suggestions);
}

// Read it back
const current = await sock.getMyUsername();

// Protect it with a PIN
await sock.setUsernamePin('1234');
await sock.setUsernamePin(null); // remove the PIN

// Give it up
await sock.deleteUsername();

// Get suggestions without checking a specific name first
const recs = await sock.getUsernameRecommendations();
```
</details>

<details>
<summary>Look people up by username</summary>

```javascript
// Resolve a username to a JID
const user = await sock.findUserByUsername('someone_cool');
if (user) {
 console.log(user.jid);
}

// Batch-fetch usernames for JIDs you already have
const results = await sock.fetchContactUsernames(jid1, jid2, jid3);

// Check several usernames for availability at once
const results2 = await sock.checkUsernameMulti(['name_one', 'name_two']);
```
</details>

<details>
<summary>Fetch a username or text status via USync directly</summary>

```javascript
import { USyncQuery, USyncUser } from 'toxic-baileys';

const query = new USyncQuery()
 .withUsernameProtocol()
 .withTextStatusProtocol()
 .withUser(new USyncUser().withId(jid));

const result = await sock.executeUSyncQuery(query);
console.log(result?.list[0]);
```
</details>

---

## 📰 Newsletter / Channel Management

<details>
<summary>Create, follow, manage newsletters and channels</summary>

```javascript
import { newsletterId } from 'toxic-baileys';

// Follow a channel
await sock.newsletterFollow('1234567890@newsletter');

// Unfollow
await sock.newsletterUnfollow('1234567890@newsletter');

// Fetch channel metadata
const meta = await sock.newsletterMetadata('invite', 'your-invite-link');
console.log(meta.id, meta.name, meta.subscribers);

// Create a channel
const channel = await sock.newsletterCreate('Channel Name', { description: 'My channel' });

// Send a message to your channel
await sock.sendMessage('1234567890@newsletter', { text: 'Channel update!' });

// newsletterId() helper — extract clean ID from any format
const cleanId = newsletterId('1234567890@newsletter');
const cleanIdFromLink = newsletterId('https://whatsapp.com/channel/yourlink');
console.log('Clean ID:', cleanId);

// Mute/unmute
await sock.newsletterMute('1234567890@newsletter');
await sock.newsletterUnmute('1234567890@newsletter');
```
</details>

---

## 🔒 Privacy & Block Management

<details>
<summary>Privacy settings and block list</summary>

```javascript
await sock.updateProfilePicturePrivacy('contacts'); // 'all' | 'contacts' | 'contact_blacklist' | 'none'
await sock.updateStatusPrivacy('contacts');
await sock.updateReadReceiptsPrivacy('all'); // 'all' | 'none'
await sock.updateGroupsAddPrivacy('contacts');
await sock.updateLastSeenPrivacy('contacts');
await sock.updateOnlinePrivacy('all');

const privacy = await sock.fetchPrivacySettings(true);

await sock.updateBlockStatus(jid, 'block');
await sock.updateBlockStatus(jid, 'unblock');
const blocked = await sock.fetchBlocklist();
```
</details>

---

## 🗄️ Data Store Implementation

<details>
<summary>In-Memory Store (Development)</summary>

```javascript
import makeWASocket, { makeInMemoryStore } from 'toxic-baileys';

const store = makeInMemoryStore({ logger: console });
store.readFromFile('./baileys_store.json');
setInterval(() => store.writeToFile('./baileys_store.json'), 10_000);

const sock = makeWASocket({});
store.bind(sock.ev);
```
</details>

<details>
<summary>Using ToxicHandler Directly</summary>

```javascript
// ToxicHandler and toxicHandler are both exposed on the socket
const { toxicHandler } = sock;

const paymentContent = await toxicHandler.handlePayment(content, quoted);
const interactive = await toxicHandler.handleInteractive(content, jid, quoted);
const album = await toxicHandler.handleAlbum(content, jid, quoted);
const event = await toxicHandler.handleEvent(content, jid, quoted);
const pollResult = await toxicHandler.handlePollResult(content, jid, quoted);
const groupStory = await toxicHandler.handleGroupStory(content, jid, quoted);
```
</details>

---

## 🛠️ Utility Functions

<details>
<summary>Core Utilities</summary>

```javascript
import {
 getContentType, areJidsSameUser, isJidGroup, isJidBroadcast,
 isJidStatusBroadcast, isJidNewsLetter, jidNormalizedUser,
 isLidUser, isPnUser, isHostedPnUser,
 generateMessageID, generateMessageIDV2, generateWAMessage,
 generateWAMessageContent, generateWAMessageFromContent,
 downloadContentFromMessage, getAggregateVotesInPollMessage,
 extractMessageContent, normalizeMessageContent, newsletterId,
 proto
} from 'toxic-baileys';

const type = getContentType(m.message);
console.log(isJidGroup('123@g.us')); // true
console.log(isJidNewsLetter('123@newsletter')); // true
console.log(isLidUser('12345@lid')); // true

// Extract clean newsletter ID
const id = newsletterId('https://whatsapp.com/channel/mylink');

// Download media
const stream = await downloadContentFromMessage(m.message.imageMessage, 'image');
const chunks = [];
for await (const chunk of stream) chunks.push(chunk);
const buffer = Buffer.concat(chunks);

// Override the media host if you're routing through your own proxy/CDN
const proxied = await downloadContentFromMessage(m.message.imageMessage, 'image', {
 host: 'my-media-proxy.example.com'
});

// Aggregate poll votes
const votes = getAggregateVotesInPollMessage(
 { message: pollMsg.message, pollUpdates },
 sock.user.id
);
```
</details>

---

## ✅ Best Practices & Tips
A few things that will save you headaches down the road

### Connection Stability
1. Always implement reconnect logic on `connection === 'close'`
2. Cache group metadata using `cachedGroupMetadata`
3. Use `markOnlineOnConnect: false` to still receive phone notifications
4. Set `syncFullHistory: true` for complete history
5. If you're spinning up a fresh socket after a logout instead of reconnecting, drop the old `sock.ev` reference — it clears its own timers and listeners once the socket ends, so you don't need to null it out manually

### LID Mapping
1. Always preserve `lid-mapping-*` files in session cleanup routines
2. Listen to the `lid-mapping.update` event to keep your in-memory cache warm
3. Fall back to group metadata scan only when all cache/store lookups fail
4. Use `sock.user?.lid` to access your own bot's LID identity

### Performance
1. Use `@cacheable/node-cache` for group metadata caching
2. Implement a message queue with rate limiting for bulk sends
3. Use databases instead of in-memory store for production

<details>
<summary>Auto-reconnect pattern</summary>

```javascript
async function connectWithRetry(maxRetries = 10) {
 let attempt = 0;
 const connect = async () => {
 attempt++;
 try {
 const { state, saveCreds } = await useMultiFileAuthState('./auth');
 const sock = makeWASocket({ auth: state });
 sock.ev.on('creds.update', saveCreds);
 sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
 if (connection === 'close') {
 const code = lastDisconnect?.error?.output?.statusCode;
 if (code === DisconnectReason.loggedOut) return;
 const delay = Math.min(5000 * attempt, 60000);
 if (attempt < maxRetries) setTimeout(connect, delay);
 } else if (connection === 'open') {
 attempt = 0;
 }
 });
 } catch (err) {
 if (attempt < maxRetries) setTimeout(connect, 5000 * attempt);
 }
 };
 await connect();
}
```
</details>

<details>
<summary>Message queue with rate limiting</summary>

```javascript
class MessageQueue {
 constructor(sock, delayMs = 1000) {
 this.sock = sock;
 this.queue = [];
 this.processing = false;
 this.delayMs = delayMs;
 }
 async add(jid, content, options = {}) {
 this.queue.push({ jid, content, options });
 if (!this.processing) this._process();
 }
 async _process() {
 this.processing = true;
 while (this.queue.length > 0) {
 const { jid, content, options } = this.queue.shift();
 try {
 await this.sock.sendMessage(jid, content, options);
 await new Promise(r => setTimeout(r, this.delayMs));
 } catch (err) {
 console.error('Send failed:', err.message);
 }
 }
 this.processing = false;
 }
}

const queue = new MessageQueue(sock, 1500);
await queue.add(jid, { text: 'Message 1' });
await queue.add(jid, { text: 'Message 2' });
```
</details>

---

## ⚖️ Important Legal Notice

This project is **NOT** affiliated with, authorized, maintained, sponsored, or endorsed by WhatsApp LLC or any of its affiliates.

- Only message users who have explicitly consented
- Do NOT use for spamming, bulk unsolicited messaging, or harassment
- Respect WhatsApp's Terms of Service and rate limits
- The maintainer assumes NO liability for misuse or damages

---

## 🆘 Getting Help

1. **GitHub Issues** — [github.com/xhclintohn/Baileys/issues](https://github.com/xhclintohn/Baileys/issues)
2. **Response Time** — Typically within 24–48 hours

<div align="center">

[![WhatsApp Chat](https://img.shields.io/badge/WhatsApp-Chat_with_Me-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)](https://wa.me/254114885159)
[![GitHub Follow](https://img.shields.io/badge/GitHub-Follow_@xhclintohn-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/xhclintohn)

</div>

---

## 📄 License

MIT License. See [LICENSE](LICENSE) for details.

**Credits:** Original Baileys by [WhiskeySockets](https://github.com/WhiskeySockets/Baileys) · toxic-baileys enhancements by **𝐱𝐡_𝐜𝐥𝐢𝐧𝐭𝐨𝐧 **

---

<div align="center">

 **toxic-baileys** — built by **xh_clinton**

*The most powerful WhatsApp automation toolkit*

 Star the repository if this helped you!

</div>
