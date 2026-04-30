# Setup Checklist ✅

Use this checklist to get your Instagram Reels automation up and running!

## Prerequisites (5 minutes)

- [ ] Node.js 18+ installed
- [ ] Python 3.9+ installed
- [ ] Git installed
- [ ] Code editor (VS Code recommended)

## API Keys & Accounts (10 minutes)

### Supabase (Required)
- [ ] Go to https://supabase.com/dashboard/project/zydyaigtlvrylqkrbxhz
- [ ] Navigate to Settings → API
- [ ] Copy `anon` public key
- [ ] Copy `service_role` secret key
- [ ] Go to SQL Editor
- [ ] Run the schema from `supabase/schema.sql`

### OpenAI (Required)
- [ ] Go to https://platform.openai.com/api-keys
- [ ] Create new API key
- [ ] Copy the key
- [ ] Set up billing at https://platform.openai.com/account/billing

### Instagram (Optional - for posting)
- [ ] Convert Instagram to Business/Creator account
- [ ] Create/link Facebook Page
- [ ] Create Facebook App at https://developers.facebook.com
- [ ] Get access token with required permissions
- [ ] Exchange for long-lived token

### News API (Optional - for trending content)
- [ ] Go to https://newsapi.org
- [ ] Sign up for free account
- [ ] Copy API key

## Installation (5 minutes)

- [ ] Clone repository (already done!)
- [ ] Run `npm install`
- [ ] Run `cd python-services && pip install -r requirements.txt`
- [ ] Install FFmpeg:
  - Windows: `choco install ffmpeg`
  - Mac: `brew install ffmpeg`
  - Linux: `sudo apt install ffmpeg`
- [ ] Install Redis:
  - Windows: `choco install redis-64`
  - Mac: `brew install redis`
  - Linux: `sudo apt install redis-server`

## Configuration (5 minutes)

- [ ] Copy `.env.example` to `.env` (or edit existing `.env`)
- [ ] Add Supabase URL and keys
- [ ] Add OpenAI API key
- [ ] Add Instagram credentials (if available)
- [ ] Add News API key (if available)
- [ ] Verify all required fields are filled

## Start Services (2 minutes)

### Terminal 1 - Redis
- [ ] Run `redis-server`
- [ ] Verify it's running with `redis-cli ping` (should return PONG)

### Terminal 2 - Next.js
- [ ] Run `npm run dev`
- [ ] Wait for "Ready" message
- [ ] Open http://localhost:3000

### Terminal 3 - Python Service
- [ ] Run `cd python-services`
- [ ] Run `python main.py`
- [ ] Verify it starts on port 8000

## Test the Application (5 minutes)

- [ ] Open http://localhost:3000 in browser
- [ ] Click "Go to Dashboard"
- [ ] Click "Create New Reel"
- [ ] Enter test topic: "5 ways to save money on groceries"
- [ ] Select tone: "educational"
- [ ] Click "Generate Reel"
- [ ] Wait for content generation (1-2 minutes)
- [ ] Verify content is generated successfully

## Verify Each Component

### Frontend
- [ ] Landing page loads correctly
- [ ] Dashboard displays properly
- [ ] Create page is accessible
- [ ] No console errors

### Backend API
- [ ] Content generation endpoint works
- [ ] Database connection successful
- [ ] No server errors in terminal

### Database
- [ ] Schema is created in Supabase
- [ ] Tables are visible in Table Editor
- [ ] Can insert/query data

### Python Service
- [ ] Service starts without errors
- [ ] Health endpoint responds: http://localhost:8000/health
- [ ] FFmpeg is accessible

### AI Integration
- [ ] OpenAI API key is valid
- [ ] Content generation works
- [ ] Image generation works
- [ ] No rate limit errors

## Optional: Instagram Connection

- [ ] Instagram Business account connected
- [ ] Access token is valid
- [ ] Can fetch account info
- [ ] Test post works (or skip for now)

## Troubleshooting

If something doesn't work, check:

- [ ] All environment variables are set correctly
- [ ] No typos in API keys
- [ ] All services are running
- [ ] No port conflicts (3000, 8000, 6379)
- [ ] Internet connection is stable
- [ ] Firewall isn't blocking connections

## Common Issues

### "OpenAI API Error"
- [ ] Verify API key is correct
- [ ] Check billing is set up
- [ ] Ensure you have credits

### "Supabase Connection Error"
- [ ] Verify URL and keys are correct
- [ ] Check schema.sql was executed
- [ ] Ensure project is active

### "Python Service Not Starting"
- [ ] Verify Python 3.9+ is installed
- [ ] Check all pip packages installed
- [ ] Ensure FFmpeg is in PATH

### "Redis Connection Failed"
- [ ] Verify Redis is running
- [ ] Check port 6379 is available
- [ ] Try `redis-cli ping`

### "Video Generation Failed"
- [ ] Check FFmpeg is installed
- [ ] Verify Python service is running
- [ ] Check image URLs are accessible

## Next Steps

Once everything is working:

- [ ] Generate 5-10 test reels
- [ ] Experiment with different topics
- [ ] Try different tones
- [ ] Review generated content
- [ ] Customize templates (optional)
- [ ] Set up Instagram posting (if not done)
- [ ] Configure auto-generation schedule
- [ ] Invite team members (if applicable)

## Production Deployment (Optional)

- [ ] Choose hosting platform (Vercel, Railway, etc.)
- [ ] Set up production database
- [ ] Configure production environment variables
- [ ] Set up domain name
- [ ] Enable SSL/HTTPS
- [ ] Set up monitoring
- [ ] Configure backups
- [ ] Test production deployment

## Documentation Read

- [ ] Read `README.md` for overview
- [ ] Read `QUICK_START.md` for quick setup
- [ ] Read `SETUP.md` for detailed instructions
- [ ] Read `PROJECT_OVERVIEW.md` for architecture
- [ ] Bookmark for reference

## Learning & Customization

- [ ] Understand the codebase structure
- [ ] Review database schema
- [ ] Explore API endpoints
- [ ] Customize UI colors/branding
- [ ] Add custom content templates
- [ ] Modify video generation settings
- [ ] Adjust AI prompts for your style

## Success Criteria

You're ready to go when:

- [ ] ✅ All services start without errors
- [ ] ✅ Can generate content successfully
- [ ] ✅ Videos are created properly
- [ ] ✅ Dashboard displays correctly
- [ ] ✅ No critical errors in logs
- [ ] ✅ Can create at least 3 reels end-to-end

## Support

If you're stuck:

1. Check the error messages carefully
2. Review the relevant documentation
3. Search for the error online
4. Check GitHub issues
5. Ask for help with specific error details

## Celebrate! 🎉

- [ ] You've successfully set up an AI-powered Instagram automation platform!
- [ ] Share your first generated reel
- [ ] Start building your content library
- [ ] Watch your Instagram grow on autopilot

---

**Pro Tip**: Don't try to do everything at once. Get the basic content generation working first, then add Instagram posting, then automation features.

**Remember**: This is YOUR platform. Customize it, improve it, make it yours!

Good luck! 🚀
