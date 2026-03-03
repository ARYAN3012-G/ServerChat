# ServerChat — Database Tables Explained
> Database: MongoDB (`serverchat`) | 11 Tables (Collections)

---

## 1. `users` — User Accounts
**File:** `User.js`

This is the main table. Every person who signs up gets a record here.

**What it stores:** Username, email, hashed password, profile picture, bio, online status, role (user/moderator/admin), friend list, blocked users list, device sessions, and optional 2FA/OAuth credentials.

**Example:** When someone registers with username "john123", a new document is created here. When they log in, their `status` changes to "online". When they update their profile pic, the `avatar` field gets a Cloudinary URL.

**Used by:** Login page, Register page, Settings page, Profile display everywhere.

---

## 2. `servers` — Discord-like Servers (Groups)
**File:** `Server.js`

A "server" is like a Discord server — a group space where people join, chat, and interact.

**What it stores:** Server name, icon, description, owner, list of members with their roles (owner/admin/moderator/member), channels list, invite codes, boost count, and server settings.

**Example:** When a user clicks "+" to create a server called "Gaming Hub", a new document is created with them as the owner. An 8-character invite code is auto-generated. Other users join by using this code.

**Used by:** Channels page sidebar (server list), Create Server modal, Join Server flow.

---

## 3. `channels` — Chat Channels
**File:** `Channel.js`

Channels are where conversations happen. They belong to a server, or can be direct messages (DMs).

**What it stores:** Channel name, type (text/voice/video/dm/group_dm), which server it belongs to, member list with permissions, pinned messages, slow mode setting, and last activity time.

**Example:** When someone creates a "#general" text channel inside a server, a new document links to that server. For DMs, the `server` field is null.

**Used by:** Channels page (channel list in sidebar), message sending, DM conversations.

---

## 4. `messages` — Chat Messages
**File:** `Message.js`

Every single chat message sent in any channel is stored here.

**What it stores:** Message text content, who sent it, which channel, message type (text/image/video/file), file attachments, reply references, thread info, emoji reactions, read receipts, and edit/delete status.

**Example:** When a user types "Hello everyone!" and hits send, a new message document is created linking to the channel and sender. If someone reacts with 👍, it's added to the `reactions` array.

**Used by:** Chat interface, message editing, reactions, reply system, file uploads.

---

## 5. `friendrequests` — Friend Request System
**File:** `FriendRequest.js`

Manages the friend request lifecycle — sending, accepting, and rejecting requests.

**What it stores:** Who sent the request (`from`), who receives it (`to`), current status (pending/accepted/rejected), and optional message.

**Example:** User A sends a friend request to User B → creates a document with status "pending". When User B accepts → status changes to "accepted" and both users are added to each other's `friends` array in the `users` table.

**Used by:** Friends page (send/accept/reject requests), friend list display.

---

## 6. `gamesessions` — Game Scores & History
**File:** `GameSession.js`

Records every game played — scores, winners, and game state for the in-app games.

**What it stores:** Which game (tic-tac-toe/rock-paper-scissors/snake/etc), player list with scores, game state, status (waiting/in_progress/finished), winner, round info, and timestamps.

**Example:** When a user plays Snake and gets a score of 50, a finished game session is created. The leaderboard aggregates all sessions to rank players by total score.

**Used by:** Games page (score saving after each game), Games lobby (Global Leaderboard), Admin page (Game Activity tab).

---

## 7. `callsessions` — Voice & Video Call Logs
**File:** `CallSession.js`

Tracks voice and video call sessions — who called whom, when, and for how long.

**What it stores:** Call type (voice/video/screen_share), which channel, who started it, participant list with join/leave times and mute status, call status (ringing/active/ended/missed), and duration.

**Example:** When User A starts a voice call in a channel, a call session is created with status "active". When the call ends, the `endedAt` is set and `duration` is calculated in seconds.

**Used by:** Call tracking API (`/api/calls/`), can be used for call history display.

---

## 8. `payments` — Payment Transaction History
**File:** `Payment.js`

Records every payment made through the app (tied to Stripe for processing).

**What it stores:** Which user paid, Stripe payment/invoice IDs, amount, currency, payment status (pending/succeeded/failed/refunded), and which subscription tier was purchased.

**Example:** When User A subscribes to the "premium" plan for $9.99/month, Stripe processes the payment and a record is created here with `status: "succeeded"` and `tier: "premium"`.

**Used by:** Payment webhook handling, Admin dashboard (total revenue stat), Settings page (payment history).

---

## 9. `subscriptions` — Premium Plans
**File:** `Subscription.js`

Manages which premium tier each user is on and what features they get.

**What it stores:** User reference (one subscription per user), tier (free/basic/premium), Stripe customer/subscription/price IDs, status (active/cancelled/past_due), feature flags (custom emojis, upload limit, animated avatar, etc.), and billing period dates.

**Example:** A free user upgrades to "basic" → their subscription status becomes "active", `uploadLimit` increases from 10MB to 50MB, and `customEmojis` is enabled.

**Used by:** Settings page (Subscription tab showing current plan), feature gating throughout the app.

---

## 10. `activitylogs` — User Activity Tracking
**File:** `ActivityLog.js`

Automatically logs important user actions for admin monitoring and analytics.

**What it stores:** Which user, what action (20 types: login, logout, register, message_sent, game_finished, call_started, profile_updated, etc.), additional details, IP address, and browser info.

**Example:** Every time a user logs in, a log entry is created: `{user: "john123", action: "login", ipAddress: "192.168.1.1"}`. When they finish a game, another entry: `{action: "game_finished", details: {game: "snake", score: 50}}`.

**Used by:** Admin page (Activity Logs tab), security auditing.

---

## 11. `adminlogs` — Admin Audit Trail
**File:** `AdminLog.js`

Records every action performed by admins for accountability and transparency.

**What it stores:** Which admin performed the action, what they did (8 types: user_banned, user_unbanned, user_role_changed, channel_deleted, message_deleted, etc.), which entity was affected (dynamic reference to User/Channel/Message/Payment), details, and admin's IP.

**Example:** When an admin bans user "spammer99", a log is created: `{admin: "admin1", action: "user_banned", target: "spammer99", details: {reason: "spam"}}`.

**Used by:** Admin page (Admin Audit tab), accountability tracking.

---

## How They Connect

```
User ──── owns ──── Server ──── contains ──── Channel ──── has ──── Message
  │                                              │
  ├── sends ──── FriendRequest                   ├── hosts ──── GameSession
  ├── plays ──── GameSession                     └── hosts ──── CallSession
  ├── joins ──── CallSession
  ├── makes ──── Payment
  ├── has ────── Subscription (1 per user)
  ├── creates ── ActivityLog (auto-tracked)
  └── performs ─ AdminLog (admin only)
```

> **Note:** All 11 tables are in the `server/models/` folder. The database connection is configured in `server/config/db.js` using MongoDB (Mongoose ORM).
