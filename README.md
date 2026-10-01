If you find this project helpful, consider [following me on GitHub](https://github.com/xhclintohn).

# toxic-baileys™

<div align="center">

[![npm version](https://img.shields.io/npm/v/toxic-baileys.svg?style=for-the-badge)](https://www.npmjs.com/package/toxic-baileys)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)
[![npm downloads](https://img.shields.io/npm/dm/toxic-baileys.svg?style=for-the-badge)](https://www.npmjs.com/package/toxic-baileys)
[![GitHub](https://img.shields.io/badge/GitHub-Repository-blue?style=for-the-badge&logo=github)](https://github.com/xhclintohn/Baileys)
[![Node](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen?style=for-the-badge)](https://nodejs.org)
[![Changelog](https://img.shields.io/badge/Changelog-1.4.0-blue?style=for-the-badge)](CHANGELOG.md)

</div>

**[View full Changelog →](CHANGELOG.md)**

A professionally enhanced, feature-rich fork of the Baileys WhatsApp Web API. Built for developers who need robust, stable WhatsApp automation with LID identity mapping, AI group support, interoperability, extended message types, and improved connection handling.

**Maintainer:** 𝐱𝐡_𝐜𝐥𝐢𝐧𝐭𝐨𝐧

---

> [!IMPORTANT]
> ### LID Mapping — Critical Feature in This Fork
> WhatsApp has rolled out **Linked Identity (LID)** JIDs as part of its cross-platform interoperability initiative. Group messages and status updates now arrive with `@lid` domain JIDs instead of standard `@s.whatsapp.net` phone-number JIDs. **Without LID resolution, you cannot identify who sent a message in many groups.**
>
> This fork ships a complete `LIDMappingStore` (bidirectional LRU cache + persistent key store) and `UsyncLIDProtocol` so your bot always knows the real phone number behind every `@lid` JID. See the **[LID Mapping System](#lid-mapping-system)** section for full integration details.

---

## Table of Contents

- [What's New](#whats-new)
- [Features](#features)
- [Changelog](#changelog)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Connection & Configuration](#connection--configuration)
- [Authentication State Management](#authentication-state-management)
- [LID Mapping System](#lid-mapping-system)
- [AI Groups](#ai-groups)
- [Interoperability API](#interoperability-api)
- [USync Protocol](#usync-protocol)
- [Sending Messages](#sending-messages)
- [Rich Message Builders](#rich-message-builders)
- [Chat & Message Management](#chat--message-management)
- [Group Management](#group-management)
- [User & Profile Management](#user--profile-management)
- [Username Management](#username-management)
- [Newsletter / Channel Management](#newsletter--channel-management)
- [Privacy & Block Management](#privacy--block-management)
- [Data Store Implementation](#data-store-implementation)
- [Utility Functions](#utility-functions)
- [Best Practices & Tips](#best-practices--tips)
- [Important Legal Notice](#important-legal-notice)
- [Getting Help](#getting-help)
- [License](#license)

---

## What's New

### 1.4.0 — Offline Resume & Stability

- **Advanced Offline Resume Controller.** Adaptive offline batch requests (configurable batch size / refill threshold), proper coordination between server terminal and local queue drain, and accurate `receivedPendingNotifications` signaling. Faster start when the bot was offline for hours.
- **Upgraded Offline Node Processor.** FIFO processing with pending/processed/failed counters, `waitForIdle()`, `onStanzaProcessed()`, and clean `dispose()` on socket end.
- **`offlineDrainStatus`.** `connection.update` now includes `offlineDrainStatus: 'complete' | 'degraded'` so you know whether the backlog fully drained or timed out.
- **New SocketConfig options.** `offlinePendingFlushTimeoutMs` (default 60s), `offlineBatchSize` (200), `offlineRefillThreshold` (200), `ignoreOfflineMessages`.

See the full [Changelog](CHANGELOG.md) for every release.

### Previous highlights

- **LID lookups are faster and less wasteful.** The LID mapping store now batches and coalesces concurrent lookups instead of firing off duplicate requests, and it has a proper `close()` for shutting it down cleanly.
- **A real username API.** `checkUsername`, `setUsername`, `getMyUsername`, `findUserByUsername`, `fetchContactUsernames`, and more — see [Username Management](#username-management).
- **New `AIRich`, `Button`, `ButtonV2`, `Carousel`, and `Toolkit` builders.** See [Rich Message Builders](#rich-message-builders).
- **`sendInteractive`.** Sends interactive buttons with iOS fallback to plain text.
- **Profile pictures crop from center.** No more lopsided crops.
- **App state sync continues past bad patches.**
- **Event buffer `destroy()` cleans up timers and listeners.**
- **Spoofed protocol messages dropped** (GHSA-qvv5-jq5g-4cgg / CVE-2026-48063).

### All Previous Features

Compared to upstream Baileys, this fork adds:

| Feature | Description |
|---|---|
| **LID Mapping System** | Full `LIDMappingStore` with LRU cache, persistent key store, bidirectional lookups, and `UsyncLIDProtocol` |
| **AI Groups** | `makeAIGroupsSocket` — create, manage, and receive events for WhatsApp AI-powered groups |
| **Interoperability API** | `makeInteropSocket` — fetch third-party integrators, accept Interop TOS, opt in/out |
| **USync Protocol Layer** | Full `WAUSync` module: LID, Contact, Device, Disappearing Mode, Status, Text Status, Picture, Username, Bot Profile protocols |
| **MEX / GraphQL Queries** | `executeWMexQuery` for structured WhatsApp server queries via the `w:mex` IQ namespace |
| **`me.lid` Credential** | Bot's own LID identity stored in credentials on pairing |
| **`lidDbMigrated` Login Flag** | Signals to WhatsApp to push down LID mappings on connect |
| **Group Status V2** | `ToxicHandler` exposed on socket for rich group story/status management |
| **Advanced Offline Resume** | Adaptive offline batch drain with complete/degraded status (v1.4.0) |
| **`newsletterId()` Helper** | Utility to extract a clean newsletter/channel ID from any JID format |

---

## Features

- **Modern & Fast** — Latest WA version, optimised pre-key upload (812 keys)
- **Full LID Identity Resolution** — Bidirectional LIDPN mapping with LRU cache, USync lookup, and persistent storage
- **AI Groups Support** — Create and manage WhatsApp's AI-powered group type
- **Cross-Platform Interop** — Third-party integrator management
- **Enhanced Stability** — Improved connection handling, socket end handlers, `ev.destroy()` on close, cleaner pre-key retry logic
- **Advanced Offline Resume** — Adaptive offline batch requests, coordinated drain with local queue, complete/degraded status, faster reconnect after long offline periods
- **Multi-Device Support** — Full WhatsApp multi-device protocol with improved `historySyncConfig`
- **End-to-End Encryption** — Signal Protocol, `inlineInitialPayloadInE2EeMsg: true`
- **Extended Message Types** — Interactive, album, event, poll result, group status, payment, product
- **Advanced Group Management** — Group controls, group status V2, communities support
- **Flexible Auth** — Multi-file auth state with `makeCacheableSignalKeyStore`
- **Full Newsletter/Channel API** — Follow, create, metadata, `newsletterId()` helper
- **Developer Friendly** — `toxicHandler` and `ToxicHandler` exposed on socket, clean API
- **WebSocket Improvements** — `perMessageDeflate: false`, 100 MB max payload

---

## Changelog

Full release history and detailed notes live in **[CHANGELOG.md](CHANGELOG.md)**.

| Version | Highlights |
|---------|------------|
| **1.4.0** | Advanced offline resume controller, upgraded offline node processor, `offlineDrainStatus`, faster reconnect after long offline periods |
| **1.3.0** | Upstream rc14 sync, 405 disconnect fix, signal repo methods, history-sync pastParticipants, privacy token recovery |
| **1.2.x** | Username API, AIRich / Button / Carousel builders, `sendInteractive`, LID batching, spoof protection |

[![Open Changelog](https://img.shields.io/badge/Open-Changelog.md-blue?style=for-the-badge)](CHANGELOG.md)

---

## Installation

### Via npm
```bash
npm install toxic-baileys
```

### Via Yarn
```bash
yarn add toxic-baileys
```

### From GitHub (edge / test branch)
```bash
npm install github:xhclintohn/Baileys#test
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

## Quick Start

<details>
<summary>Basic Connection (QR Code)</summary>

```javascript
import makeWASocket, { useMultiFileAuthState, DisconnectReason } from 'toxic-baileys';
import { Boom } from '@hapi/boom';

async function connectToWhatsApp() {
 const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
 const sock = makeWASocket({ auth: state, printQRInTerminal: true });

 sock.ev.on('connection.update', ({ connection, lastDisconnect, receivedPendingNotifications, offlineDrainStatus }) => {
 if (connection === 'close') {
 const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
 if (shouldReconnect) connectToWhatsApp();
 } else if (connection === 'open') {
 console.log('Connected! Bot LID:', sock.user?.lid);
 }
 if (receivedPendingNotifications) {
 console.log('Offline backlog done:', offlineDrainStatus || 'ok');
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

## Connection & Configuration

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
 // Offline resume (v1.4.0+) — faster reconnect after long offline periods
 offlinePendingFlushTimeoutMs: 60_000,
 offlineBatchSize: 200,
 offlineRefillThreshold: 200,
 cachedGroupMetadata: async (jid) => groupCache.get(jid),
 getMessage: async (key) => await yourStore.getMessage(key),
});

sock.ev.on('groups.update', async ([event]) => {
 const metadata = await sock.groupMetadata(event.id);
 groupCache.set(event.id, metadata);
});
```
</details>

<details>
<summary>Offline resume & connection.update (v1.4.0+)</summary>

```javascript
sock.ev.on('connection.update', (update) => {
  const { connection, receivedPendingNotifications, offlineDrainStatus } = update

  if (connection === 'open') {
    console.log('connected')
  }

  if (receivedPendingNotifications) {
    console.log('pending notifications processed')
    if (offlineDrainStatus === 'complete') {
      console.log('offline drain complete')
    } else if (offlineDrainStatus === 'degraded') {
      console.warn('offline drain timed out (degraded)')
    }
  }
})
```
</details>

---

## Authentication State Management

<details>
<summary>Multi-File Auth (Development)</summary>

```javascript
import makeWASocket, { useMultiFileAuthState } from 'toxic-baileys';

const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
const sock = makeWASocket({ auth: state });
sock.ev.on('creds.update', saveCreds);
```
</details>

---

## Getting Help

- Full changelog: [CHANGELOG.md](CHANGELOG.md)
- Issues: [GitHub Issues](https://github.com/xhclintohn/Baileys/issues)

## License

MIT — see [LICENSE](LICENSE).
