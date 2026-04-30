# ⚡ Quick Setup Checklist

## 3 Things You MUST Do (5 minutes)

### 1️⃣ Get Supabase Keys (2 minutes)

**Go to:** https://supabase.com/dashboard/project/zydyaigtlvrylqkrbxhz

**Click:** Settings → API

**Copy these 2 keys into your `.env` file:**

```env
NEXT_PUBLIC_SUPABASE_ANON_KEY=paste_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=paste_service_role_key_here
```

---

### 2️⃣ Get OpenAI API Key (2 minutes)

**Go to:** https://platform.openai.com/api-keys

**Click:** "Create new secret key"

**Copy into your `.env` file:**

```env
OPENAI_API_KEY=sk-proj-paste_key_here
```

**Important:** Also set up billing:
- Go to: https://platform.openai.com/account/billing
- Add payment method
- Add $5 credits

---

### 3️⃣ Create Database Tables (1 minute)

**Go to:** https://supabase.com/dashboard/project/zydyaigtlvrylqkrbxhz

**Click:** SQL Editor → New query

**Copy ALL content from:** `supabase/schema.sql`

**Paste and click:** "Run"

**Verify:** Go to Table Editor, you should see tables

---

## ✅ That's It! Now Test:

```bash
# Install dependencies
npm install

# Start the app
npm run dev

# Open browser
http://localhost:3000

# Click "Create New Reel"
# Enter: "5 ways to save money"
# Click "Generate"
```

---

## 📝 Your `.env` Should Look Like:

```env
# ✅ FILL THESE IN:
NEXT_PUBLIC_SUPABASE_URL=https://zydyaigtlvrylqkrbxhz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...your_actual_key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...your_actual_key
DATABASE_URL=postgresql://postgres:Unforgiven@02111996@db.zydyaigtlvrylqkrbxhz.supabase.co:5432/postgres

OPENAI_API_KEY=sk-proj-...your_actual_key

# ⏭️ SKIP THESE FOR NOW (optional):
INSTAGRAM_APP_ID=your_instagram_app_id
INSTAGRAM_APP_SECRET=your_instagram_app_secret
INSTAGRAM_ACCESS_TOKEN=your_long_lived_access_token
NEWS_API_KEY=your_news_api_key_here
STABILITY_API_KEY=your_stability_api_key_here

# ✅ THESE ARE FINE AS-IS:
REDIS_URL=redis://localhost:6379
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
PYTHON_SERVICE_URL=http://localhost:8000
```

---

## 🎯 What You Can Do After This:

✅ Generate unlimited content
✅ Create viral hooks and scripts  
✅ Generate AI images
✅ Assemble videos
✅ Download and manually post

❌ Auto-post to Instagram (need Instagram setup - optional)

---

## 💰 Cost:

- **Supabase:** FREE
- **OpenAI:** ~$0.10 per reel
- **Total to start:** $5 in OpenAI credits

---

## ⚠️ Troubleshooting:

**"Can't find Supabase keys"**
→ Make sure you're on Settings → API page

**"OpenAI insufficient quota"**
→ Add billing at https://platform.openai.com/account/billing

**"Schema fails"**
→ Copy ALL content from schema.sql, paste in Supabase SQL Editor

---

## 🚀 Ready?

1. Fill in the 3 required items above
2. Run `npm install`
3. Run `npm run dev`
4. Generate your first reel!

**Need more details?** Read `SETUP_REQUIREMENTS.md`
