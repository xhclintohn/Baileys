# 1.7.0 (2026-11-12)

### Features
- **Channel statuses — send and receive** (ported from Casper-Tech-ke/baileys) — `sendChannelStatus(jid, content, options)` posts a channel admin's 24h status via a top-level `<status>` stanza, and incoming channel statuses now arrive as a `newsletter.status` event instead of being invisible; the existing `<status>` ack for personal statuses is unchanged
- **Payment messages** — `requestPayment`, `sendPayment`, `declinePaymentRequest`, `cancelPaymentRequest`, and `sendPaymentInvite` send WhatsApp payment request/card messages (amounts in major units, 7-day request expiry); moving money still needs a payment provider
- **Sticker packs** — `sendStickerPack(jid, pack)` sends up to 60 WebP stickers plus a tray icon as one `stickerPackMessage` the receiver can add to their collection, with a dependency-free ZIP writer and `sticker-pack` media types
- **Full-image profile pictures** — `updateProfilePicture(jid, content, { full: true })` uploads the image as-is with no crop or padding (scaled to fit WhatsApp's 640 limit, aspect kept); the default 640x640 center crop is unchanged
- **Delete and clear chat upgrades** — `deleteMessage(jid, key)` deletes a message for everyone (admin delete in groups), `deleteMessageForMe(jid, key, timestamp, deleteMedia?)` deletes one message for yourself only, and `clearChat` now takes `{ deleteStarred: false }` to keep starred messages; a clear done on another device now surfaces as `chats.update` with empty `messages`
- **Article cards** — `sendArticleCard(jid, card)` sends a text message with a link-preview card (title, body, URL, thumbnail)
- **Premium sticker flags** — stickers can now carry `isAiSticker`, `isAvatar`, `isLottie`, and `accessibilityLabel`
- **Markdown tables to AI rich responses** — `parseMarkdownTables` / `markdownToAIRichResponse` convert Markdown pipe tables and prose into native AI rich-response submessages (utility only, not wired into `sendMessage`)
- **Peer messages and app-state sync key requests** — `sendPeerMessage` is now exposed (the peer-data-operation sender is built on it), and `requestAppStateSyncKey(keyIds)` asks the phone to share missing app-state sync keys
- **Username query IDs can be patched at runtime** — `setUsernameQueryIds` updates the MEX query IDs without a new release, for when WhatsApp rotates them server-side
- **LID lookups are first-class socket functions** — `getPNForLID`, `getPNsForLIDs`, `getLIDForPN`, `getLIDsForPNs` are now on the socket directly

### Fixes
- **LID-to-phone lookups no longer add a `:0` device suffix** — `getPNForLID` now returns the plain phone JID for device 0, matching the LID side, so plain `===` comparisons against the phone number work

# 1.6.0 (2026-10-20)

### Features
- Added `Browsers.android` companion profile (upstream #2201) so sessions can present as Android, e.g. for receiving view-once media

### Fixes
- **Pairing code rejected by WhatsApp (key derivation)** — `derivePairingCodeKey` now uses PBKDF2-SHA256 with 131,072 iterations, matching WhatsApp's protocol; the old HKDF-derived key could never be decrypted by the phone, so every pairing code failed while QR worked
- **Pairing request flow hardened** (upstream #2559) — `companion_hello` is now sent via `query()` so server rejections surface as real errors instead of a silently dead code; requests queue until `pair-device` is received; a second concurrent request is rejected; `creds.me` is only set after the server accepts; the `companion_platform_display` value is normalized to a WhatsApp-accepted browser/OS pair; pending requests are rejected if the connection closes mid-pairing
- **Retry receipts now inject the E2E session bundle** (upstream #2507) — when a peer's retry receipt carries a key bundle, the session is injected before resending; registration-id mismatches and base-key collisions on repeated retries now delete the stale session; group/status resends embed the sender-key distribution message (SKDM) so recipients can decrypt
- **Pre-key uploads deduplicated** — a re-issued `PreKeyLow` notification with the same stanza id no longer triggers a second concurrent pre-key upload (mirrors WA Web)
- **No more retry receipts for undecryptable own messages** (upstream #2864) — echo messages from your other devices are acked instead of requested again, which previously made the server tear the stream down (fake 500 "bad session" closes)
- **Top-level `<status>` stanzas are acked** (upstream #2866) — accounts receiving statuses as a `<status>` stanza no longer get their stream ended by the server ~50 minutes in
- **Multi-file auth state is written atomically** (upstream #2855) — writes go to a temp file and are renamed over the target, so a crash mid-write can no longer corrupt `creds.json` and silently reset the session; existing file permissions are preserved
- **Message stanza validation** — stanzas missing an `id` or `from` attribute now fail with a clear error instead of being decoded with undefined values
- **Peer-routed self stanzas decode as `fromMe`** — history-sync / app-state stanzas routed from your own device (no `recipient` attribute) are marked `fromMe`, so self-only protocol message handlers run on them

# 1.5.2

### Fixes
- Newsletter/channel media upload now uses `/newsletter/newsletter-*` paths with `server_thumb_gen=1` so directPath is `/m1/` and images/videos appear in channels (was `/o1/` via `/mms/*`, ACK 479)

# 1.5.1

### Features
- Chat helpers: `archiveChat`, `clearChat`, `deleteChat`, `pinChat`, `muteChat`, `markChatRead` (thin wrappers over `chatModify`)
- Calls: `acceptCall`, `terminateCall` alongside existing `rejectCall`
- `sendGroupStatus` alias for status/group story sends (same path as `sendStatusMention`)

### Updates
- WA web version bumped to `[2, 3000, 1049110567]`

# 1.5.0

### Features
- Meta AI (Hatch): `sendMetaAI(text, opts)` for 1:1 and group invoke with messageSecret, botMetadata, and `<bot>` persona node
- `extractMetaAiText()`, `textFromRichResponse()`, `parseUnifiedResponseData()`, `decodeUnifiedResponseInPlace()` for Meta AI reply shapes
- `decryptMsmsgBotMessage` / `decodeDecryptedMsmsgMessage` helpers for bot msmsg payloads

### Fixes
- `@bot` / Meta AI JIDs are enumerated as device 0 and included in Signal pre-key fetch so prompts encrypt and reach the bot
- `isJidBot` now also matches `@bot` server JIDs

# 1.4.0 (2026-10-01)

### Features
- Integrated advanced offline-resume controller from vansnowi/baileys for adaptive offline batch requests, proper drain finalization (complete vs degraded), and accurate receivedPendingNotifications signaling
- Upgraded offline-node-processor with pending/processed/failed counters, waitForIdle, onStanzaProcessed, dispose, and more robust FIFO processing with compacting
- Added `isSecret`, `protected`, and `me` options to `relayMessage` / `MessageRelayOptions` for recipient-only, primary-device-only, and exclude-linked-devices delivery modes (from vansnowi/baileys)
- Added `useSqliteAuthState` (Node 22.5+ `node:sqlite`) with optional multi-file migration (from vansnowi/baileys)
- Added persistent `history-chunk-queue` state machine for ordered history-sync apply + completion receipts (from vansnowi/baileys)
- Added `richMenu` (quick-reply / carousel cards with optional image header and open-URL footer) and `sendHtml` (render raw HTML via rich response) from vansnowi/baileys

### Fixes
- Fixed history sync / offline message receiver bugs: faster start after the bot has been offline for hours by coordinating offline batch refill with local queue drain and only flushing the event buffer after the server terminal and local processing complete
- Offline drain timeout reports degraded status instead of falsely claiming full success

### Notes
- Added SocketConfig options: offlinePendingFlushTimeoutMs, offlineBatchSize, offlineRefillThreshold, ignoreOfflineMessages
- connection.update now may include offlineDrainStatus: 'complete' | 'degraded'
- `participant: { jid }` already existed; now pairs with isSecret/protected/me for fine-grained device targeting

# 1.3.0 (2026-08-13)

### Fixes
- Synced with upstream Baileys 7.0.0-rc14 to resolve the 405 disconnection issue: Windows client payload now reports `WIN_HYBRID` instead of the retired `WIN32` sub-platform, and the WA Web version was bumped to `2.3000.1043857760`
- Switched the `libsignal` dependency from a git URL to the published npm package (`^6.0.0`), which should mean fewer install failures on hosts that can't clone from GitHub during install
- Implemented `getSenderKeyDistributionMessage`, `hasSenderKey`, `getSessionInfo`, and `close()` on the signal repository — these were already declared in the types but never actually implemented
- `decodeSyncdMutations` no longer aborts the entire app-state sync when it hits one corrupted or undecryptable record; it now skips just that record and keeps going, while still surfacing real missing-key errors so the retry flow can recover properly
- Fixed a hardcoded MAC validation flag in the app-state patch decoder that was ignoring the caller's `validateMacs` setting
- History-sync buffering now correctly merges and dedupes `pastParticipants` across chunks instead of dropping the field
- Added automatic recovery for 463 (account-restriction) ack errors: the client now proactively re-issues privacy tokens instead of just logging a warning, and reachout-timelock ack errors now trigger a state refresh
- Rebuilt mex/GQL notification handling (`NotificationUserReachoutTimelockUpdate`, `MessageCappingInfoNotification`, linked-profile LID mapping) and device-list notifications now update the device cache directly instead of only logging

### Notes
- Reviewed every file upstream changed in rc14, including the ones with very large raw diffs (messages-send.ts, messages-recv.ts, Message.ts). Most of that size turned out to be diff noise from this fork's own custom features (username API, WABuilder buttons, `toxicHandler`, `sendInteractive`) not existing upstream — none of that was touched
- Did not port the retry-receipt session-bundle injection upstream added, since it would need to be woven into this fork's already more advanced auto-session-recreation logic in `sendMessagesAgain`, and I'd rather leave that working code alone than risk it without being able to run a build here

# 1.2.4 (2026-08-13)

### Fixes
- Synced with upstream Baileys 7.0.0-rc14 to resolve the 405 disconnection issue: Windows client payload now reports `WIN_HYBRID` instead of the retired `WIN32` sub-platform, and the WA Web version was bumped to `2.3000.1043857760`
- This release intentionally stays scoped to the disconnect fix — upstream's broader rc14 changes (mex notification handling, LID mapping updates, and a libsignal dependency migration) touch code that overlaps with this fork's custom modules and are being reviewed separately before merging, so nothing else changed here

# 1.2.0 (2026-07-08)

### Features
- Added a proper username API — `checkUsername`, `setUsername`, `deleteUsername`, `getMyUsername`, `setUsernamePin`, `findUserByUsername`, `fetchContactUsernames`, `checkUsernameMulti`, `getUsernameRecommendations`
- Added `USyncPictureProtocol` and `USyncTextStatusProtocol` for fetching profile pictures and text statuses via USync
- Added `AIRich`, `Button`, `ButtonV2`, `Carousel`, and `Toolkit` (`WABuilder` module) — rich message builders for interactive buttons, carousels, and Meta AI-style responses with inline citations, hyperlinks, LaTeX, code blocks, and tables
- Added `sendInteractive` (also callable as `inappsignup` / `inapp_signup`) — sends interactive buttons, but automatically falls back to plain text when the bot's paired device is iOS
- Added shorter import aliases: `AIRich` as `RichMessage` / `Rich` / `RichMsg` / `RichAI`, `Button` as `Buttons` / `Btns`, `ButtonV2` as `ButtonsV2` / `BtnsV2` / `NewButtons`
- Added `host` option to `downloadContentFromMessage` for overriding the media host manually
- Added `groupOnlineCount` to presence updates when WhatsApp includes it
- Added `destroy()` on the event buffer, actually clearing timers and listeners on socket end (previously called but never implemented)

### Fixes
- Confirmed protection against the message-spoofing/app-state-corruption issue from GHSA-qvv5-jq5g-4cgg (CVE-2026-48063) — spoofed history-sync, app-state-key-share, and placeholder-resend-response payloads not sent from your own account are dropped
- `generateProfilePicture` now crops from the center instead of the top-left corner, so non-square photos no longer come out lopsided
- App state sync no longer throws and kills the whole sync on a single bad patch or a hash mismatch — it now logs a warning and continues
- LID mapping store rewritten to batch and coalesce concurrent lookups, plus a proper `close()`
- Dropped spoofed "self-only" protocol messages (history sync notifications, app state key shares, etc.) that don't actually come from `fromMe`
