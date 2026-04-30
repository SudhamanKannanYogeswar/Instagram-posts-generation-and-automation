# Setup Guide - Instagram Reels Automation

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18+ and npm
- **Python** 3.9+
- **Redis** server
- **FFmpeg** (for video processing)
- **Git**

## Step 1: Clone and Install Dependencies

```bash
# Clone the repository (already done)
cd Instagram-posts-generation-and-automation

# Install Node.js dependencies
npm install

# Install Python dependencies
cd python-services
pip install -r requirements.txt
cd ..
```

## Step 2: Install FFmpeg

### Windows:
```bash
# Using Chocolatey
choco install ffmpeg

# Or download from: https://ffmpeg.org/download.html
```

### macOS:
```bash
brew install ffmpeg
```

### Linux:
```bash
sudo apt update
sudo apt install ffmpeg
```

## Step 3: Install and Start Redis

### Windows:
```bash
# Using Chocolatey
choco install redis-64

# Start Redis
redis-server
```

### macOS:
```bash
brew install redis
brew services start redis
```

### Linux:
```bash
sudo apt install redis-server
sudo systemctl start redis
```

## Step 4: Configure Supabase

1. Go to your Supabase project: https://supabase.com/dashboard
2. Navigate to **Settings** → **API**
3. Copy your:
   - Project URL
   - `anon` public key
   - `service_role` secret key

4. Run the database schema:
   - Go to **SQL Editor** in Supabase
   - Copy the contents of `supabase/schema.sql`
   - Paste and run it

## Step 5: Get OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Copy the key (you won't see it again!)

## Step 6: Setup Instagram Business Account

### Create Facebook App:
1. Go to https://developers.facebook.com/apps
2. Click "Create App"
3. Choose "Business" type
4. Fill in app details

### Add Instagram Basic Display:
1. In your app dashboard, add "Instagram Basic Display" product
2. Configure OAuth redirect URLs
3. Add test users

### Get Access Token:
1. Use Facebook's Graph API Explorer
2. Generate a User Access Token with permissions:
   - `instagram_basic`
   - `instagram_content_publish`
   - `pages_read_engagement`
3. Exchange for long-lived token (60 days)

### Convert to Instagram Business Account:
- Your Instagram account must be a Business or Creator account
- It must be linked to a Facebook Page

## Step 7: Configure Environment Variables

Edit the `.env` file with your credentials:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://zydyaigtlvrylqkrbxhz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_actual_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key
DATABASE_URL=postgresql://postgres:Unforgiven@02111996@db.zydyaigtlvrylqkrbxhz.supabase.co:5432/postgres

# OpenAI
OPENAI_API_KEY=sk-your-actual-openai-key

# Instagram
INSTAGRAM_APP_ID=your_facebook_app_id
INSTAGRAM_APP_SECRET=your_facebook_app_secret
INSTAGRAM_ACCESS_TOKEN=your_long_lived_token

# Redis
REDIS_URL=redis://localhost:6379

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

## Step 8: Start the Application

You need to run 3 services:

### Terminal 1 - Next.js Frontend:
```bash
npm run dev
```

### Terminal 2 - Python Video Service:
```bash
cd python-services
python main.py
```

### Terminal 3 - Background Worker (optional):
```bash
npm run worker
```

## Step 9: Access the Application

Open your browser and go to:
```
http://localhost:3000
```

## Quick Start Guide

### 1. Create Your First Reel

1. Click "Create New Reel" on the dashboard
2. Enter a finance topic (e.g., "How to save $10,000 in a year")
3. Select content tone (educational, motivational, etc.)
4. Click "Generate Reel"
5. Wait for AI to create content and video

### 2. Review and Approve

1. Preview the generated Reel
2. Edit if needed
3. Approve for posting

### 3. Schedule or Post

1. Choose posting time
2. Confirm to schedule
3. Content will auto-post to Instagram

## Troubleshooting

### Redis Connection Error:
```bash
# Check if Redis is running
redis-cli ping
# Should return: PONG
```

### FFmpeg Not Found:
```bash
# Verify FFmpeg installation
ffmpeg -version
```

### Supabase Connection Error:
- Check your DATABASE_URL is correct
- Verify your Supabase project is active
- Check if schema.sql was executed successfully

### Instagram API Errors:
- Ensure your Instagram account is a Business/Creator account
- Verify access token hasn't expired
- Check if your Facebook app is in Development or Live mode

### OpenAI API Errors:
- Verify your API key is correct
- Check if you have credits/billing set up
- Ensure you're not hitting rate limits

## Optional: News API Setup

For automatic content generation from trending news:

1. Go to https://newsapi.org/
2. Sign up for free API key
3. Add to `.env`:
```env
NEWS_API_KEY=your_news_api_key
```

## Production Deployment

### Recommended Platforms:

**Frontend (Next.js):**
- Vercel (recommended)
- Netlify
- AWS Amplify

**Python Service:**
- Railway
- Render
- AWS EC2

**Redis:**
- Redis Cloud
- AWS ElastiCache
- Upstash

### Environment Variables:
Make sure to set all environment variables in your production platform.

### Domain Setup:
Update `NEXT_PUBLIC_APP_URL` to your production domain.

## Support

If you encounter issues:
1. Check the logs in terminal
2. Verify all environment variables are set
3. Ensure all services are running
4. Check Supabase logs for database errors

## Next Steps

- Customize content templates in database
- Add your own background music
- Configure auto-posting schedule
- Set up analytics tracking
- Add more content categories

Enjoy automating your Instagram Reels! 🚀
