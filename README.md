# ServerChat 🚀

> A full-stack real-time communication and entertainment platform built with **Next.js 14**, **Express.js**, **Socket.IO**, **MongoDB**, and **Redis**.

![License](https://img.shields.io/badge/license-MIT-blue) ![Node](https://img.shields.io/badge/node-18%2B-green) ![Next.js](https://img.shields.io/badge/next.js-14-black) ![Socket.IO](https://img.shields.io/badge/socket.io-4.7-purple)

---

## ✨ Features

### 💬 Communication
- **Real-Time Chat** — Channels, DMs, group chats, threads, reactions, file sharing
- **Voice & Video Calls** — WebRTC-based with screen sharing
- **Typing Indicators** — See who's typing in real-time
- **Read Receipts** — Know when messages are read
- **Message Search** — Full-text search across all channels

### 🎮 Entertainment
- **Built-in Games** — Tic-Tac-Toe, Rock-Paper-Scissors, Quiz, Word Guess
- **Watch Parties** — Synced video/music playback with friends
- **Leaderboards** — Compete with friends and track scores

### 🔒 Security
- **JWT Authentication** — Access + refresh token rotation
- **2FA (TOTP)** — Time-based one-time passwords
- **Face Recognition Login** — Biometric authentication
- **OAuth** — Google & GitHub sign-in
- **Rate Limiting** — Protection against brute-force attacks

### 👑 Administration
- **Admin Dashboard** — Real-time analytics and user management
- **Ban/Unban System** — With admin audit logging
- **Role Management** — Owner, admin, moderator, member roles

### 💳 Monetization
- **Stripe Integration** — Subscription tiers (Free, Basic, Premium)
- **Webhook Handling** — Automated subscription lifecycle management

---

## 🏗️ Architecture

```
ServerChat/
├── client/                     # Next.js 14 Frontend
│   ├── app/                    # App Router pages
│   │   ├── layout.js           # Root layout (Redux, Toaster)
│   │   ├── page.js             # Landing page
│   │   ├── login/              # Login page
│   │   ├── register/           # Registration page
│   │   ├── forgot-password/    # Password recovery
│   │   ├── channels/           # Main chat interface
│   │   └── games/              # Game center
│   ├── redux/                  # Redux Toolkit store
│   │   ├── store.js
│   │   ├── authSlice.js
│   │   ├── chatSlice.js
│   │   ├── uiSlice.js
│   │   └── gameSlice.js
│   ├── services/               # API & Socket clients
│   ├── hooks/                  # Custom React hooks
│   └── public/                 # Static assets
│
├── server/                     # Express.js Backend
│   ├── server.js               # Entry point
│   ├── config/                 # DB, Redis, Cloudinary, Stripe, Logger
│   ├── controllers/            # Route handlers (8 controllers)
│   ├── middleware/              # Auth, error, rate limit, upload, validation
│   ├── models/                 # Mongoose schemas (10 models)
│   ├── routes/                 # API routes (8 route files)
│   └── sockets/                # Real-time event handlers (5 modules)
│
├── nginx/                      # Reverse proxy config
├── docker-compose.yml          # Full-stack orchestration
└── package.json                # Monorepo root
```

---

## 🗄️ Database Models

| Model | Purpose |
|-------|---------|
| **User** | Auth, profile, 2FA, OAuth, friends, subscriptions |
| **Message** | Text, media, threads, reactions, read receipts |
| **Channel** | Text/voice/video, DMs, members, permissions |
| **GameSession** | Multiplayer game state and history |
| **FriendRequest** | Friend request lifecycle |
| **ActivityLog** | User action audit trail |
| **Subscription** | Stripe subscription management |
| **Payment** | Transaction records |
| **CallSession** | Voice/video call tracking |
| **AdminLog** | Admin action audit trail |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- Redis (optional, graceful fallback)

### Quick Start

```bash
# 1. Clone
git clone https://github.com/ARYAN3012-G/ServerChat.git
cd ServerChat

# 2. Environment
cp .env.example .env
# Edit .env with your credentials

# 3. Install dependencies
npm run install:all

# 4. Start development
npm run dev
# Server: http://localhost:5000
# Client: http://localhost:3000
```

### Docker Deployment

```bash
docker-compose up -d
# App: http://localhost (via Nginx)
```

---

## 📡 API Endpoints

| Route | Description |
|-------|-------------|
| `POST /api/auth/register` | Create account |
| `POST /api/auth/login` | Email/phone/username login |
| `POST /api/auth/verify-2fa` | Two-factor verification |
| `GET /api/users/:id` | Get user profile |
| `GET /api/channels` | List channels |
| `POST /api/channels` | Create channel |
| `GET /api/messages/channel/:id` | Get channel messages |
| `POST /api/friends/request` | Send friend request |
| `GET /api/games/active` | List active games |
| `GET /api/admin/dashboard` | Admin analytics |
| `POST /api/payments/checkout` | Stripe checkout |

---

## 🔌 Socket Events

| Event | Direction | Purpose |
|-------|-----------|---------|
| `message:send` | Client → Server | Send message |
| `message:new` | Server → Client | New message broadcast |
| `typing:start/stop` | Bidirectional | Typing indicators |
| `presence:online/offline` | Server → Client | User status |
| `game:create/join/move` | Bidirectional | Game actions |
| `call:initiate/answer/end` | Bidirectional | WebRTC signaling |
| `stream:sync` | Bidirectional | Watch party sync |

---

## 🛠️ Tech Stack

**Frontend:** Next.js 14 · React 18 · Redux Toolkit · Tailwind CSS · Framer Motion · Socket.io-client  
**Backend:** Express.js · Socket.IO · Mongoose · ioredis · JWT · bcrypt · Winston  
**Services:** MongoDB · Redis · Cloudinary · Stripe  
**DevOps:** Docker · Nginx · GitHub Actions

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

<p align="center">Built with ❤️ by <a href="https://github.com/ARYAN3012-G">ARYAN3012-G</a></p>
