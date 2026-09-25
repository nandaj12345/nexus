# Nexus — Quick Start (7 minutes)

## 1. Supabase (2 min)

```
supabase.com → New Project → SQL Editor
→ Paste supabase-schema.sql → Run
→ Storage → Create 3 buckets (avatars, attachments, community-icons)
→ Settings → API → Copy URL & Anon Key
```

## 2. .env (1 min)

```bash
cp .env.example .env
# Edit .env, paste Supabase credentials
```

## 3. Local (1 min)

```bash
npm run dev
# Visit http://localhost:3000
# Sign up → Create community → Chat!
```

## 4. GitHub (1 min)

```bash
git remote add origin https://github.com/YOUR_USERNAME/nexus.git
git branch -M main
git push -u origin main
```

## 5. Deploy (2 min)

**Vercel (recommended):**
- vercel.com → Sign in with GitHub
- Import project → Add env vars → Deploy

**Or Netlify:**
- netlify.com → Sign in with GitHub
- New site from Git → Add env vars → Deploy

**Done!** 🎉 Your app is live at `nexus-xxx.vercel.app`

---

## What You Get

✅ Real-time chat (communities, channels, DMs)
✅ Voice channels (WebAudio, mute/deafen)
✅ File sharing (drag-drop, image previews)
✅ Threads (side panel)
✅ Reactions & mentions
✅ Moderation (kick/ban/mute)
✅ User profiles & status
✅ Search
✅ Fully responsive
✅ Dark polished UI

---

## Quick Commands

```bash
npm run dev          # Local development
npm run build        # Production build
npm run preview      # Test production build
git push origin main # Auto-deploys to cloud
```

---

## Support

- See `README.md` for full features
- See `SETUP.md` for detailed troubleshooting
- Check `supabase-schema.sql` for database structure
