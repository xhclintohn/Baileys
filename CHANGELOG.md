# 1.4.0 (2026-10-01)

### Features
- Integrated advanced offline-resume controller from vansnowi/baileys for adaptive offline batch requests, proper drain finalization (complete vs degraded), and accurate receivedPendingNotifications signaling
- Upgraded offline-node-processor with pending/processed/failed counters, waitForIdle, onStanzaProcessed, dispose, and more robust FIFO processing with compacting
- Added `isSecret`, `protected`, and `me` options to `relayMessage` / `MessageRelayOptions` for recipient-only, primary-device-only, and exclude-linked-devices delivery modes (from vansnowi/baileys)
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
