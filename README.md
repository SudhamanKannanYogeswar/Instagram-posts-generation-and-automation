# Instagram Reels Automation Platform

AI-powered platform for automatically generating and posting finance-focused Instagram Reels with viral hooks.

## Features

- 🤖 **AI Content Generation**: Uses LLM to create engaging finance content with viral hooks
- 🎨 **Automated Image Creation**: Generates eye-catching visuals using AI image generation
- 📹 **Video Assembly**: Automatically creates Reels with text overlays, transitions, and effects
- 📅 **Smart Scheduling**: Schedule posts or auto-generate based on trending topics
- ✅ **Approval Workflow**: Review and approve content before posting
- 📊 **Analytics Dashboard**: Track engagement and performance metrics
- 🔄 **Multi-Mode Generation**: Create content automatically, from news, or custom input
- 💾 **Long-term Storage**: All content stored securely in Supabase

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes, Python FastAPI
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **Queue**: Bull + Redis
- **AI**: OpenAI GPT-4, DALL-E 3 / Stability AI
- **Video**: FFmpeg, MoviePy

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- Python 3.9+
- Redis server
- FFmpeg installed
- Supabase account
- OpenAI API key
- Instagram Business/Creator account

### Installation

1. Clone the repository:
```bash
git clone https://github.com/SudhamanKannanYogeswar/Instagram-posts-generation-and-automation.git
cd Instagram-posts-generation-and-automation
```

2. Install Node.js dependencies:
```bash
npm install
```

3. Install Python dependencies:
```bash
cd python-services
pip install -r requirements.txt
cd ..
```

4. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your credentials
```

5. Run database migrations:
```bash
npm run db:migrate
```

6. Start Redis server:
```bash
redis-server
```

7. Start the development server:
```bash
npm run dev
```

8. In another terminal, start the worker:
```bash
npm run worker
```

9. Start Python video service:
```bash
cd python-services
python main.py
```

Visit `http://localhost:3000` to access the application.

## Project Structure

```
├── src/
│   ├── app/              # Next.js app directory
│   ├── components/       # React components
│   ├── lib/             # Utilities and configurations
│   ├── workers/         # Background job processors
│   └── types/           # TypeScript types
├── python-services/     # Python video processing service
├── public/              # Static assets
└── supabase/           # Database migrations and schemas
```

## Usage

### 1. Connect Instagram Account
- Navigate to Settings
- Click "Connect Instagram"
- Authorize the application

### 2. Generate Content

**Automatic Mode:**
- Set schedule in Settings
- System auto-generates content based on trending finance topics

**News-Based Mode:**
- System monitors finance news
- Generates relevant content automatically

**Manual Mode:**
- Click "Create New Post"
- Enter your topic/idea
- AI generates content with viral hooks
- Review and approve

### 3. Review & Approve
- View generated content in Queue
- Edit if needed
- Approve or reject

### 4. Schedule & Post
- Set posting time
- System automatically posts to Instagram
- Track performance in Analytics

## Configuration

### Content Settings
- Adjust content tone and style
- Set preferred topics
- Configure viral hook templates
- Customize CTAs

### Posting Schedule
- Set optimal posting times
- Configure frequency
- Enable/disable auto-posting

## API Endpoints

- `POST /api/content/generate` - Generate new content
- `GET /api/content/queue` - Get pending content
- `POST /api/content/approve` - Approve content
- `POST /api/instagram/post` - Post to Instagram
- `GET /api/analytics` - Get performance metrics

## Database Schema

See `supabase/schema.sql` for complete database structure.

## Contributing

Contributions are welcome! Please read our contributing guidelines.

## License

MIT License - see LICENSE file for details

## Support

For issues and questions, please open a GitHub issue.
