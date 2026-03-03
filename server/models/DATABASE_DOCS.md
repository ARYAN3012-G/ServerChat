# ServerChat Database Documentation
> MongoDB database: `serverchat` | ORM: Mongoose | 11 Collections

---

## 📁 All Models Location: `server/models/`

```
server/models/
├── User.js            ← User accounts, auth, profiles
├── Server.js          ← Discord-like servers
├── Channel.js         ← Text/Voice/DM channels
├── Message.js         ← Chat messages
├── FriendRequest.js   ← Friend requests
├── GameSession.js     ← Game state & scores
├── CallSession.js     ← Voice/Video calls
├── Payment.js         ← Payment history
├── Subscription.js    ← Premium subscriptions
├── ActivityLog.js     ← User activity tracking
├── AdminLog.js        ← Admin audit trail
└── DATABASE_DOCS.md   ← This file
```

---

## 1. `users` Collection — User Accounts & Authentication

**File**: `User.js` | **Used by**: authController, userController, friendController

This is the central collection. Every other collection references users.

### Fields:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `username` | String | ✅ | Unique, 3-30 chars, trimmed |
| `email` | String | ✅ | Unique, lowercase |
| `phone` | String | ❌ | Unique (sparse index — allows nulls) |
| `password` | String | ✅ | Bcrypt hashed (12 rounds), hidden from queries (`select: false`) |
| `avatar` | Object `{url, publicId}` | ❌ | Cloudinary image URL + ID for deletion |
| `banner` | Object `{url, publicId}` | ❌ | Profile banner image |
| `bio` | String | ❌ | Max 200 characters |
| `role` | String (enum) | ❌ | `user` / `moderator` / `admin` (default: `user`) |
| `status` | String (enum) | ❌ | `online` / `offline` / `idle` / `dnd` / `invisible` |
| `customStatus` | Object `{text, emoji}` | ❌ | User-set status like "Playing a game 🎮" |
| `lastSeen` | Date | ❌ | Auto-updated on disconnect |
| `isBanned` | Boolean | ❌ | Default: false |
| `banReason` | String | ❌ | Why user was banned |
| `twoFactorEnabled` | Boolean | ❌ | Whether 2FA is active |
| `twoFactorSecret` | String | ❌ | TOTP secret (`select: false`) |
| `faceDescriptor` | [Number] | ❌ | Face recognition data (`select: false`) |
| `googleId` | String | ❌ | Google OAuth ID |
| `githubId` | String | ❌ | GitHub OAuth ID |
| `subscription` | Object | ❌ | `{tier, stripeCustomerId, stripeSubscriptionId, expiresAt}` |
| `friends` | [ObjectId → User] | ❌ | Array of friend user IDs |
| `blockedUsers` | [ObjectId → User] | ❌ | Array of blocked user IDs |
| `sessions` | [Object] | ❌ | `{deviceInfo, ipAddress, token, lastActive}` — multi-device sessions |
| `resetPasswordToken` | String | ❌ | For forgot-password flow |
| `resetPasswordExpires` | Date | ❌ | Token expiry time |
| `createdAt` | Date | auto | Mongoose timestamps |
| `updatedAt` | Date | auto | Mongoose timestamps |

### Middleware:
- **Pre-save hook**: Automatically hashes password with bcrypt before saving
- **comparePassword()**: Method to verify login passwords
- **toJSON()**: Strips password, 2FA secret, face data from API responses

### Indexes:
- `{username, email}` — text search
- `{status}` — find online users

---

## 2. `servers` Collection — Discord-like Servers

**File**: `Server.js` | **Used by**: serverController

A "server" is a group space that contains channels and members with roles.

### Fields:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | String | ✅ | 2-50 chars |
| `icon` | Object `{url, publicId}` | ❌ | Server avatar |
| `banner` | Object `{url, publicId}` | ❌ | Server banner |
| `description` | String | ❌ | Max 500 chars |
| `owner` | ObjectId → User | ✅ | Server creator |
| `members` | [Object] | ❌ | `{user, role, nickname, joinedAt}` — roles: `owner/admin/moderator/member` |
| `channels` | [ObjectId → Channel] | ❌ | All channels in this server |
| `categories` | [Object] | ❌ | `{name, position, channels}` — channel grouping |
| `inviteCode` | String | auto | 8-char hex code, auto-generated on first save |
| `inviteLinks` | [Object] | ❌ | `{code, createdBy, expiresAt, maxUses, uses}` — shareable invite links |
| `isPublic` | Boolean | ❌ | Whether server appears in discovery |
| `memberCount` | Number | ❌ | Default: 1 |
| `maxMembers` | Number | ❌ | Default: 500 |
| `boostCount` / `boostTier` | Number | ❌ | Server boost system (tier 0-3) |
| `features` | [String] | ❌ | `ANIMATED_ICON, BANNER, VANITY_URL, MORE_EMOJI, HIGH_AUDIO` |
| `systemChannel` | ObjectId → Channel | ❌ | Where welcome messages go |
| `vanityUrl` | String | ❌ | Custom URL (unique, sparse) |

### Middleware:
- **Pre-save hook**: Generates `inviteCode` if not set
- **isFull** (virtual): Returns true if memberCount >= maxMembers
- **createInvite(userId, options)**: Method to create named invite links

### Indexes:
- `{name, description}` — text search
- `{inviteCode}`, `{inviteLinks.code}` — fast invite lookup
- `{members.user}` — find servers a user belongs to
- `{isPublic}` — discovery filtering

---

## 3. `channels` Collection — Text/Voice/DM Channels

**File**: `Channel.js` | **Used by**: channelController

Channels belong to a server. DM channels have `server: null`.

### Fields:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | String | ✅ | Max 100 chars |
| `description` | String | ❌ | Max 500 chars |
| `type` | String (enum) | ❌ | `text` / `voice` / `video` / `dm` / `group_dm` |
| `isPrivate` | Boolean | ❌ | Hidden from non-members |
| `server` | ObjectId → Server | ❌ | Null for DM channels |
| `icon` | Object `{url, publicId}` | ❌ | Channel icon |
| `owner` | ObjectId → User | ✅ | Channel creator |
| `members` | [Object] | ❌ | `{user, role, joinedAt}` — channel-level permissions |
| `pinnedMessages` | [ObjectId → Message] | ❌ | Pinned messages array |
| `category` | String | ❌ | Default: "General" |
| `slowMode` | Number | ❌ | Seconds between messages (0 = off) |
| `lastMessage` | ObjectId → Message | ❌ | Most recent message |
| `lastActivity` | Date | ❌ | Last activity timestamp |

### Indexes:
- `{name, description}` — text search
- `{type}` — filter by channel type
- `{members.user}` — find channels a user belongs to

---

## 4. `messages` Collection — Chat Messages

**File**: `Message.js` | **Used by**: messageController

Every chat message, including system messages, file uploads, and voice messages.

### Fields:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `content` | String | ❌ | Max 4000 chars (can be empty for file-only messages) |
| `sender` | ObjectId → User | ✅ | Who sent the message |
| `channel` | ObjectId → Channel | ✅ | Which channel it was sent in |
| `type` | String (enum) | ❌ | `text/image/video/audio/file/system/voice_message` |
| `attachments` | [Object] | ❌ | `{url, publicId, filename, mimetype, size}` — file uploads |
| `replyTo` | ObjectId → Message | ❌ | If replying to another message |
| `threadId` | ObjectId → Message | ❌ | Parent message for thread replies |
| `threadCount` | Number | ❌ | Number of thread replies |
| `reactions` | [Object] | ❌ | `{emoji, users: [ObjectId]}` — each emoji with who reacted |
| `readBy` | [Object] | ❌ | `{user, readAt}` — read receipts |
| `isPinned` | Boolean | ❌ | Whether message is pinned |
| `isEdited` | Boolean | ❌ | Whether message was edited |
| `isDeleted` | Boolean | ❌ | Soft delete flag |
| `editedAt` | Date | ❌ | When last edited |

### Indexes:
- `{channel, createdAt: -1}` — fetch messages in order (most important index!)
- `{sender}` — find messages by user
- `{content}` — text search
- `{threadId}` — find thread replies

---

## 5. `friendrequests` Collection — Friend Requests

**File**: `FriendRequest.js` | **Used by**: friendController

Manages the friend request lifecycle: send → accept/reject.

### Fields:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `from` | ObjectId → User | ✅ | Who sent the request |
| `to` | ObjectId → User | ✅ | Who receives the request |
| `status` | String (enum) | ❌ | `pending` / `accepted` / `rejected` |
| `message` | String | ❌ | Optional message with request (max 200) |

### Indexes:
- `{from, to}` — unique compound index (prevents duplicate requests)
- `{to, status}` — find pending requests for a user

---

## 6. `gamesessions` Collection — Multiplayer Game State

**File**: `GameSession.js` | **Used by**: gameController

Tracks multiplayer game sessions with scores and state.

### Fields:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `game` | String (enum) | ✅ | `tic-tac-toe/rock-paper-scissors/quiz/word-guess/snake` |
| `channel` | ObjectId → Channel | ❌ | Which channel the game is in |
| `players` | [Object] | ❌ | `{user, score, isReady}` — player list |
| `state` | Mixed (any JSON) | ❌ | Game-specific state (board, cards, etc.) |
| `status` | String (enum) | ❌ | `waiting/in_progress/finished/cancelled` |
| `winner` | ObjectId → User | ❌ | Winner of the game |
| `currentTurn` | ObjectId → User | ❌ | Whose turn it is |
| `round` / `maxRounds` | Number | ❌ | Current round and max rounds |
| `settings` | Mixed (any JSON) | ❌ | Game configuration |
| `startedAt` / `finishedAt` | Date | ❌ | Timestamps |

### Indexes:
- `{channel}` — find games in a channel
- `{status}` — find active games
- `{players.user}` — find games a user played

---

## 7. `callsessions` Collection — Voice/Video Calls

**File**: `CallSession.js` | **Used by**: callController

Tracks voice and video call sessions including participants and duration.

### Fields:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | String (enum) | ✅ | `voice` / `video` / `screen_share` |
| `channel` | ObjectId → Channel | ❌ | Which voice channel |
| `initiator` | ObjectId → User | ✅ | Who started the call |
| `participants` | [Object] | ❌ | `{user, joinedAt, leftAt, isMuted, isVideoOff}` |
| `status` | String (enum) | ❌ | `ringing/active/ended/missed` |
| `isGroup` | Boolean | ❌ | Whether it's a group call |
| `startedAt` / `endedAt` | Date | ❌ | Call timing |
| `duration` | Number | ❌ | Call length in seconds |

### Indexes:
- `{channel}` — find calls in a channel
- `{status}` — find active calls

---

## 8. `payments` Collection — Payment History

**File**: `Payment.js` | **Used by**: paymentController

Records every payment transaction (linked to Stripe).

### Fields:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `user` | ObjectId → User | ✅ | Who made the payment |
| `stripePaymentIntentId` | String | ❌ | Stripe Payment Intent ID |
| `stripeInvoiceId` | String | ❌ | Stripe Invoice ID |
| `amount` | Number | ✅ | Amount in cents (e.g., 999 = $9.99) |
| `currency` | String | ❌ | Default: "usd" |
| `status` | String (enum) | ❌ | `pending/succeeded/failed/refunded` |
| `description` | String | ❌ | What the payment is for |
| `tier` | String (enum) | ❌ | `basic` / `premium` |

### Indexes:
- `{user, createdAt: -1}` — find user's payment history

---

## 9. `subscriptions` Collection — User Subscriptions

**File**: `Subscription.js` | **Used by**: paymentController

Manages premium subscription tiers and their features.

### Fields:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `user` | ObjectId → User | ✅ | One subscription per user (unique) |
| `tier` | String (enum) | ❌ | `free/basic/premium` |
| `stripeCustomerId` | String | ❌ | Stripe Customer ID |
| `stripeSubscriptionId` | String | ❌ | Stripe Subscription ID |
| `stripePriceId` | String | ❌ | Stripe Price ID |
| `status` | String (enum) | ❌ | `active/cancelled/past_due/trialing/inactive` |
| `features` | Object | ❌ | Feature flags per tier: |
| → `customEmojis` | Boolean | | Can use custom emoji |
| → `premiumBadge` | Boolean | | Shows premium badge |
| → `uploadLimit` | Number | | File upload limit in MB (default: 10) |
| → `animatedAvatar` | Boolean | | Can use animated avatars |
| → `screenShare` | Boolean | | Can screen share |
| `currentPeriodStart` / `End` | Date | ❌ | Current billing period |
| `cancelAtPeriodEnd` | Boolean | ❌ | Will cancel at end of period |

---

## 10. `activitylogs` Collection — User Activity Tracking

**File**: `ActivityLog.js` | **Used by**: authController, userController, adminController

Automatically logs important user actions for analytics and auditing.

### Fields:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `user` | ObjectId → User | ✅ | Who performed the action |
| `action` | String (enum) | ✅ | One of 20 action types (see below) |
| `details` | Mixed (any JSON) | ❌ | Action-specific data |
| `ipAddress` | String | ❌ | Request IP address |
| `userAgent` | String | ❌ | Browser/device info |

### Action Types:
`login`, `logout`, `register`, `message_sent`, `message_deleted`, `channel_created`, `channel_joined`, `channel_left`, `friend_added`, `friend_removed`, `game_started`, `game_finished`, `call_started`, `call_ended`, `profile_updated`, `password_changed`, `subscription_changed`, `user_reported`, `user_blocked`

### Indexes:
- `{user, createdAt: -1}` — find user's activity history
- `{action}` — filter by action type

---

## 11. `adminlogs` Collection — Admin Audit Trail

**File**: `AdminLog.js` | **Used by**: adminController

Records every admin action for accountability.

### Fields:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `admin` | ObjectId → User | ✅ | Which admin performed the action |
| `action` | String (enum) | ✅ | One of 8 action types (see below) |
| `target` | ObjectId (dynamic) | ❌ | Affected entity (uses `refPath`) |
| `targetModel` | String (enum) | ❌ | `User/Channel/Message/Payment` — tells Mongoose which collection to populate |
| `details` | Mixed (any JSON) | ❌ | Action-specific data |
| `ipAddress` | String | ❌ | Admin's IP address |

### Action Types:
`user_banned`, `user_unbanned`, `user_role_changed`, `channel_deleted`, `channel_moderated`, `message_deleted`, `payment_refunded`, `system_setting_changed`

### Indexes:
- `{admin, createdAt: -1}` — find admin's action history
- `{action}` — filter by action type

---

## Relationships Summary

```
User ──────┬── owns ──────→ Server
           ├── sends ─────→ Message
           ├── belongs to → Channel
           ├── sends ─────→ FriendRequest
           ├── plays ─────→ GameSession
           ├── joins ─────→ CallSession
           ├── makes ─────→ Payment
           ├── has ───────→ Subscription (1:1)
           ├── generates ─→ ActivityLog
           └── performs ──→ AdminLog (admin only)

Server ────┬── contains ──→ Channel[]
           └── has ───────→ members[] (embedded)

Channel ───┬── has ───────→ Message[]
           ├── hosts ────→ GameSession
           └── hosts ────→ CallSession
```
