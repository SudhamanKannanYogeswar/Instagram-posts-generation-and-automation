# Troubleshooting Guide 🔧

Common issues and how to fix them.

---

## Installation Issues

### "npm install" fails

**Problem**: Package installation errors

**Solutions**:
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install

# If still failing, try with legacy peer deps
npm install --legacy-peer-deps
```

### "pip install" fails

**Problem**: Python package installation errors

**Solutions**:
```bash
# Upgrade pip
python -m pip install --upgrade pip

# Install with verbose output to see errors
pip install -r requirements.txt -v

# Try installing packages individually
pip install fastapi uvicorn moviepy Pillow numpy requests python-dotenv
```

### FFmpeg not found

**Problem**: `ffmpeg: command not found`

**Solutions**:

**Windows**:
```bash
# Using Chocolatey
choco install ffmpeg

# Or download from https://ffmpeg.org/download.html
# Add to PATH manually
```

**Mac**:
```bash
brew install ffmpeg
```

**Linux**:
```bash
sudo apt update
sudo apt install ffmpeg
```

**Verify installation**:
```bash
ffmpeg -version
```

---

## Database Issues

### "Connection refused" to Supabase

**Problem**: Can't connect to database

**Solutions**:
1. Check your `DATABASE_URL` in `.env`
2. Verify Supabase project is active
3. Check internet connection
4. Verify credentials are correct

```bash
# Test connection with psql
psql "postgresql://postgres:Unforgiven@02111996@db.zydyaigtlvrylqkrbxhz.supabase.co:5432/postgres"
```

### "Table does not exist"

**Problem**: Database schema not created

**Solutions**:
1. Go to Supabase dashboard
2. Navigate to SQL Editor
3. Copy contents of `supabase/schema.sql`
4. Paste and click "Run"
5. Verify tables in Table Editor

### "Permission denied" on database

**Problem**: Wrong credentials or permissions

**Solutions**:
1. Use `service_role` key for server-side operations
2. Use `anon` key for client-side operations
3. Check Row Level Security (RLS) policies
4. Verify user has correct permissions

---

## API Issues

### OpenAI API Errors

#### "Invalid API key"

**Problem**: Wrong or expired API key

**Solutions**:
1. Go to https://platform.openai.com/api-keys
2. Create new API key
3. Update `.env` file
4. Restart the application

#### "Insufficient quota"

**Problem**: No credits or billing not set up

**Solutions**:
1. Go to https://platform.openai.com/account/billing
2. Add payment method
3. Add credits
4. Wait a few minutes for activation

#### "Rate limit exceeded"

**Problem**: Too many requests

**Solutions**:
1. Wait a few minutes
2. Implement request throttling
3. Upgrade to higher tier plan
4. Add retry logic with exponential backoff

### Instagram API Errors

#### "Invalid access token"

**Problem**: Token expired or invalid

**Solutions**:
1. Tokens expire after 60 days
2. Generate new long-lived token
3. Update `.env` file
4. Restart application

#### "Permissions error"

**Problem**: Missing required permissions

**Solutions**:
Required permissions:
- `instagram_basic`
- `instagram_content_publish`
- `pages_read_engagement`

Regenerate token with all permissions.

#### "Account not eligible"

**Problem**: Instagram account not Business/Creator

**Solutions**:
1. Open Instagram app
2. Go to Settings → Account
3. Switch to Professional Account
4. Choose Business or Creator
5. Link to Facebook Page

---

## Service Issues

### Next.js won't start

**Problem**: Port 3000 already in use

**Solutions**:
```bash
# Find process using port 3000
# Windows
netstat -ano | findstr :3000

# Mac/Linux
lsof -i :3000

# Kill the process or use different port
PORT=3001 npm run dev
```

### Python service won't start

**Problem**: Port 8000 already in use or missing dependencies

**Solutions**:
```bash
# Check if port is in use
# Windows
netstat -ano | findstr :8000

# Mac/Linux
lsof -i :8000

# Run on different port
uvicorn main:app --port 8001

# Check all dependencies installed
pip list | grep -E "fastapi|uvicorn|moviepy"
```

### Redis connection failed

**Problem**: Redis not running

**Solutions**:
```bash
# Check if Redis is running
redis-cli ping
# Should return: PONG

# Start Redis
# Windows
redis-server

# Mac
brew services start redis

# Linux
sudo systemctl start redis

# Check Redis status
redis-cli info server
```

---

## Content Generation Issues

### "Content generation failed"

**Problem**: AI generation error

**Solutions**:
1. Check OpenAI API key is valid
2. Verify you have credits
3. Check internet connection
4. Look at error message in console
5. Try simpler topic
6. Reduce content length

### "Image generation failed"

**Problem**: DALL-E error

**Solutions**:
1. Check API key and credits
2. Verify image prompt is appropriate
3. Check for content policy violations
4. Try different image description
5. Check API status: https://status.openai.com

### "Video generation failed"

**Problem**: Python service error

**Solutions**:
1. Check Python service is running
2. Verify FFmpeg is installed
3. Check image URLs are accessible
4. Look at Python service logs
5. Verify disk space available
6. Check file permissions

---

## UI Issues

### Page won't load

**Problem**: Frontend error

**Solutions**:
1. Check browser console for errors
2. Clear browser cache
3. Try incognito/private mode
4. Check if Next.js is running
5. Verify no JavaScript errors

### Styles not loading

**Problem**: CSS not compiled

**Solutions**:
```bash
# Rebuild Tailwind CSS
npm run build

# Clear Next.js cache
rm -rf .next

# Restart dev server
npm run dev
```

### Images not displaying

**Problem**: Image URLs or paths incorrect

**Solutions**:
1. Check image URLs are valid
2. Verify Supabase storage is configured
3. Check CORS settings
4. Verify image format is supported
5. Check browser network tab

---

## Performance Issues

### Slow content generation

**Problem**: Takes too long to generate

**Solutions**:
1. Check internet speed
2. Verify API response times
3. Use faster OpenAI model (gpt-3.5-turbo)
4. Reduce image generation quality
5. Implement caching

### High API costs

**Problem**: Spending too much on APIs

**Solutions**:
1. Use GPT-3.5 instead of GPT-4
2. Reduce max_tokens in prompts
3. Cache generated content
4. Batch requests
5. Implement rate limiting

### Database slow

**Problem**: Queries taking too long

**Solutions**:
1. Check indexes are created
2. Optimize queries
3. Use connection pooling
4. Upgrade Supabase plan
5. Add caching layer (Redis)

---

## Deployment Issues

### Vercel deployment fails

**Problem**: Build errors on Vercel

**Solutions**:
1. Check build logs
2. Verify all environment variables set
3. Check Node.js version compatibility
4. Ensure all dependencies in package.json
5. Test build locally: `npm run build`

### Environment variables not working

**Problem**: Variables not accessible

**Solutions**:
1. Prefix client-side vars with `NEXT_PUBLIC_`
2. Restart application after changes
3. Check `.env` file is in root directory
4. Verify no typos in variable names
5. Check deployment platform has vars set

### CORS errors

**Problem**: Cross-origin request blocked

**Solutions**:
1. Add domain to Supabase allowed origins
2. Configure CORS in API routes
3. Check Instagram API settings
4. Verify Python service CORS config

---

## Common Error Messages

### "Module not found"

**Solution**:
```bash
npm install
# or
pip install -r requirements.txt
```

### "Cannot find module '@/...' "

**Solution**:
Check `tsconfig.json` has correct paths:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### "Unexpected token"

**Solution**:
- Check for syntax errors
- Verify JSON is valid
- Check for missing commas or brackets

### "Failed to fetch"

**Solution**:
- Check API endpoint is correct
- Verify service is running
- Check network connection
- Look at browser network tab

---

## Debug Mode

### Enable verbose logging

**Next.js**:
```bash
DEBUG=* npm run dev
```

**Python**:
```python
# In main.py
import logging
logging.basicConfig(level=logging.DEBUG)
```

**Supabase**:
```typescript
// In supabase.ts
const supabase = createClient(url, key, {
  auth: {
    debug: true
  }
})
```

---

## Getting Help

### Before asking for help:

1. ✅ Check this troubleshooting guide
2. ✅ Read error messages carefully
3. ✅ Check browser console
4. ✅ Check terminal logs
5. ✅ Search error message online
6. ✅ Check GitHub issues

### When asking for help, include:

1. **Error message** (full text)
2. **What you were doing** (steps to reproduce)
3. **Environment** (OS, Node version, Python version)
4. **Logs** (from terminal and browser console)
5. **What you've tried** (solutions attempted)

### Useful commands for debugging:

```bash
# Check versions
node --version
npm --version
python --version
ffmpeg -version
redis-cli --version

# Check running processes
# Windows
netstat -ano | findstr :3000
netstat -ano | findstr :8000

# Mac/Linux
lsof -i :3000
lsof -i :8000
ps aux | grep node
ps aux | grep python

# Check environment variables
# Windows
echo %OPENAI_API_KEY%

# Mac/Linux
echo $OPENAI_API_KEY

# Test API connections
curl http://localhost:3000/api/health
curl http://localhost:8000/health

# Check Redis
redis-cli ping
redis-cli info

# Check database connection
psql "your_database_url" -c "SELECT 1"
```

---

## Still Stuck?

1. **Re-read documentation**
   - QUICK_START.md
   - SETUP.md
   - README.md

2. **Start fresh**
   - Delete node_modules
   - Clear caches
   - Reinstall everything

3. **Check examples**
   - Look at working code
   - Compare with your changes

4. **Simplify**
   - Remove customizations
   - Test with default settings
   - Add features back one by one

5. **Ask for help**
   - Open GitHub issue
   - Include all relevant information
   - Be specific about the problem

---

## Prevention Tips

### To avoid issues:

1. ✅ Keep dependencies updated
2. ✅ Use version control (git)
3. ✅ Test changes incrementally
4. ✅ Read error messages carefully
5. ✅ Keep backups of working code
6. ✅ Document your changes
7. ✅ Use environment variables
8. ✅ Test in development first
9. ✅ Monitor API usage
10. ✅ Check logs regularly

---

## Quick Fixes Checklist

When something breaks, try these in order:

- [ ] Restart the application
- [ ] Check all services are running
- [ ] Verify environment variables
- [ ] Check internet connection
- [ ] Clear caches
- [ ] Check API keys are valid
- [ ] Look at error logs
- [ ] Try in incognito mode
- [ ] Restart computer
- [ ] Reinstall dependencies

---

**Remember**: Most issues are simple configuration problems. Take your time, read error messages, and work through them systematically.

Good luck! 🚀
