# Quick Start Guide 🚀

Get your Instagram Reels automation up and running in 10 minutes!

## What You Need

1. **OpenAI API Key** - For content generation
   - Get it here: https://platform.openai.com/api-keys
   - You'll need billing set up (~$0.10 per reel)

2. **Supabase Account** - Already configured!
   - Your database is ready at: `db.zydyaigtlvrylqkrbxhz.supabase.co`
   - Just need to get your API keys

3. **Instagram Business Account** - For posting
   - Convert your Instagram to Business/Creator account
   - Link it to a Facebook Page

## 5-Minute Setup

### 1. Install Dependencies (2 minutes)

```bash
# Install Node.js packages
npm install

# Install Python packages
cd python-services
pip install -r requirements.txt
cd ..
```

### 2. Get Supabase Keys (1 minute)

1. Go to: https://supabase.com/dashboard/project/zydyaigtlvrylqkrbxhz
2. Click **Settings** → **API**
3. Copy these values:
   - `anon` `public` key
   - `service_role` `secret` key

### 3. Setup Database (1 minute)

1. In Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy all content from `supabase/schema.sql`
4. Paste and click **Run**

### 4. Configure .env File (1 minute)

Edit `.env` file and add your keys:

```env
# Supabase (from step 2)
NEXT_PUBLIC_SUPABASE_ANON_KEY=paste_your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=paste_your_service_role_key_here

# OpenAI (from step 1)
OPENAI_API_KEY=sk-paste_your_openai_key_here

# Instagram (we'll set this up later)
INSTAGRAM_ACCESS_TOKEN=leave_empty_for_now
```

### 5. Start the App (30 seconds)

```bash
# Terminal 1 - Start Next.js
npm run dev

# Terminal 2 - Start Python service
cd python-services
python main.py
```

## Test It Out! 🎉

1. Open http://localhost:3000
2. Click **"Create New Reel"**
3. Enter: "5 ways to save money on groceries"
4. Click **"Generate Reel"**
5. Watch AI create your content!

## What Just Happened?

✅ AI generated a viral hook
✅ Created a complete script
✅ Generated eye-catching images
✅ Wrote Instagram caption with hashtags
✅ Added a strong CTA

## Next: Connect Instagram (Optional)

To actually post to Instagram, you need to:

1. **Convert to Business Account:**
   - Instagram app → Settings → Account → Switch to Professional Account

2. **Create Facebook Page:**
   - Link your Instagram to a Facebook Page

3. **Get Access Token:**
   - Follow detailed guide in `SETUP.md` (Step 6)
   - Or use this tool: https://developers.facebook.com/tools/explorer/

4. **Add to .env:**
   ```env
   INSTAGRAM_ACCESS_TOKEN=your_token_here
   ```

## Without Instagram Connected

You can still:
- ✅ Generate unlimited content
- ✅ Create videos
- ✅ Download and manually post
- ✅ Test all features

## Common Issues

**"OpenAI API Error"**
- Check your API key is correct
- Verify billing is set up at https://platform.openai.com/account/billing

**"Supabase Connection Error"**
- Verify you ran the schema.sql in SQL Editor
- Check your anon key is correct

**"Python Service Not Running"**
- Install FFmpeg: `choco install ffmpeg` (Windows) or `brew install ffmpeg` (Mac)
- Install Python packages: `pip install -r python-services/requirements.txt`

## Tips for Best Results

### Content Topics That Work:
- "How to save $X in Y months"
- "X investment mistakes to avoid"
- "Best side hustles for 2024"
- "Passive income ideas that actually work"

### Choose the Right Tone:
- **Educational**: For how-to and tutorials
- **Motivational**: For inspiration and success stories
- **Urgent**: For time-sensitive tips
- **Casual**: For relatable, everyday advice

## What's Next?

1. **Generate 5-10 pieces of content** to build your queue
2. **Review and edit** to match your brand voice
3. **Set up Instagram** to start auto-posting
4. **Configure scheduling** for optimal posting times
5. **Track analytics** to see what performs best

## Need Help?

- Check `SETUP.md` for detailed instructions
- Check `README.md` for full documentation
- Open an issue on GitHub

## Pro Tips 💡

1. **Batch Create Content**: Generate 10 reels at once, schedule throughout the week
2. **Test Different Hooks**: Generate multiple versions, use the best one
3. **Trending Topics**: Use news-based generation for timely content
4. **Consistency**: Post 3-5 times per week for best growth
5. **Engage**: Respond to comments to boost engagement

---

**You're all set!** Start creating viral finance content on autopilot 🚀

Questions? Check the full `SETUP.md` guide or open an issue.
