# toxic-baileys™ ⭐

<div align="center">

[![npm version](https://img.shields.io/npm/v/toxic-baileys.svg?style=for-the-badge)](https://www.npmjs.com/package/toxic-baileys)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)
[![npm downloads](https://img.shields.io/npm/dm/toxic-baileys.svg?style=for-the-badge)](https://www.npmjs.com/package/toxic-baileys)
[![GitHub](https://img.shields.io/badge/GitHub-Repository-blue?style=for-the-badge&logo=github)](https://github.com/xhclintohn/Baileys)
[![Node](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen?style=for-the-badge)](https://nodejs.org)

</div>

A professionally enhanced, feature-rich fork of the Baileys WhatsApp Web API. Built for developers who need robust, stable WhatsApp automation with LID identity mapping, AI group support, interoperability, extended message types, and improved connection handling.

**Maintainer:** 𝐱𝐡_𝐜𝐥𝐢𝐧𝐭𝐨𝐧 ✓

---

> [!IMPORTANT]
> ### 🆔 LID Mapping — Critical Feature in This Fork
> WhatsApp has rolled out **Linked Identity (LID)** JIDs as part of its cross-platform interoperability initiative. Group messages and status updates now arrive with `@lid` domain JIDs instead of standard `@s.whatsapp.net` phone-number JIDs. **Without LID resolution, you cannot identify who sent a message in many groups.**
>
> This fork ships a complete `LIDMappingStore` (bidirectional LRU cache + persistent key store) and `UsyncLIDProtocol` so your bot always knows the real phone number behind every `@lid` JID. See the **[🆔 LID Mapping System](#-lid-mapping-system)** section for full integration details.

---

## 📋 Table of Contents

- [🆕 What's New](#-whats-new)
- [✨ Features](#-features)
- [📦 Installation](#-installation)
- [🚀 Quick Start](#-quick-start)
- [🔌 Connection & Configuration](#-connection--configuration)
- [💾 Authentication State Management](#-authentication-state-management)
- [🆔 LID Mapping System](#-lid-mapping-system)
- [🤖 AI Groups](#-ai-groups)
- [🔗 Interoperability API](#-interoperability-api)
- [🔄 USync Protocol](#-usync-protocol)
- [📤 Sending Messages](#-sending-messages)
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
- [📁 Chat & Message Management](#-chat--message-management)
- [👥 Group Management](#-group-management)
- [👤 User & Profile Management](#-user--profile-management)
- [📡 Newsletter / Channel Management](#-newsletter--channel-management)
- [🔒 Privacy & Block Management](#-privacy--block-management)
- [🗄️ Data Store Implementation](#️-data-store-implementation)
- [🛠️ Utility Functions](#️-utility-functions)
- [💡 Best Practices & Tips](#-best-practices--tips)
- [⚠️ Important Legal Notice](#️-important-legal-notice)
- [🆘 Getting Help](#-getting-help)
- [📄 License](#-license)

---

## 🆕 What's New

### v1.1.0 — Latest Update

| Change | Details |
|---|---|
| 🔗 **Companion QR Data** | QR now includes companion platform type for better device recognition (`buildPairingQRData`) |
| 🖥️ **Platform ID Fix** | `getCompanionPlatformId` replaces old `getPlatformId` — now correctly maps browser type for companion registration |
| 🔌 **Socket End Handlers** | `registerSocketEndHandler` API — register cleanup callbacks that run on disconnect |
| 🛑 **Account Restriction API** | `fetchAccountReachoutTimelock()` — check if account is restricted from sending messages |
| 📊 **Message Cap API** | `fetchNewChatMessageCap()` — check your new chat message quota and usage |
| 🗂️ **Mex Types** | `XWAPaths`, `QueryIds`, `ReachoutTimelockEnforcementType`, `NewChatMessageCapInfo` and related enums exported |
| 💾 **`ev.destroy()` on Close** | Event emitter properly cleaned up when socket closes |
| 🔁 **Pre-key Upload Fix** | Cleaner retry logic — upload deduplication via in-flight promise, server drives upload timing |
| 📰 **Newsletter Join/Leave** | Fixed endpoint paths to `xwa2_newsletter_join_v2` / `xwa2_newsletter_leave_v2` |
| 👥 **Group Metadata Error Handling** | `groupMetadata` now surfaces proper WA server errors instead of crashing |
| 💿 **Album contextInfo** | Album messages now correctly pass `contextInfo` and `userJid` to each item |
| 🧹 **ToxicHandler Cleanup** | Removed stale fallback chains, constructor simplified, cleaner code |

### All Previous Features

Compared to upstream Baileys, this fork adds:

| Feature | Description |
|---|---|
| 🆔 **LID Mapping System** | Full `LIDMappingStore` with LRU cache, persistent key store, bidirectional lookups, and `UsyncLIDProtocol` |
| 🤖 **AI Groups** | `makeAIGroupsSocket` — create, manage, and receive events for WhatsApp AI-powered groups |
| 🔗 **Interoperability API** | `makeInteropSocket` — fetch third-party integrators, accept Interop TOS, opt in/out |
| 📡 **USync Protocol Layer** | Full `WAUSync` module: LID, Contact, Device, Disappearing Mode, Status, Username, Bot Profile protocols |
| 🔎 **MEX / GraphQL Queries** | `executeWMexQuery` for structured WhatsApp server queries via the `w:mex` IQ namespace |
| 🗝️ **`me.lid` Credential** | Bot's own LID identity stored in credentials on pairing via `configureSuccessfulPairing` |
| 📌 **`lidDbMigrated` Login Flag** | Signals to WhatsApp to push down LID mappings on connect |
| 📺 **Group Status V2** | `ToxicHandler` exposed on socket for rich group story/status management |
| 🔧 **`SignalRepositoryWithLIDStore`** | Extended signal repository type that exposes `lidMapping` directly on the socket |
| 📣 **`newsletterId()` Helper** | Utility to extract a clean newsletter/channel ID from any JID format |

---

## ✨ Features

- 🚀 **Modern & Fast** — Latest WA version `[2,3000,1035194821]`, optimised pre-key upload (812 keys)
- 🆔 **Full LID Identity Resolution** — Bidirectional LID↔PN mapping with LRU cache, USync lookup, and persistent storage
- 🤖 **AI Groups Support** — Create and manage WhatsApp's AI-powered group type
- 🔗 **Cross-Platform Interop** — Third-party integrator management (BirdyChat, Haiket, and more)
- 🔧 **Enhanced Stability** — Improved connection handling, socket end handlers, `ev.destroy()` on close, cleaner pre-key retry logic
- 📱 **Multi-Device Support** — Full WhatsApp multi-device protocol with improved `historySyncConfig`
- 🔐 **End-to-End Encryption** — Signal Protocol, `inlineInitialPayloadInE2EeMsg: true`
- 📨 **Extended Message Types** — Interactive, album, event, poll result, group status, payment, product
- 👥 **Advanced Group Management** — Group controls, group status V2, communities support
- 💾 **Flexible Auth** — Multi-file auth state with `makeCacheableSignalKeyStore`
- 📡 **Full Newsletter/Channel API** — Follow, create, metadata, `newsletterId()` helper, fixed join/leave v2 endpoints
- 🛠️ **Developer Friendly** — `toxicHandler` and `ToxicHandler` exposed on socket, `fetchAccountReachoutTimelock`, `fetchNewChatMessageCap`, `registerSocketEndHandler`, clean API
- 🌐 **WebSocket Improvements** — `perMessageDeflate: false`, 100 MB max payload

---

## 📦 Installation

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

<details>
<summary>Basic Connection (QR Code)</summary>

```javascript
import makeWASocket, { useMultiFileAuthState, DisconnectReason } from 'toxic-baileys';
import { Boom } from '@hapi/boom';

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const sock = makeWASocket({ auth: state, printQRInTerminal: true });

    sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
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

    sock.ev.on('creds.update', saveCreds);
}

connectToWhatsApp().catch(console.error);
```
</details>

<details>
<summary>Pairing Code (no QR)</summary>

```javascript
import makeWASocket, { useMultiFileAuthState } from 'toxic-baileys';

async function connectWithPairing() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const sock = makeWASocket({ auth: state, printQRInTerminal: false });
    sock.ev.on('creds.update', saveCreds);

    if (!sock.authState.creds.registered) {
        const phoneNumber = '254712345678'; // no + or spaces
        const code = await sock.requestPairingCode(phoneNumber);
        console.log('Pairing Code:', code);
    }
}

connectWithPairing().catch(console.error);
```
</details>

---

## 🔌 Connection & Configuration

<details>
<summary>Full Socket Configuration</summary>

```javascript
import makeWASocket, { Browsers, makeCacheableSignalKeyStore } from 'toxic-baileys';
import NodeCache from '@cacheable/node-cache';

const groupCache = new NodeCache({ stdTTL: 300, useClones: false });

const sock = makeWASocket({
    browser: Browsers.macOS('Chrome'),
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

## 💾 Authentication State Management

<details>
<summary>Multi-File Auth (Development)</summary>

```javascript
import makeWASocket, { useMultiFileAuthState } from 'toxic-baileys';

const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
const sock = makeWASocket({ auth: state });
sock.ev.on('creds.update', saveCreds);
```
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

### What is a LID?

A **Linked Identity (LID)** is an opaque numeric identifier assigned to each WhatsApp account in the `@lid` domain. WhatsApp uses LIDs in groups to decouple a person's phone number from their group identity. The LID is stable across phone number changes and is used for the Signal encryption protocol in newer group types.

```
Standard JID:  254712345678@s.whatsapp.net  ← phone number visible
LID JID:       9876543210:0@lid             ← opaque — phone number hidden
```

### How the Mapping Store Works

This fork implements `LIDMappingStore` in `src/Signal/lid-mapping.ts`:

```
┌─────────────────────────────────────────────────────┐
│                  LIDMappingStore                     │
│                                                     │
│  LRU Cache (3-day TTL, auto-purge)                  │
│    pn:{pnUser}  →  lidUser                          │
│    lid:{lidUser} →  pnUser                          │
│         ↕                                           │
│  SignalKeyStoreWithTransaction                      │
│    lid-mapping/{pnUser}          → lidUser          │
│    lid-mapping/{lidUser}_reverse → pnUser           │
│         ↕                                           │
│  USync Lookup (UsyncLIDProtocol)                    │
│    Query WhatsApp servers via w:sync IQ             │
└─────────────────────────────────────────────────────┘
```

**Persistent file naming** (with `useMultiFileAuthState`):
```
Session/
  lid-mapping-{pnUser}.json           ← pnUser → lidUser
  lid-mapping-{lidUser}_reverse.json  ← lidUser → pnUser  (reverse lookup)
```

### `me.lid` — Your Bot's Own LID

When your bot pairs with WhatsApp, its own LID is stored in the session credentials:

```javascript
// Stored automatically by configureSuccessfulPairing()
// Access it any time after connecting:
const myLid = sock.user?.lid;
console.log('My LID:', myLid); // e.g. "9876543210@lid"
```

### `lidDbMigrated` Login Flag

The login payload includes `lidDbMigrated: false`. This signals to WhatsApp that the client has not yet migrated its local LID database, which causes WhatsApp to push down a full set of LID↔PN mappings on the initial connection — seeding your local store automatically.

### API Reference

```typescript
// On the socket (via SignalRepositoryWithLIDStore):
sock.signalRepository.lidMapping.getPNForLID(lidJid)         // string | null
sock.signalRepository.lidMapping.getLIDForPN(pnJid)          // string | null
sock.signalRepository.lidMapping.getPNsForLIDs(lidJids[])    // LIDMapping[] | null
sock.signalRepository.lidMapping.getLIDsForPNs(pnJids[])     // LIDMapping[] | null
sock.signalRepository.lidMapping.storeLIDPNMappings(pairs[]) // void

// Type:
type LIDMapping = { lid: string; pn: string }
```

### Live Integration Example

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
            console.log(`LID ${sender} → ${resolved ?? 'unknown'}`);
        }
    }
});
```

### Multi-Layer Resolution (Recommended Pattern)

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

> [!NOTE]
> **Session file cleanup warning:** If your bot cleans up session files periodically, make sure `lid-mapping-*` files are preserved in your keep-list, or your mapping cache will be lost on restart and need to be re-fetched from WhatsApp's servers.

---

## 🤖 AI Groups

WhatsApp introduced AI-powered groups — special group types that include an AI bot participant. This fork exposes full management of these groups via `makeAIGroupsSocket` (which is included in the socket chain automatically).

### Socket Chain

```
makeWASocket
  └─ makeInteropSocket
       └─ makeAIGroupsSocket
            └─ makeCommunitiesSocket
                 └─ makeGroupsSocket
                      └─ ...
```

### AI Group Events

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

### AI Group Metadata

```javascript
// Fetch full metadata for an AI group (uses interactive query)
const meta = await sock.aiGroupMetadata('1234567890@g.us');
console.log('AI group subject:', meta.subject);
console.log('Participants:', meta.participants);
```

### Add Bot to AI Group

```javascript
// Add an AI bot participant to an AI group
await sock.aiGroupAddBot('1234567890@g.us');
```

---

## 🔗 Interoperability API

WhatsApp's interoperability (interop) system allows messages to be exchanged with third-party messaging platforms. This fork exposes the full interop socket layer via `makeInteropSocket`.

### Supported Integrators

| ID | Name | Notes |
|---|---|---|
| `12` | BirdyChat | Cross-platform messaging bridge |
| `13` | Haiket | Cross-platform messaging bridge |

### Fetch Available Integrators

```javascript
const integrators = await sock.fetchIntegrators();
/*
[
  {
    id: 12,
    name: 'BirdyChat',
    status: 'active',         // 'active' | 'onboarding' | 'removed'
    identifierType: 'pn',     // 'email' | 'pn' | 'username'
    optedIn: false,
    features: { groupMessaging: true }
  },
  ...
]
*/
```

### Accept Interop Terms of Service

```javascript
// Must be called before opting in to any integrator
await sock.acceptInteropTOS();
```

### Opt In to Integrators

```javascript
// Opt in to all default integrators (BirdyChat + Haiket)
await sock.optInIntegrators();

// Opt in to specific integrators by ID
await sock.optInIntegrators([12]);
```

---

## 🔄 USync Protocol

`WAUSync` is WhatsApp's batch user-info query system. This fork exports the full USync module so you can run structured queries against WhatsApp's `w:sync:user` IQ namespace.

### Available Protocols

| Protocol Class | Purpose |
|---|---|
| `USyncContactProtocol` | Resolve contact info |
| `USyncDeviceProtocol` | Fetch registered devices |
| `USyncDisappearingModeProtocol` | Get disappearing message settings |
| `USyncStatusProtocol` | Fetch user status |
| `USyncUsernameProtocol` | Resolve usernames |
| `UsyncBotProfileProtocol` | Fetch AI bot profile data |
| `UsyncLIDProtocol` | Resolve LID ↔ phone-number pairs |

### Running a USync Query

```javascript
import { USyncQuery, USyncUser, UsyncLIDProtocol, USyncDeviceProtocol } from 'toxic-baileys';

const query = new USyncQuery();
query.withContext('interactive');
query.withProtocol(new UsyncLIDProtocol());
query.withProtocol(new USyncDeviceProtocol());

const user = new USyncUser();
user.withPhone('254712345678@s.whatsapp.net');
query.withUser(user);

const result = await sock.executeUSyncRequest(query);
console.log(result);
```

### MEX / GraphQL Queries

For structured server queries, this fork exposes `executeWMexQuery` — a GraphQL-style query executor over WhatsApp's `w:mex` IQ namespace:

```javascript
import { executeWMexQuery } from 'toxic-baileys';

const result = await executeWMexQuery(
    { userId: '254712345678' },   // variables
    'xwa2_user_profile',          // queryId (WhatsApp's internal query name)
    'xwa2_user_profile',          // dataPath (key in the response data object)
    sock.query.bind(sock),        // query function
    sock.generateMessageTag.bind(sock)
);
console.log('MEX result:', result);
```

---

## 📤 Sending Messages

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

await sock.sendMessage(jid, { react: { text: '🔥', key: m.key } });
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
        footer: 'By 𝐱𝐡_𝐜𝐥𝐢𝐧𝐭𝐨𝐧 ✓',
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

```javascript
await sock.sendMessage(groupJid, { groupStatusMessage: { text: 'Hello group! 👋' } });
await sock.sendMessage(groupJid, { groupStatusMessage: { image: fs.readFileSync('./banner.jpg'), caption: 'Update!' } });
await sock.sendMessage(groupJid, { groupStatusMessage: { video: fs.readFileSync('./promo.mp4'), caption: 'Promo' } });
await sock.sendMessage(groupJid, { groupStatusMessage: { audio: fs.readFileSync('./audio.mp4'), mimetype: 'audio/mp4' } });

// Using ToxicHandler directly (exposed on socket)
const storyResult = await sock.toxicHandler.handleGroupStory(content, groupJid, quotedMsg);
```
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

## 📁 Chat & Message Management

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

## 📡 Newsletter / Channel Management

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
await sock.updateProfilePicturePrivacy('contacts');   // 'all' | 'contacts' | 'contact_blacklist' | 'none'
await sock.updateStatusPrivacy('contacts');
await sock.updateReadReceiptsPrivacy('all');           // 'all' | 'none'
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

const paymentContent  = await toxicHandler.handlePayment(content, quoted);
const interactive     = await toxicHandler.handleInteractive(content, jid, quoted);
const album           = await toxicHandler.handleAlbum(content, jid, quoted);
const event           = await toxicHandler.handleEvent(content, jid, quoted);
const pollResult      = await toxicHandler.handlePollResult(content, jid, quoted);
const groupStory      = await toxicHandler.handleGroupStory(content, jid, quoted);
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
console.log(isJidGroup('123@g.us'));           // true
console.log(isJidNewsLetter('123@newsletter')); // true
console.log(isLidUser('12345@lid'));            // true

// Extract clean newsletter ID
const id = newsletterId('https://whatsapp.com/channel/mylink');

// Download media
const stream = await downloadContentFromMessage(m.message.imageMessage, 'image');
const chunks = [];
for await (const chunk of stream) chunks.push(chunk);
const buffer = Buffer.concat(chunks);

// Aggregate poll votes
const votes = getAggregateVotesInPollMessage(
    { message: pollMsg.message, pollUpdates },
    sock.user.id
);
```
</details>

---

## 💡 Best Practices & Tips

### Connection Stability
1. Always implement reconnect logic on `connection === 'close'`
2. Cache group metadata using `cachedGroupMetadata`
3. Use `markOnlineOnConnect: false` to still receive phone notifications
4. Set `syncFullHistory: true` for complete history

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

## ⚠️ Important Legal Notice

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

**Credits:** Original Baileys by [WhiskeySockets](https://github.com/WhiskeySockets/Baileys) · toxic-baileys enhancements by **𝐱𝐡_𝐜𝐥𝐢𝐧𝐭𝐨𝐧 ✓**

---

<div align="center">

🌟 **toxic-baileys™** — Crafted with ❤️ by **𝐱𝐡_𝐜𝐥𝐢𝐧𝐭𝐨𝐧 ✓**

*The most powerful WhatsApp automation toolkit*

⭐ Star the repository if this helped you!

</div>
