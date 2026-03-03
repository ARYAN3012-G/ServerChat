# ServerChat — Database Table Structures
> Database: MongoDB (`serverchat`) | 11 Tables (Collections) | Mongoose ORM

---

## Table 1: `users`
> Stores all registered user accounts, authentication, profiles, and settings.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              users                                     │
├──────────────────────┬───────────────┬──────────────────────────────────┤
│ Field                │ Type          │ Constraints / Info               │
├──────────────────────┼───────────────┼──────────────────────────────────┤
│ _id                  │ ObjectId      │ PRIMARY KEY (auto-generated)     │
│ username             │ String        │ REQUIRED, UNIQUE, 3–30 chars     │
│ email                │ String        │ REQUIRED, UNIQUE                 │
│ password             │ String        │ REQUIRED, hashed with bcrypt     │
│ avatar               │ String        │ Cloudinary URL, has default      │
│ bio                  │ String        │ Max 500 chars                    │
│ customStatus         │ String        │ Max 100 chars                    │
│ status               │ String        │ online│idle│dnd│offline          │
│ role                 │ String        │ user│moderator│admin             │
│ friends              │ [ObjectId]    │ FK → users._id                   │
│ blockedUsers         │ [ObjectId]    │ FK → users._id                   │
│ isBanned             │ Boolean       │ Default: false                   │
│ banReason            │ String        │ Reason for ban                   │
│ twoFactorEnabled     │ Boolean       │ Default: false                   │
│ twoFactorSecret      │ String        │ 2FA secret key                   │
│ oauthProvider        │ String        │ google│github│discord            │
│ oauthId              │ String        │ OAuth provider user ID           │
│ sessions             │ [Object]      │ {token, device, ip, lastActive}  │
│ subscription.tier    │ String        │ free│basic│premium               │
│ subscription.stripeId│ String        │ Stripe customer ID               │
│ createdAt            │ Date          │ Auto timestamp                   │
│ updatedAt            │ Date          │ Auto timestamp                   │
└──────────────────────┴───────────────┴──────────────────────────────────┘
  INDEXES: username (unique), email (unique)
```

---

## Table 2: `servers`
> Represents Discord-like servers (group spaces) where users join and interact.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                             servers                                    │
├──────────────────────┬───────────────┬──────────────────────────────────┤
│ Field                │ Type          │ Constraints / Info               │
├──────────────────────┼───────────────┼──────────────────────────────────┤
│ _id                  │ ObjectId      │ PRIMARY KEY                      │
│ name                 │ String        │ REQUIRED, 2–100 chars            │
│ icon                 │ String        │ Server icon URL                  │
│ description          │ String        │ Max 1000 chars                   │
│ owner                │ ObjectId      │ FK → users._id, REQUIRED         │
│ members[]            │ [Object]      │ Array of member objects           │
│  ├─ user             │ ObjectId      │ FK → users._id                   │
│  ├─ role             │ String        │ owner│admin│moderator│member     │
│  ├─ nickname         │ String        │ Server-specific nickname         │
│  └─ joinedAt         │ Date          │ When they joined                 │
│ channels             │ [ObjectId]    │ FK → channels._id                │
│ invites[]            │ [Object]      │ Array of invite objects           │
│  ├─ code             │ String        │ 8-char unique invite code        │
│  ├─ createdBy        │ ObjectId      │ FK → users._id                   │
│  ├─ expiresAt        │ Date          │ Expiry time                      │
│  ├─ maxUses          │ Number        │ Max uses allowed                 │
│  └─ uses             │ Number        │ Current use count                │
│ boostCount           │ Number        │ Default: 0                       │
│ settings             │ Object        │ {defaultChannel, verification}   │
│ createdAt            │ Date          │ Auto timestamp                   │
│ updatedAt            │ Date          │ Auto timestamp                   │
└──────────────────────┴───────────────┴──────────────────────────────────┘
  INDEXES: owner, "invites.code" (unique)
```

---

## Table 3: `channels`
> Chat channels inside servers, or direct message conversations.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            channels                                    │
├──────────────────────┬───────────────┬──────────────────────────────────┤
│ Field                │ Type          │ Constraints / Info               │
├──────────────────────┼───────────────┼──────────────────────────────────┤
│ _id                  │ ObjectId      │ PRIMARY KEY                      │
│ name                 │ String        │ REQUIRED, 1–100 chars            │
│ type                 │ String        │ text│voice│video│dm│group_dm     │
│ server               │ ObjectId      │ FK → servers._id (null for DMs)  │
│ members[]            │ [Object]      │ Array of member objects           │
│  ├─ user             │ ObjectId      │ FK → users._id                   │
│  └─ permissions      │ Object        │ {send, manage, manageChannel}    │
│ topic                │ String        │ Channel description              │
│ pinnedMessages       │ [ObjectId]    │ FK → messages._id                │
│ slowMode             │ Number        │ Seconds between msgs (0 = off)   │
│ lastActivity         │ Date          │ Last message timestamp           │
│ createdAt            │ Date          │ Auto timestamp                   │
│ updatedAt            │ Date          │ Auto timestamp                   │
└──────────────────────┴───────────────┴──────────────────────────────────┘
  INDEXES: server, type
```

---

## Table 4: `messages`
> Every chat message sent in any channel.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            messages                                    │
├──────────────────────┬───────────────┬──────────────────────────────────┤
│ Field                │ Type          │ Constraints / Info               │
├──────────────────────┼───────────────┼──────────────────────────────────┤
│ _id                  │ ObjectId      │ PRIMARY KEY                      │
│ content              │ String        │ Max 4000 chars                   │
│ sender               │ ObjectId      │ FK → users._id, REQUIRED         │
│ channel              │ ObjectId      │ FK → channels._id, REQUIRED      │
│ type                 │ String        │ text│image│video│file│system     │
│ attachments[]        │ [Object]      │ {url, type, name, size}          │
│ replyTo              │ ObjectId      │ FK → messages._id                │
│ thread               │ Object        │ {isThread, parentMsg, members}   │
│ reactions[]          │ [Object]      │ {emoji, users[]}                 │
│ readBy[]             │ [Object]      │ {user, readAt}                   │
│ isEdited             │ Boolean       │ Default: false                   │
│ isDeleted            │ Boolean       │ Default: false (soft delete)     │
│ createdAt            │ Date          │ Auto timestamp                   │
│ updatedAt            │ Date          │ Auto timestamp                   │
└──────────────────────┴───────────────┴──────────────────────────────────┘
  INDEXES: channel, sender, createdAt
```

---

## Table 5: `friendrequests`
> Tracks friend request status between two users.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          friendrequests                                 │
├──────────────────────┬───────────────┬──────────────────────────────────┤
│ Field                │ Type          │ Constraints / Info               │
├──────────────────────┼───────────────┼──────────────────────────────────┤
│ _id                  │ ObjectId      │ PRIMARY KEY                      │
│ from                 │ ObjectId      │ FK → users._id, REQUIRED         │
│ to                   │ ObjectId      │ FK → users._id, REQUIRED         │
│ status               │ String        │ pending│accepted│rejected        │
│ message              │ String        │ Optional message with request    │
│ createdAt            │ Date          │ Auto timestamp                   │
│ updatedAt            │ Date          │ Auto timestamp                   │
└──────────────────────┴───────────────┴──────────────────────────────────┘
  INDEXES: from, to, {from + to} (compound)
```

---

## Table 6: `gamesessions`
> Records every game played — scores, players, winners.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          gamesessions                                  │
├──────────────────────┬───────────────┬──────────────────────────────────┤
│ Field                │ Type          │ Constraints / Info               │
├──────────────────────┼───────────────┼──────────────────────────────────┤
│ _id                  │ ObjectId      │ PRIMARY KEY                      │
│ game                 │ String        │ tic-tac-toe│rock-paper-scissors  │
│                      │               │ │snake│quiz                     │
│ players[]            │ [Object]      │ Array of player objects           │
│  ├─ user             │ ObjectId      │ FK → users._id                   │
│  ├─ score            │ Number        │ Player's score                   │
│  └─ isReady          │ Boolean       │ Ready status                     │
│ state                │ Mixed         │ Current game board/state         │
│ status               │ String        │ waiting│in_progress│finished     │
│ winner               │ ObjectId      │ FK → users._id (null if draw)    │
│ round                │ Number        │ Current round                    │
│ maxRounds            │ Number        │ Total rounds                     │
│ startedAt            │ Date          │ Game start time                  │
│ finishedAt           │ Date          │ Game end time                    │
│ createdAt            │ Date          │ Auto timestamp                   │
└──────────────────────┴───────────────┴──────────────────────────────────┘
  INDEXES: game, status, "players.user"
```

---

## Table 7: `callsessions`
> Tracks voice and video call sessions.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          callsessions                                  │
├──────────────────────┬───────────────┬──────────────────────────────────┤
│ Field                │ Type          │ Constraints / Info               │
├──────────────────────┼───────────────┼──────────────────────────────────┤
│ _id                  │ ObjectId      │ PRIMARY KEY                      │
│ type                 │ String        │ voice│video│screen_share         │
│ channel              │ ObjectId      │ FK → channels._id                │
│ initiator            │ ObjectId      │ FK → users._id, REQUIRED         │
│ participants[]       │ [Object]      │ Array of participant objects      │
│  ├─ user             │ ObjectId      │ FK → users._id                   │
│  ├─ joinedAt         │ Date          │ When they joined                 │
│  ├─ leftAt           │ Date          │ When they left                   │
│  ├─ isMuted          │ Boolean       │ Default: false                   │
│  └─ isDeafened       │ Boolean       │ Default: false                   │
│ status               │ String        │ ringing│active│ended│missed      │
│ startedAt            │ Date          │ Call start time                  │
│ endedAt              │ Date          │ Call end time                    │
│ duration             │ Number        │ Duration in seconds              │
│ isGroup              │ Boolean       │ Default: false                   │
│ createdAt            │ Date          │ Auto timestamp                   │
└──────────────────────┴───────────────┴──────────────────────────────────┘
  INDEXES: initiator, status, channel
```

---

## Table 8: `payments`
> Records payment transactions (Stripe integration).

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            payments                                    │
├──────────────────────┬───────────────┬──────────────────────────────────┤
│ Field                │ Type          │ Constraints / Info               │
├──────────────────────┼───────────────┼──────────────────────────────────┤
│ _id                  │ ObjectId      │ PRIMARY KEY                      │
│ user                 │ ObjectId      │ FK → users._id, REQUIRED         │
│ stripePaymentIntentId│ String        │ Stripe payment intent ID         │
│ stripeInvoiceId      │ String        │ Stripe invoice ID                │
│ amount               │ Number        │ REQUIRED, amount paid            │
│ currency             │ String        │ Default: "usd"                   │
│ status               │ String        │ pending│succeeded│failed│refunded│
│ tier                 │ String        │ Which plan was purchased         │
│ description          │ String        │ Payment description              │
│ createdAt            │ Date          │ Auto timestamp                   │
└──────────────────────┴───────────────┴──────────────────────────────────┘
  INDEXES: user, status, stripePaymentIntentId
```

---

## Table 9: `subscriptions`
> Manages user premium plans and feature access.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          subscriptions                                 │
├──────────────────────┬───────────────┬──────────────────────────────────┤
│ Field                │ Type          │ Constraints / Info               │
├──────────────────────┼───────────────┼──────────────────────────────────┤
│ _id                  │ ObjectId      │ PRIMARY KEY                      │
│ user                 │ ObjectId      │ FK → users._id, UNIQUE           │
│ tier                 │ String        │ free│basic│premium               │
│ stripeCustomerId     │ String        │ Stripe customer ID               │
│ stripeSubscriptionId │ String        │ Stripe subscription ID           │
│ stripePriceId        │ String        │ Stripe price plan ID             │
│ status               │ String        │ active│cancelled│past_due│       │
│                      │               │ inactive                         │
│ features.customEmojis│ Boolean       │ Can use custom emojis            │
│ features.premiumBadge│ Boolean       │ Has premium badge                │
│ features.uploadLimit │ Number        │ Max upload size in MB            │
│ features.animatedAvtr│ Boolean       │ Animated avatar allowed          │
│ features.screenShare │ Boolean       │ Screen share allowed             │
│ currentPeriodStart   │ Date          │ Billing period start             │
│ currentPeriodEnd     │ Date          │ Billing period end               │
│ cancelAtPeriodEnd    │ Boolean       │ Default: false                   │
│ createdAt            │ Date          │ Auto timestamp                   │
│ updatedAt            │ Date          │ Auto timestamp                   │
└──────────────────────┴───────────────┴──────────────────────────────────┘
  INDEXES: user (unique), stripeCustomerId
```

---

## Table 10: `activitylogs`
> Auto-tracks user actions for admin monitoring.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          activitylogs                                  │
├──────────────────────┬───────────────┬──────────────────────────────────┤
│ Field                │ Type          │ Constraints / Info               │
├──────────────────────┼───────────────┼──────────────────────────────────┤
│ _id                  │ ObjectId      │ PRIMARY KEY                      │
│ user                 │ ObjectId      │ FK → users._id, REQUIRED         │
│ action               │ String        │ REQUIRED (login, logout,         │
│                      │               │ register, message_sent,          │
│                      │               │ game_finished, call_started,     │
│                      │               │ profile_updated, etc.)           │
│ details              │ Mixed         │ Extra info JSON                  │
│ ipAddress            │ String        │ User's IP address                │
│ userAgent            │ String        │ Browser/device info              │
│ createdAt            │ Date          │ Auto timestamp (TTL: 90 days)    │
└──────────────────────┴───────────────┴──────────────────────────────────┘
  INDEXES: user, action, createdAt (TTL: 90 days)
```

---

## Table 11: `adminlogs`
> Audit trail for all admin actions.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           adminlogs                                    │
├──────────────────────┬───────────────┬──────────────────────────────────┤
│ Field                │ Type          │ Constraints / Info               │
├──────────────────────┼───────────────┼──────────────────────────────────┤
│ _id                  │ ObjectId      │ PRIMARY KEY                      │
│ admin                │ ObjectId      │ FK → users._id, REQUIRED         │
│ action               │ String        │ REQUIRED (user_banned,           │
│                      │               │ user_unbanned, role_changed,     │
│                      │               │ channel_deleted, etc.)           │
│ target               │ ObjectId      │ FK → dynamic (refPath)           │
│ targetModel          │ String        │ User│Channel│Message│Payment     │
│ details              │ Mixed         │ Extra info (reason, etc.)        │
│ ipAddress            │ String        │ Admin's IP address               │
│ createdAt            │ Date          │ Auto timestamp                   │
└──────────────────────┴───────────────┴──────────────────────────────────┘
  INDEXES: admin, action, createdAt
```

---

## Relationships Diagram

```
┌──────────┐    owns     ┌──────────┐   contains   ┌──────────┐    has     ┌──────────┐
│  users   │────────────→│  servers │─────────────→│ channels │──────────→│ messages │
└──────────┘             └──────────┘              └──────────┘           └──────────┘
     │                                                  │
     │  sends        ┌────────────────┐                 │  hosts    ┌─────────────┐
     ├──────────────→│ friendrequests │                 ├─────────→│ gamesessions│
     │               └────────────────┘                 │          └─────────────┘
     │  plays        ┌─────────────┐                    │  hosts    ┌──────────────┐
     ├──────────────→│ gamesessions│                   └─────────→│ callsessions │
     │               └─────────────┘                               └──────────────┘
     │  joins        ┌──────────────┐
     ├──────────────→│ callsessions │
     │               └──────────────┘
     │  makes        ┌──────────┐
     ├──────────────→│ payments │
     │               └──────────┘
     │  has (1:1)    ┌───────────────┐
     ├──────────────→│ subscriptions │
     │               └───────────────┘
     │  auto-logs    ┌──────────────┐
     ├──────────────→│ activitylogs │
     │               └──────────────┘
     │  admin only   ┌───────────┐
     └──────────────→│ adminlogs │
                     └───────────┘
```

> **FK** = Foreign Key reference | All 11 table files are in `server/models/` | Connection: `server/config/db.js`
