# 🔑 Setup Requirements - What You Need to Fill In

## Quick Overview

To make this **fully operational**, you need to fill in **3 required items** and optionally 2 more for full features.

---

## ✅ REQUIRED (Must Have)

### 1. **Supabase Keys** (2 keys needed)

**What:** Your database connection keys

**Where to get them:**
1. Go to: https://supabase.com/dashboard/project/zydyaigtlvrylqkrbxhz
2. Click **Settings** (gear icon in sidebar)
3. Click **API** in the settings menu
4. You'll see two keys:

**Copy these into your `.env` file:**

```env
# Find "anon public" key and copy it here:
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Find "service_role secret" key and copy it here:
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Cost:** FREE (Supabase free tier is plenty)

---

### 2. **OpenAI API Key** (1 key needed)

**What:** For AI content and image generation

**Where to get it:**
1. Go to: https://platform.openai.com/api-keys
2. Click **"Create new secret key"**
3. Give it a name (e.g., "Instagram Reels")
4. Copy the key (you won't see it again!)

**Copy into your `.env` file:**

```env
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxx
```

**Important:** You also need to set up billing:
1. Go to: https://platform.openai.com/account/billing
2. Add a payment method
3. Add at least $5 in credits

**Cost:** ~$0.10 per reel (very cheap!)
- GPT-4 for content: ~$0.03
- DALL-E 3 for images: ~$0.04-0.08
- Total per reel: ~$0.10

---

### 3. **Run Database Schema** (One-time setup)

**What:** Create the database tables

**How to do it:**
1. Go to: https://supabase.com/dashboard/project/zydyaigtlvrylqkrbxhz
2. Click **SQL Editor** in the sidebar
3. Click **"New query"**
4. Open the file `supabase/schema.sql` in your project
5. Copy ALL the content
6. Paste into Supabase SQL Editor
7. Click **"Run"** (or press Ctrl+Enter)

**You should see:** "Success. No rows returned"

**Verify it worked:**
- Click **Table Editor** in sidebar
- You should see tables like: `users`, `content_requests`, `generated_content`, `reels`, etc.

---

## 🎯 OPTIONAL (For Full Features)

### 4. **Instagram Connection** (Optional - for auto-posting)

**What:** To automatically post to Instagram

**When you need it:** Only if you want auto-posting. You can skip this and manually download/post videos.

**How to get it:**

#### Step 1: Convert Instagram to Business Account
1. Open Instagram app
2. Go to **Settings** → **Account**
3. Click **Switch to Professional Account**
4. Choose **Business** or **Creator**
5. Link to a Facebook Page (create one if needed)

#### Step 2: Create Facebook App
1. Go to: https://developers.facebook.com/apps
2. Click **"Create App"**
3. Choose **"Business"** type
4. Fill in app details
5. Add **Instagram Basic Display** product

#### Step 3: Get Access Token
This is complex, so here's a simple way:
1. Use Facebook's Graph API Explorer: https://developers.facebook.com/tools/explorer/
2. Select your app
3. Get User Token with these permissions:
   - `instagram_basic`
   - `instagram_content_publish`
   - `pages_read_engagement`
4. Exchange for long-lived token (60 days)

**Copy into your `.env` file:**

```env
INSTAGRAM_APP_ID=your_facebook_app_id
INSTAGRAM_APP_SECRET=your_facebook_app_secret
INSTAGRAM_ACCESS_TOKEN=your_long_lived_token
```

**Alternative:** Skip this for now and manually post videos. You can add it later!

**Cost:** FREE

---

### 5. **News API** (Optional - for trending content)

**What:** To auto-generate content from trending finance news

**Where to get it:**
1. Go to: https://newsapi.org/
2. Click **"Get API Key"**
3. Sign up (free)
4. Copy your API key

**Copy into your `.env` file:**

```env
NEWS_API_KEY=your_news_api_key_here
```

**Cost:** FREE (100 requests/day)

---

## 📝 Your Complete `.env` File Should Look Like:

```env
# Supabase (REQUIRED - Get from Supabase dashboard)
NEXT_PUBLIC_SUPABASE_URL=https://zydyaigtlvrylqkrbxhz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5ZHlhaWd0bHZyeWxxa3JieGh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2ODk1NjcwMDAsImV4cCI6MjAwNTE0MzAwMH0.xxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5ZHlhaWd0bHZyeWxxa3JieGh6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY4OTU2NzAwMCwiZXhwIjoyMDA1MTQzMDAwfQ.xxxxx
DATABASE_URL=postgresql://postgres:Unforgiven@02111996@db.zydyaigtlvrylqkrbxhz.supabase.co:5432/postgres

# OpenAI (REQUIRED - Get from OpenAI)
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Instagram (OPTIONAL - Only for auto-posting)
INSTAGRAM_APP_ID=your_instagram_app_id
INSTAGRAM_APP_SECRET=your_instagram_app_secret
INSTAGRAM_ACCESS_TOKEN=your_long_lived_access_token

# News API (OPTIONAL - For trending content)
NEWS_API_KEY=your_news_api_key_here

# These are fine as-is (no changes needed)
REDIS_URL=redis://localhost:6379
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
PYTHON_SERVICE_URL=http://localhost:8000
STABILITY_API_KEY=your_stability_api_key_here
```

---

## 🚀 Minimum to Get Started (5 minutes)

**You only need these 3 things:**

1. ✅ **Supabase anon key** (from Supabase dashboard)
2. ✅ **Supabase service_role key** (from Supabase dashboard)
3. ✅ **OpenAI API key** (from OpenAI)
4. ✅ **Run schema.sql** in Supabase

**That's it!** You can generate content and create videos.

---

## 🎯 What You Can Do With Minimum Setup

### ✅ With Just Required Items:
- Generate unlimited content
- Create viral hooks and scripts
- Generate AI images
- Assemble videos
- Download videos
- Test everything

### ❌ What You Can't Do Yet:
- Auto-post to Instagram (need Instagram setup)
- Generate from trending news (need News API)

**But you can add these later!**

---

## 📋 Step-by-Step Checklist

### Phase 1: Minimum Setup (5 minutes)

- [ ] Go to Supabase dashboard
- [ ] Copy `anon` key to `.env`
- [ ] Copy `service_role` key to `.env`
- [ ] Go to OpenAI
- [ ] Create API key
- [ ] Add payment method and credits
- [ ] Copy OpenAI key to `.env`
- [ ] Go to Supabase SQL Editor
- [ ] Run `supabase/schema.sql`
- [ ] Verify tables created

### Phase 2: Test It (2 minutes)

- [ ] Run `npm install`
- [ ] Run `npm run dev`
- [ ] Open http://localhost:3000
- [ ] Click "Create New Reel"
- [ ] Enter a topic
- [ ] Click "Generate"
- [ ] Verify content is generated

### Phase 3: Optional Features (Later)

- [ ] Set up Instagram (if you want auto-posting)
- [ ] Get News API key (if you want trending content)
- [ ] Install Redis (if you want background jobs)
- [ ] Set up Python service (if you want video generation)

---

## 💰 Cost Summary

| Item | Cost | Required? |
|------|------|-----------|
| Supabase | FREE | ✅ Yes |
| OpenAI | ~$0.10/reel | ✅ Yes |
| Instagram | FREE | ❌ Optional |
| News API | FREE | ❌ Optional |
| Hosting | FREE | ❌ Optional |
| **Total to Start** | **~$5 OpenAI credits** | **That's it!** |

---

## 🔧 Installation Requirements

### Software You Need Installed:

**Required:**
- Node.js 18+ (check: `node --version`)
- npm (comes with Node.js)

**Optional (for video generation):**
- Python 3.9+ (check: `python --version`)
- FFmpeg (check: `ffmpeg -version`)
- Redis (check: `redis-cli ping`)

**Install commands:**

```bash
# Windows (using Chocolatey)
choco install nodejs python ffmpeg redis-64

# Mac (using Homebrew)
brew install node python ffmpeg redis

# Linux (Ubuntu/Debian)
sudo apt install nodejs npm python3 python3-pip ffmpeg redis-server
```

---

## ⚠️ Common Issues

### "Can't find Supabase keys"

**Solution:**
1. Make sure you're logged into Supabase
2. Go to the correct project: https://supabase.com/dashboard/project/zydyaigtlvrylqkrbxhz
3. Click Settings → API
4. Keys are at the bottom of the page

### "OpenAI API error: Insufficient quota"

**Solution:**
1. Go to https://platform.openai.com/account/billing
2. Add payment method
3. Add at least $5 in credits
4. Wait 5 minutes for activation

### "Schema.sql fails to run"

**Solution:**
1. Make sure you copied ALL the content
2. Run it in Supabase SQL Editor (not locally)
3. Check for any error messages
4. Try running in smaller chunks if needed

---

## ✅ Verification

### How to know it's working:

1. **Supabase:**
   - Tables visible in Table Editor
   - No connection errors

2. **OpenAI:**
   - Content generates without errors
   - Images are created

3. **Application:**
   - `npm run dev` starts without errors
   - Can access http://localhost:3000
   - Can create content

---

## 🎉 You're Ready When:

- [ ] `.env` file has Supabase keys
- [ ] `.env` file has OpenAI key
- [ ] Database schema is created
- [ ] `npm run dev` works
- [ ] Can generate content
- [ ] No errors in console

---

## 🚀 Next Steps After Setup

1. **Generate 5 test reels** to understand the workflow
2. **Customize content** to match your style
3. **Set up Instagram** (if you want auto-posting)
4. **Create posting schedule**
5. **Start growing your audience!**

---

## 📞 Need Help?

If you get stuck:
1. Check TROUBLESHOOTING.md
2. Read error messages carefully
3. Verify all keys are correct
4. Make sure no typos in `.env`
5. Restart the application

---

## 💡 Pro Tips

1. **Start with minimum setup** - Get it working first
2. **Test with one reel** - Make sure everything works
3. **Add features gradually** - Instagram, news, etc.
4. **Keep API keys secret** - Never commit `.env` to git
5. **Monitor costs** - Check OpenAI usage dashboard

---

**That's everything you need!** 🎉

The minimum setup takes just **5 minutes** and costs about **$5 in OpenAI credits** to get started.

**Ready to begin?** Follow the checklist above!
