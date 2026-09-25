# Nexus Setup Guide

Complete step-by-step guide to get Nexus running locally and deployed online.

---

## Phase 1: Local Development

### Step 1: Supabase Setup (2 min)

1. Go to [supabase.com](https://supabase.com) and create a free project
2. Wait for it to initialize (~1 min)
3. Go to **SQL Editor** in the sidebar
4. Create a new query and paste the entire contents of `supabase-schema.sql`
5. Click **Run** — the entire database is created
6. Go to **Storage** in the sidebar and create 3 buckets (all public):
   - `avatars`
   - `attachments`
   - `community-icons`
7. Copy your credentials:
   - Click **Settings** → **API**
   - Copy **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - Copy **Anon Public** key

### Step 2: Local Environment (1 min)

```bash
cd ~/Videos/projecyt/nexus
cp .env.example .env
```

Open `.env` and paste your Supabase credentials:
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### Step 3: Run Locally (1 min)

```bash
npm install  # Already done, but you can re-run if needed
npm run dev
```

Open **http://localhost:3000** in your browser.

### Step 4: Test It

1. Sign up with an email (doesn't need to be real, but must be valid format)
2. You're logged in! You're at the home screen
3. Click "Create Community" → pick "Gaming" → name it "Test"
4. You're now in the community with auto-generated channels
5. Click `#general` and send a message
6. Join voice channel by clicking `🔊 lounge`
7. Create a direct message by clicking a member

**✅ Local development works!**

---

## Phase 2: GitHub

### Step 1: Create GitHub Repo (2 min)

1. Go to [github.com/new](https://github.com/new)
2. **Repository name:** `nexus` (or anything)
3. **Description:** (optional) "Modern Discord-like chat app"
4. **Public** or **Private** — your choice
5. Click **Create repository**

### Step 2: Push Code (1 min)

```bash
cd ~/Videos/projecyt/nexus

git remote add origin https://github.com/YOUR_USERNAME/nexus.git
git branch -M main
git push -u origin main
```

Replace `YOUR_USERNAME` with your actual GitHub username.

**✅ Code is now on GitHub!**

---

## Phase 3: Deploy Online

### Option A: Vercel (Recommended — 1 click deploy)

**Cost:** Free tier available, auto-scales

1. Go to [vercel.com](https://vercel.com)
2. Click **Sign up** → choose **GitHub**
3. Authorize and click **Create Team**
4. Click **Add new project**
5. Click **Import Git Repository**
6. Find and select your `nexus` repo
7. Click **Import**
8. You're now in the configuration page:
   - **Framework Preset:** Make sure it says **Vite**
   - **Root Directory:** Leave blank
   - **Build & Development Settings:** Auto-detected
9. Scroll down to **Environment Variables**:
   - Add `VITE_SUPABASE_URL` with your Supabase URL
   - Add `VITE_SUPABASE_ANON_KEY` with your anon key
10. Click **Deploy**

**Wait 1-2 minutes...**

You'll get a live URL like `https://nexus-abc123.vercel.app`

**✅ Your app is live online!**

Every time you push to `main`, it auto-deploys.

---

### Option B: Netlify (Also free, similar steps)

1. Go to [netlify.com](https://netlify.com)
2. Click **Sign up** → **GitHub**
3. Authorize your GitHub account
4. Click **New site from Git**
5. Select your `nexus` repository
6. Netlify auto-detects the config:
   - Build command: `npm run build`
   - Publish directory: `dist`
7. Add environment variables (before clicking Deploy):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
8. Click **Deploy site**

You'll get a URL like `https://nexus-abc123.netlify.app`

**✅ Deployed!**

---

### Option C: Railway (VPS-style hosting)

1. Go to [railway.app](https://railway.app)
2. Click **Start a New Project**
3. Click **Deploy from GitHub repo**
4. Select your `nexus` repo
5. Railway reads `package.json` and `vite.config.ts` automatically
6. Add environment variables in the Railway dashboard
7. Click **Deploy**

You get a custom domain and more control.

---

## Phase 4: Custom Domain (Optional)

If you want `nexus.com` instead of `nexus-abc123.vercel.app`:

### Vercel:
1. In Vercel dashboard, click your project
2. Go to **Settings** → **Domains**
3. Add your domain
4. Update your domain registrar's DNS to point to Vercel

### Netlify:
1. Go to **Site settings** → **Domain management**
2. Click **Add a custom domain**
3. Follow instructions to update DNS

---

## Phase 5: Continuous Deployment

Every time you make changes:

```bash
git add .
git commit -m "Feature: add X"
git push origin main
```

Your cloud platform automatically rebuilds and deploys in ~30-60 seconds.

---

## Common Issues

### "Supabase credentials not working"
- Check your `.env` file has the exact values from Supabase API Settings
- Make sure you're in the right Supabase project

### "Deploy fails with build error"
- Check the build logs on Vercel/Netlify
- Run `npm run build` locally to see the error first
- Usually: missing env var or TypeScript error

### "Can't sign up / login"
- Check Supabase Authentication is enabled (it is by default)
- Go to Supabase → **Authentication** → **Providers** → Email is on
- Try from a private/incognito browser tab

### "Can't upload files"
- Check your Supabase Storage buckets exist and are public
- Bucket names must be exactly: `avatars`, `attachments`, `community-icons`
- Check RLS policies allow uploads (default is open)

### "Real-time messages not working"
- Go to Supabase → **Replication** → toggle on the tables (messages, reactions, etc.)
- Run this SQL to enable realtime:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE reactions;
```

---

## Recap

| Step | Time | Status |
|------|------|--------|
| 1. Supabase setup | 2 min | ✅ |
| 2. Environment config | 1 min | ✅ |
| 3. Run locally | 1 min | ✅ |
| 4. GitHub push | 1 min | ✅ |
| 5. Deploy (Vercel) | 2 min | ✅ |
| **Total** | **~7 min** | ✅ |

You now have a **fully functional, online, real-time chat app** that anyone can visit.

---

## Next Steps

- Invite users via community invite codes
- Add your custom domain
- Set up email notifications (Supabase + Resend)
- Add analytics (Vercel Analytics, PostHog)
- Create a landing page
- Add Discord OAuth for easy login
