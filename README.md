# Smart Healthcare System (SHS)

AI-powered first-line healthcare guidance, verified doctor consultations,
realtime chat, secure video calls, and nearby-care discovery — all in a
single deployable monorepo.

```
shs/
├── backend/      # Node + Express + MongoDB + Socket.io + LiveKit + Gemini
├── frontend/     # Next.js 14 (App Router) + Tailwind + Framer + Leaflet
└── README.md
```

---

## What's inside

- **AI Symptom Checker** — Hybrid medical engine. Extracts symptoms from
  free text, scores them against a 25+ disease knowledge base with TF-IDF
  weighting, asks targeted follow-up questions, and uses Gemini only as a
  natural-language *summarizer* — never as the diagnostic brain.
- **Auth** — JWT + bcrypt. Patient / Doctor / Admin roles.
- **Doctor portal** — Signup with credentials, profile editing, accept
  appointments, jump into chat or video.
- **Admin portal** — Doctor verification queue, platform stats.
- **Realtime chat** — Authenticated Socket.io: rooms, presence,
  typing, seen receipts, notifications.
- **Video consultations** — LiveKit token issuance bound to confirmed
  appointments.
- **Nearby care** — OpenStreetMap + Overpass API (no Google billing).
- **Cloudinary** uploads for documents and reports.

---

## Quick start (local)

### 0. Prerequisites
- Node.js 18+
- A MongoDB Atlas cluster (or local Mongo)
- Optional: Cloudinary, LiveKit, Gemini keys

### 1. Backend

```bash
cd backend
cp .env.example .env       # edit with your keys
npm install
npm run seed               # imports diseases.json into Mongo
npm run seed:admin         # creates admin@shs.dev / admin12345
npm run dev                # http://localhost:5000/health
```

Expected env vars:

```env
PORT=5000
CLIENT_ORIGIN=http://localhost:3000
MONGO_URI=mongodb+srv://...
JWT_SECRET=...long-random-string...
JWT_EXPIRES_IN=7d
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
LIVEKIT_URL=wss://your-livekit.cloud
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
GEMINI_API_KEY=...
```

### 2. Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev                # http://localhost:3000
```

`frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_APP_NAME=SHS
```

Open http://localhost:3000 → click **Get Started** → sign up.

---

## API surface

| Method | Path | Notes |
| ------ | ---- | ----- |
| POST   | `/api/auth/signup`        | Create patient or doctor |
| POST   | `/api/auth/login`         | Returns JWT |
| GET    | `/api/auth/me`            | Current user (auth) |
| GET    | `/api/doctors`            | Browse verified doctors |
| GET    | `/api/doctors/specialties`| Specialty list |
| POST   | `/api/appointments`       | Patient books |
| PATCH  | `/api/appointments/:id/status` | Doctor accepts/declines |
| POST   | `/api/ai/analyze`         | **Symptom engine** |
| GET    | `/api/ai/reports`         | History |
| POST   | `/api/video/token`        | LiveKit token (per appointment) |
| GET    | `/api/maps/nearby`        | OSM / Overpass POIs |
| GET    | `/api/chat/threads`       | Conversation list |
| GET    | `/api/chat/history?with=` | Per-peer history |
| POST   | `/api/upload`             | Cloudinary upload |
| GET    | `/api/admin/stats`        | Admin metrics |
| POST   | `/api/admin/doctors/:id/verify` | Approve/reject |

Sockets (Socket.io, JWT in `auth.token`):

- `chat:join { peerId }`
- `chat:message { peerId, content, attachmentUrl? }` (ack)
- `chat:typing { peerId, typing }`
- `chat:seen { peerId }`
- `presence:update`, `chat:notify`

---

## Folder map

### Backend
```
backend/src/
  app.js                  # express app + middleware + route mount
  server.js               # http + socket.io bootstrap
  config/                 # db, cloudinary
  models/                 # mongoose schemas
  controllers/            # request handlers per resource
  routes/                 # express routers
  services/
    symptomEngine.js      # TF-IDF symptom matcher
    gemini.service.js     # Gemini summarization (with fallback)
    token.service.js      # JWT signer
  sockets/index.js        # Socket.io chat server
  middleware/             # auth, validate, errors
  seed/
    seedDiseases.js
    seedAdmin.js
  data/diseases.json      # fallback dataset
```

### Frontend
```
frontend/
  app/
    page.tsx              # landing
    login/, signup/       # auth
    (app)/                # authed shell (sidebar)
      dashboard/
      ai-checker/         # main chatbot UI
      doctors/
      appointments/
      chat/               # realtime
      video/[id]/         # LiveKit room
      nearby/             # Leaflet map
      profile/
      admin/
  components/             # Sidebar, AuthGate, NearbyMap, etc
  lib/
    api.ts                # axios client + token interceptor
    auth.ts               # session + useAuth()
    socket.ts             # singleton socket
```

---

## Beginner explainer (one-liners)

- **Frontend** → what users see (Next.js, runs in their browser).
- **Backend** → server that holds business logic and talks to the database.
- **API** → URLs the frontend calls (`/api/...`) to fetch or save data.
- **MongoDB** → document database; each "collection" is a table-like list of JSON records.
- **JWT** → signed token the backend issues at login; the frontend stores it and sends it on every request.
- **Socket.io** → keeps a live connection so chat and presence update without refresh.
- **LiveKit** → managed WebRTC; backend mints a per-room token so clients can stream video securely.
- **Cloudinary** → stores user-uploaded files (IDs, prescriptions).
- **Gemini** → only used to write friendly natural-language summaries on top of the engine's output.

---

## Deploy

### Frontend → Vercel
1. Push this repo to GitHub.
2. Vercel → New Project → root = `frontend/`.
3. Build command: `npm run build`. Output: `.next`.
4. Env: `NEXT_PUBLIC_API_URL=https://your-backend.onrender.com`.
5. Deploy.

### Backend → Render (or Railway)
1. New Web Service → root = `backend/`.
2. Build: `npm install`. Start: `npm start`.
3. Env: copy `backend/.env.example` and fill values.
4. Set `CLIENT_ORIGIN` to your Vercel domain (comma-separated for multiple).
5. After first deploy, in the shell run:
   ```
   npm run seed
   npm run seed:admin
   ```

### Database → MongoDB Atlas
- Create a free cluster.
- Network Access → allow `0.0.0.0/0` (or Render egress IPs).
- Get the connection string and put it in `MONGO_URI`.

---

## Safety note

This product gives **indicative guidance only** and is not a medical
diagnosis. Every AI response includes a disclaimer, and red-flag symptoms
(chest pain, breathing difficulty, fainting) trigger an urgent-care CTA.
