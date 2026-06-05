# 1.1.0 (2026-06-04)

### Features
- Added `registerSocketEndHandler` — register async callbacks that fire when the socket closes
- Added `fetchAccountReachoutTimelock()` — query account restriction/timelock status from WA servers
- Added `fetchNewChatMessageCap()` — query new chat message quota and usage
- Added `buildPairingQRData` and `getCompanionPlatformId` from companion-reg-client-utils — QR now encodes companion platform type for proper device recognition
- Exported `XWAPaths`, `QueryIds`, `ReachoutTimelockEnforcementType`, `ReachoutTimelockState`, `NewChatMessageCapInfo`, `NewChatMessageCappingStatusType`, `NewChatMessageCappingMVStatusType`, `NewChatMessageCappingOTEStatusType` types
- Added `'message-capping.update'` event type

### Fixes
- Fixed pre-key upload: deduplication via in-flight promise, retry logic now internal to `uploadLogic`, server drives timing
- Fixed `ev.destroy()` on socket close to prevent memory leaks
- Fixed `signalRepository.close()` called on socket end
- Fixed socket end handlers run before `ev.destroy()` — guarantees all post-close cleanup runs in order
- Fixed newsletter join endpoint to `xwa2_newsletter_join_v2` and leave to `xwa2_newsletter_leave_v2`
- Fixed group metadata: `getBinaryNodeChild` error now surfaces WA server error code instead of crashing
- Fixed album messages: `contextInfo` now passed to each album item, `userJid` uses socket auth state
- Fixed `handleGroupStory`: removed stale fallback chain, now directly calls `generateWAMessageContent`
- Fixed `handleEvent`: `userJid` now from socket auth state instead of generated fake JID
- Fixed `handlePollResult`: `userJid` now from socket auth state
- Fixed `detectType` to accept `content.album` as alias for `content.albumMessage`
- Fixed `ToxicHandler` constructor: removed unused `utils` parameter
- Fixed `getCompanionPlatformId` replacing deprecated `getPlatformId` for companion platform registration

# 1.0.10 (2025-05-03)

Initial release of toxic-baileys
