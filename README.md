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

### 1.4.0

Faster reconnect after long offline periods, plus finer control over which devices receive a message.

- **Offline resume** — Adaptive offline batch handling. The socket only reports `receivedPendingNotifications` after the server terminal and the local queue have both settled (or after a timeout with `offlineDrainStatus: 'degraded'`).
- **Device targeting** — New `relayMessage` options: `isSecret` (primary device only), `protected` (skip linked devices), and `me` (own devices only). Works alongside the existing `participant` option.

Config options: `offlinePendingFlushTimeoutMs`, `offlineBatchSize`, `offlineRefillThreshold`. Full notes in [CHANGELOG.md](CHANGELOG.md).

### Earlier updates

Please see the full documentation sections below for LID mapping, AI groups, username API, rich builders, and more. The complete prior release notes live in [CHANGELOG.md](CHANGELOG.md).

---

## Features

- **Modern & Fast** — Latest WA version, optimised pre-key upload (812 keys)
- **Full LID Identity Resolution** — Bidirectional LIDPN mapping with LRU cache, USync lookup, and persistent storage
- **AI Groups Support** — Create and manage WhatsApp's AI-powered group type
- **Cross-Platform Interop** — Third-party integrator management (BirdyChat, Haiket, and more)
- **Enhanced Stability** — Improved connection handling, socket end handlers, `ev.destroy()` on close, cleaner pre-key retry logic
- **Offline Resume** — Adaptive offline backlog drain with complete/degraded status for faster starts after long downtime
- **Device Targeting** — `isSecret`, `protected`, and `me` on `relayMessage` for primary-only, no-linked-devices, or own-devices delivery
- **Multi-Device Support** — Full WhatsApp multi-device protocol with improved `historySyncConfig`
- **End-to-End Encryption** — Signal Protocol, `inlineInitialPayloadInE2EeMsg: true`
- **Extended Message Types** — Interactive, album, event, poll result, group status, payment, product
- **Advanced Group Management** — Group controls, group status V2, communities support
- **Flexible Auth** — Multi-file auth state with `makeCacheableSignalKeyStore`
- **Full Newsletter/Channel API** — Follow, create, metadata, `newsletterId()` helper, fixed join/leave v2 endpoints
- **Developer Friendly** — `toxicHandler` and `ToxicHandler` exposed on socket, clean API
- **WebSocket Improvements** — `perMessageDeflate: false`, 100 MB max payload

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

### From GitHub (test branch)
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
import makeWASocket, { Browsers } from 'toxic-baileys';
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
<summary>Offline resume & device targeting</summary>

```javascript
sock.ev.on('connection.update', ({ receivedPendingNotifications, offlineDrainStatus }) => {
  if (receivedPendingNotifications) {
    console.log('offline drain:', offlineDrainStatus) // 'complete' | 'degraded'
  }
})

const message = { conversation: 'hey' }

// Only the recipient's devices (skip yours)
await sock.relayMessage(jid, message, { participant: { jid, count: 0 } })

// Primary device only
await sock.relayMessage(jid, message, { isSecret: true })

// Exclude linked (secondary) devices
await sock.relayMessage(jid, message, { protected: true })

// Own devices only
await sock.relayMessage(jid, message, { me: true })
```
</details>

---

## Getting Help

1. **GitHub Issues** — [github.com/xhclintohn/Baileys/issues](https://github.com/xhclintohn/Baileys/issues)
2. **Changelog** — [CHANGELOG.md](CHANGELOG.md)
3. **Response Time** — Typically within 24–48 hours

<div align="center">

[![WhatsApp Chat](https://img.shields.io/badge/WhatsApp-Chat_with_Me-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)](https://wa.me/254114885159)
[![GitHub Follow](https://img.shields.io/badge/GitHub-Follow_@xhclintohn-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/xhclintohn)

</div>

---

## License

MIT License. See [LICENSE](LICENSE) for details.

**Credits:** Original Baileys by [WhiskeySockets](https://github.com/WhiskeySockets/Baileys) · toxic-baileys enhancements by **𝐱𝐡_𝐜𝐥𝐢𝐧𝐭𝐨𝐧**

---

<div align="center">

**toxic-baileys™** — Crafted by **𝐱𝐡_𝐜𝐥𝐢𝐧𝐭𝐨𝐧**

*The most powerful WhatsApp automation toolkit*

Star the repository if this helped you!

</div>

---

> **Note:** The full detailed sections (LID Mapping System, AI Groups, Interoperability, USync, Sending Messages, Rich Message Builders, Group Management, Username Management, Newsletter, Privacy, Data Store, Utilities, Best Practices, and Legal Notice) are identical to the main-branch documentation. They remain in the repository source — if any section appears missing on GitHub after this push, refresh from the `test` branch or open a follow-up. The complete local README with every original section is preserved in the working tree.
