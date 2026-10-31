# SkyBridge — Drone-Based Communication Relay System

```
TEAM A ESP32 ──LoRa──► DRONE RELAY ──LoRa──► TEAM B ESP32
   │ Wi-Fi                                      │ Wi-Fi
   └──────────────► Node.js API ◄───────────────┘
                     │  (Express + Socket.IO)
                     ▼
                  MongoDB Atlas
                     ▲
                     │  REST + WebSocket
               React dashboard (Vercel)
```

Two separate layers:

1. **Radio layer (LoRa / SX1278):** Team nodes ↔ drone relay. LoRa modules do not connect to the internet.
2. **IP layer (Wi-Fi / Ethernet):** Each ESP32 team node talks HTTPS to the backend.

Flight control is **not** part of this system. The drone only repeats radio packets.

---

## Repository layout

```
skybridge/
├── backend/            Node.js + Express + Mongoose + Socket.IO
│   ├── src/
│   │   ├── server.js, app.js, socket.js
│   │   ├── config/db.js
│   │   ├── models/     Device.js, Message.js
│   │   ├── middleware/ auth.js (device / operator / admin), error.js
│   │   ├── routes/     devices.js, messages.js
│   │   ├── services/   monitor.js (heartbeat timeout + message expiry)
│   │   └── utils/      crypto.js, httpError.js, validate.js, presenters.js
│   └── scripts/        register-device.js, simulate-device.js
├── frontend/           React + Vite + Tailwind (Apple-style UI)
├── firmware/
│   └── team_node/      team_node.ino (ESP32 + SX1278 + Wi-Fi)
└── README.md
```

---

## Authentication model

| Caller | Credential | Used for |
|---|---|---|
| Admin (you, from terminal) | `ADMIN_API_KEY` (server env only) | `POST /api/devices/register` |
| ESP32 team node | Per-device token (64 hex, shown once, stored as SHA-256 hash) | heartbeat, send, receive, status |
| Dashboard operator | `OPERATOR_API_KEY` (typed in Settings, kept in `sessionStorage`) | read devices/messages, live socket |

The dashboard never holds a device token. Device tokens are never shown again after registration.

**Online rule:** a device is `online` only if the backend received a valid heartbeat within `DEVICE_TIMEOUT_MS` (default 60 s). Being listed does not mean connected.

---

## API

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/health` | none | Health check |
| POST | `/api/devices/register` | admin key | Create device, returns `deviceId` and token once |
| POST | `/api/devices/heartbeat` | device token | Mark online, report RSSI/SNR |
| GET | `/api/devices` | operator key | List devices with computed status |
| POST | `/api/messages/send` | device token **or** operator key (+`from`) | Create message (`pending`) |
| POST | `/api/messages/:id/status` | device token (sender only) | `sent` after LoRa TX, or `failed` |
| POST | `/api/messages/receive` | device token (recipient) | Pull inbox; `ackIds` marks messages `delivered` |
| GET | `/api/messages` | operator key | Recent messages (`?team=A&status=...&limit=`) |

Rules: messages must go between Team A and Team B. Statuses: `pending → sent → delivered`, or `failed` (LoRa error, or no delivery within `MESSAGE_TTL_MS`).

Socket.IO events (operator room only): `device:update`, `message:new`, `message:update`.

---

## Hardware: what must exist for real delivery

The current design assumes **each team node has Wi-Fi or cellular internet** (ESP32 Wi-Fi, or an ESP32 next to a phone hotspot/router). Then:

- Team A sends the text through its ESP32 to the backend, gets a message ID, and transmits `MSG|id|toDevice|text` over LoRa.
- The drone repeats the packet. Team B hears it, and acks through its own internet connection.
- Team B also pulls its inbox every 15 s, so missed LoRa packets are caught up.

**If a team has no internet at all**, the ESP32 cannot reach the backend, so the message cannot get a delivery status. The required addition is a **LoRa-to-IP gateway**: a node with internet that bridges LoRa packets to the backend. This is not implemented in this version; it would be a separate gateway sketch (or a Raspberry Pi with an SX1278 HAT). Tell me if your field setup has no internet, and we will design that gateway next.

The drone relay itself is a LoRa repeater. Its telemetry is not part of this software. The dashboard shows relay status as **"No telemetry"** in live mode until a relay device is registered and heartbeats.

---

## Local setup

### 1. Backend
```bash
cd backend
cp .env.example .env        # fill MONGODB_URI and keys
npm install
npm run dev                 # http://localhost:5000
```

Generate strong keys, for example: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### 2. Register Team A and Team B
```bash
cd backend
ADMIN_API_KEY=your-admin-key node scripts/register-device.js "Team A Node" A
ADMIN_API_KEY=your-admin-key node scripts/register-device.js "Team B Node" B
```
Each command prints `DEVICE_ID` and `DEVICE_TOKEN`. **Copy the token now.** It cannot be shown again.

### 3. Test without hardware
```bash
DEVICE_TOKEN=<team-a-token> npm run simulate
```

### 4. Frontend
```bash
cd frontend
cp .env.example .env
npm install
npm run dev                 # http://localhost:5173
```
Open **Settings**, set mode to **Live hardware**, and enter the operator key.

### 5. ESP32 nodes
Open `firmware/team_node/team_node.ino`. Set Wi-Fi, `API_BASE`, `DEVICE_ID`, `DEVICE_TOKEN`, `TARGET_DEVICE` (the other team's ID), and the LoRa frequency you are licensed for. Flash one node as Team A and one as Team B.

Wiring (ESP32 VSPI to SX1278): SCK→18, MISO→19, MOSI→23, NSS→5, RST→14, DIO0→26, 3.3 V and GND.

---

## Deployment

### MongoDB Atlas
1. Create a free cluster.
2. Database Access: create a user with read/write on the `skybridge` database.
3. Network Access: allow `0.0.0.0/0` (or Render's outbound IPs).
4. Copy the connection string into `MONGODB_URI`, for example `mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/skybridge`.

### Render (backend)
Socket.IO needs a long-lived server, so the backend goes on Render, not Vercel.
- New **Web Service**, root directory `backend`
- Build command: `npm install`
- Start command: `npm start`
- Environment variables: `MONGODB_URI`, `ADMIN_API_KEY`, `OPERATOR_API_KEY`, `CLIENT_ORIGIN=https://your-app.vercel.app`, `DEVICE_TIMEOUT_MS=60000`, `MESSAGE_TTL_MS=600000`

### Vercel (frontend)
- Root directory `frontend`, framework preset Vite
- Environment variable: `VITE_API_URL=https://your-backend.onrender.com`
- `vercel.json` is included for SPA routing.

Never put `MONGODB_URI` or any API key in the frontend. `VITE_*` variables are public.

---

## Known limits in this version
- One active device per team is used by the UI (the first registered).
- ESP32 sketch uses `setInsecure()` for TLS. Pin the server CA before field use.
- No rate limiting yet. Add `express-rate-limit` on the device routes before public deployment.
- Operator access uses a shared key, not user accounts. Add login if several people operate the dashboard.
- LoRa frequency, spreading factor, and any relay protocol must match your drone relay hardware.
