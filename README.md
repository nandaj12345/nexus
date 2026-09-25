# Nexus — Modern Community Chat

A clean, polished Discord-like community chat app built with React + Vite + Supabase.

## Features

- **Authentication** — Sign up, log in, log out with email/password
- **Communities** — Create, join via invite links, category-based with auto-generated channels
- **Real-time Messaging** — Send, receive, edit, delete, reply, react, mention
- **Threads** — Side-panel threads keep channels clean
- **File & Image Sharing** — Drag-and-drop or browse, inline image previews
- **Direct Messages** — Private 1-on-1 conversations with real-time updates
- **Voice Channels** — Join voice, mute/unmute, deafen, speaking indicator
- **Members Sidebar** — Online/offline status, role badges
- **Moderation** — Kick, ban, mute members, mod log
- **Search** — Full-text message search within channels
- **Profiles** — Avatar, display name, bio, custom status

---

## Quick Start

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. In the SQL Editor, run the entire contents of `supabase-schema.sql`
3. In Storage, create two buckets:
   - `avatars` — set to **public**
   - `attachments` — set to **public** (or private + signed URLs)
   - `community-icons` — set to **public**

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:
```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Find these in your Supabase project: **Settings → API**

### 3. Install & run

```bash
npm install
npm run dev
```

Open http://localhost:3000

---

## Project Structure

```
src/
├── components/
│   ├── auth/          AuthPage (login + signup)
│   ├── channel/       CreateChannelModal
│   ├── community/     CreateCommunityModal, JoinCommunityModal, CommunitySettingsModal
│   ├── layout/        AppLayout, CommunitySidebar, ChannelSidebar, MembersSidebar, HomeView
│   ├── messaging/     ChannelView, MessageList, MessageItem, MessageComposer, ThreadPanel, DMView, DMSidebar, SearchModal
│   ├── profile/       UserSettingsModal
│   ├── ui/            Avatar, Button, Input, Modal, Tooltip, ContextMenu
│   └── voice/         VoiceChannel
├── lib/
│   ├── supabase.ts    Supabase client
│   └── utils.ts       Helpers (dates, files, colors, etc.)
├── store/
│   ├── appStore.ts    App state (active community/channel, layout)
│   ├── authStore.ts   Auth state (user, session, profile)
│   └── messageStore.ts Messages + realtime subscriptions
├── styles/
│   └── globals.css    Tailwind base + custom utilities
└── types/index.ts     All TypeScript types
```

---

## Database Schema

Tables: `profiles`, `communities`, `community_members`, `roles`, `channels`, `messages`, `threads`, `reactions`, `attachments`, `dm_conversations`, `dm_participants`, `notifications`, `moderation_actions`, `voice_sessions`

Full schema with RLS policies and realtime config in `supabase-schema.sql`.

---

## Tech Stack

| Layer       | Technology                  |
|-------------|---------------------------  |
| Frontend    | React 18 + TypeScript       |
| Build       | Vite 5                      |
| Styling     | Tailwind CSS 3              |
| State       | Zustand                     |
| Backend     | Supabase (Auth + DB + RT)   |
| Icons       | Lucide React                |
| Dates       | date-fns                    |
| Toasts      | react-hot-toast             |

---

## Sharing Invite Links

When creating a community, an 8-character invite code is auto-generated.

Share the invite URL format: `https://yourapp.com?invite=XXXXXXXX`

Or just share the code — users can paste it in "Join Community".

---

## Deploy to Cloud

### Option 1: Vercel (Recommended — 1 click)

1. Push to GitHub (see below)
2. Go to [vercel.com](https://vercel.com), sign in with GitHub
3. Click "Import Project", select your `nexus` repo
4. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Click Deploy — live in seconds at `nexus.vercel.app` (or custom domain)

### Option 2: Netlify

1. Push to GitHub
2. Go to [netlify.com](https://netlify.com), sign in with GitHub
3. Click "Import an existing project", select your repo
4. Add the same environment variables
5. Deploy

### Option 3: Self-hosted

The app is just static HTML/CSS/JS. Host the `dist/` folder:
- [Railway](https://railway.app) — simple, free tier available
- [Render](https://render.com) — static site hosting
- Docker → any VPS (AWS, DigitalOcean, Linode, etc.)

---

## Push to GitHub

### 1. Create a GitHub repo

Go to [github.com/new](https://github.com/new), create a new repo called **nexus** (or any name)

### 2. Commit locally

```bash
cd ~/Videos/projecyt/nexus
git add .
git commit -m "Initial commit: Nexus MVP chat app"
```

### 3. Push to GitHub

```bash
git remote add origin https://github.com/YOUR_USERNAME/nexus.git
git branch -M main
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.

### 4. Enable GitHub Actions (optional — for auto-deploy)

Create `.github/workflows/deploy.yml` for auto-deploy on push to `main`.

### 5. Deploy

Once on GitHub:
- Go to Vercel/Netlify
- Click "Import from Git"
- Select your repo
- Add Supabase env vars
- Click Deploy

---

## Development Workflow

```bash
# Start local dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type check
npx tsc --noEmit

# Commit & push changes
git add .
git commit -m "Description of changes"
git push origin main
```

Auto-deploys to cloud whenever you push to `main`.


