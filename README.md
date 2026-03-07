# Sentinal Worker — Phone App

> The remote control panel for your AI coding agents.

This is the **React Native / Expo** companion app for [Sentinal Worker](https://github.com/FrancoisCoding/sentinalworker) — a local AI command center that runs Claude Code and OpenAI Codex against your projects.

With this app you can:
- **Send tasks** to your desktop from anywhere (shell commands, Claude prompts, Codex tasks)
- **Watch execution** in real time via live log streaming
- **Approve or reject** high-risk commands with a single tap before they run
- **Monitor AI status** and daily spending across all agents

All communication goes through **Supabase Realtime** — the desktop app subscribes to the same channel and executes whatever the phone sends.

---

## Screenshots / Flow

```
┌──────────────┐    QR scan     ┌──────────────────────┐
│  Phone App   │ ─────────────► │   Desktop App        │
│              │                │   (Tauri + Next.js)  │
│  Tasks tab   │ ◄── Realtime ─ │   Task executing...  │
│  Send tab    │ ──── task ───► │   Claude running     │
│  Approval    │ ◄── request ── │   Needs approval     │
│  sheet       │ ─── approve ─► │   Continues          │
└──────────────┘                └──────────────────────┘
         ↕ Supabase Realtime (WebSocket)
```

---

## Features

### Task Management
- **Task list** with live status updates via Supabase Realtime subscriptions
- **Status badges**: queued (yellow), running (blue), waiting for approval (orange), completed (green), failed (red), rejected (gray)
- **Task detail screen** with live log stream that appends as the desktop executes
- Pull-to-refresh and auto-refresh on Realtime events

### Sending Tasks
- **Three executor types**: Shell (`$`), Claude (`C`), Codex (`X`)
- **Free-text command input** with optional project path
- **Quick actions**: pre-built one-tap commands (Fix lint, Run tests, Analyze repo, Git status)
- Payloads are **signed** before insertion to Supabase (Phase 3 upgrades to full Ed25519)

### Device Pairing
- **QR code scanner** — open Settings on the desktop app, scan the displayed QR
- Pairing request flow: phone → Supabase → desktop approves → linked
- Paired device name and connection status shown in the Tasks header
- Pairing credentials stored in **expo-secure-store** (encrypted on-device)

### Approval Flow
- When the desktop detects a high-risk command, it publishes an `approval_request` event to Supabase
- The phone app shows an **ApprovalSheet** bottom modal with the command
- Three options: **Approve**, **Reject**, **Always Allow**
- Response is signed and written back to Supabase; desktop reacts immediately
- Auto-rejects after 5 minutes if no response

### Settings
- Supabase URL and anon key stored securely in `expo-secure-store`
- Shows paired desktop name, connection status, phone ID
- Re-pair button to scan a new QR code

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Expo SDK 53 |
| Navigation | Expo Router v4 (file-based) |
| State | Jotai |
| Data fetching | TanStack Query |
| Validation | Zod |
| Secure storage | expo-secure-store |
| QR scanning | expo-camera |
| Push notifications | expo-notifications (Phase 3) |
| Realtime | Supabase JS client |
| Styling | NativeWind v4 (Tailwind for React Native) |
| Crypto | expo-crypto (Phase 3 → react-native-quick-crypto) |

---

## Project Structure

```
sentinal-worker-app/
├── app/
│   ├── _layout.tsx              # Root layout — providers, status bar, stack config
│   ├── (tabs)/
│   │   ├── _layout.tsx          # Tab bar (Tasks, Send, Settings)
│   │   ├── index.tsx            # Task list with Realtime subscription
│   │   ├── send.tsx             # Send task form + quick actions
│   │   └── settings.tsx         # Supabase config, pairing info
│   ├── tasks/
│   │   └── [id].tsx             # Task detail + live log stream
│   └── pair.tsx                 # QR scanner + pairing flow
├── src/
│   ├── components/
│   │   └── ApprovalSheet.tsx    # Bottom modal: Approve / Reject / Always Allow
│   └── lib/
│       ├── crypto.ts            # Phone ID (SecureStore), payload signing
│       ├── supabase.ts          # Supabase client (EXPO_PUBLIC_ env vars)
│       ├── store.ts             # Jotai atoms (tasks, logs, pairing state)
│       └── schemas.ts           # Zod schemas + TypeScript types
├── app.json                     # Expo config (scheme: sentinalworker, dark theme)
├── babel.config.js              # NativeWind babel preset
├── tailwind.config.js
└── package.json
```

---

## Getting Started

### Prerequisites

- [Node.js 20+](https://nodejs.org)
- [pnpm](https://pnpm.io) — `npm install -g pnpm`
- [Expo CLI](https://docs.expo.dev/get-started/installation/) — `npm install -g expo-cli`
- [Expo Go](https://expo.dev/go) on your phone (iOS or Android) for quick development
- A running [Sentinal Worker desktop app](https://github.com/FrancoisCoding/sentinalworker)
- A [Supabase](https://supabase.com) project with the Phase 1 + Phase 2 migrations applied

### Installation

```bash
git clone https://github.com/FrancoisCoding/sentinal-worker-app.git
cd sentinal-worker-app
pnpm install
```

### Environment Variables

Create a `.env.local` file:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Alternatively, enter these values in the app's **Settings** tab — they're saved to `expo-secure-store` and persist across sessions.

### Run

```bash
pnpm start
```

Scan the QR code in the terminal with **Expo Go** on your phone.

For platform-specific dev builds:
```bash
pnpm android   # Android emulator or device
pnpm ios       # iOS simulator (macOS only)
```

---

## Pairing with the Desktop

1. Open the **Sentinal Worker** desktop app
2. Navigate to **Settings** (⚙ in the sidebar)
3. A QR code is displayed under **Device Pairing**
4. In the phone app, tap **Pair** (top-right of Tasks tab)
5. Point the camera at the QR code
6. The desktop will show a pairing approval prompt — click **Approve**
7. The phone shows "Connected to Desktop" — pairing complete

The pairing stores the desktop's `device_id` in `expo-secure-store`. All future task submissions are associated with this device.

---

## Supabase Schema (required)

Run these migrations in your Supabase project:

**Phase 1** (`001_init.sql` from the desktop repo):
```sql
devices          -- desktop machines
tasks            -- task queue
task_events      -- log stream
```

**Phase 2** (`002_phase2.sql` from the desktop repo):
```sql
pairing_requests   -- phone→desktop pairing requests
paired_phones      -- approved phone registrations
approval_requests  -- high-risk command approvals
```

Find the migration files at [sentinalworker/supabase/migrations/](https://github.com/FrancoisCoding/sentinalworker/tree/main/supabase/migrations).

---

## Sending a Task

1. Tap the **Send** tab
2. Select executor type: **Shell**, **Claude**, or **Codex**
3. Enter your command or prompt
4. Optionally enter the project path on the desktop (e.g. `/Users/you/myproject`)
5. Tap **Send Task**

The task is signed with your phone's unique ID and inserted into Supabase. The desktop picks it up via Realtime, executes it, and streams logs back — visible in real time on the **Tasks** tab.

**Quick actions** (one-tap common tasks):
| Action | Type | Command |
|---|---|---|
| Fix lint | Claude | `Fix all lint errors` |
| Run tests | Shell | `npm test` |
| Analyze repo | Claude | `Analyze this repository and summarize key issues` |
| Git status | Shell | `git status` |

---

## Approval Flow

When the desktop detects a high-risk command, it sets the task to `waiting_for_approval` and publishes to the `task_events` table. The phone app:

1. Detects the `approval_request` event via Realtime
2. Shows the **ApprovalSheet** bottom modal with the exact command
3. You choose:
   - **Approve** — desktop proceeds with execution
   - **Reject** — task is cancelled and marked as `rejected`
   - **Always Allow** — approves now and adds a permanent allow-rule (Phase 4)
4. Your response is signed and written to `approval_requests` in Supabase
5. The desktop reads the response and continues or stops

The desktop auto-rejects after **5 minutes** if no response is received.

---

## Security Notes

### Phase 2 (current)
- Each phone has a unique `phone_id` stored in `expo-secure-store`
- Task payloads include `phone_id`, `nonce`, and `timestamp` for basic identity verification
- Supabase Row Level Security (RLS) is enabled on all tables

### Phase 3 (upcoming)
- **Ed25519 key pairs** generated on first launch, private key in `expo-secure-store`
- Every task payload signed with `phone_private_key`
- Desktop verifies signature against stored `phone_public_key`
- **ECDH shared secret** derived during pairing — all Supabase payloads encrypted with AES-GCM
- Supabase sees only ciphertext (blind relay)
- Nonce replay prevention + 30-second timestamp window

---

## Roadmap

- [x] Phase 2: Task list, send form, QR pairing, live logs, approval sheet, settings
- [ ] Phase 3: Ed25519 signing, ECDH + AES-GCM encryption, nonce store
- [ ] Phase 4: Push notifications for approvals and spending alerts, i18n (EN/PT/ES/FR/DE/JA/ZH), multi-device support

---

## Related

- **Desktop app**: [sentinalworker](https://github.com/FrancoisCoding/sentinalworker) — Tauri v2 + Next.js + Rust
