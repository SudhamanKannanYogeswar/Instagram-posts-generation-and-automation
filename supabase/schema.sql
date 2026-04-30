-- Instagram Reels Automation Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (for multi-user support in future)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    instagram_user_id VARCHAR(255),
    instagram_username VARCHAR(255),
    instagram_access_token TEXT,
    instagram_token_expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Content generation requests
CREATE TABLE IF NOT EXISTS content_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    generation_mode VARCHAR(50) NOT NULL, -- 'automatic', 'news_based', 'manual'
    input_topic TEXT,
    news_article_url TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'generating', 'completed', 'failed'
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Generated content (hooks, scripts, captions)
CREATE TABLE IF NOT EXISTS generated_content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID REFERENCES content_requests(id) ON DELETE CASCADE,
    hook TEXT NOT NULL,
    script TEXT NOT NULL,
    caption TEXT NOT NULL,
    hashtags TEXT[],
    cta TEXT,
    topic VARCHAR(255),
    tone VARCHAR(50) DEFAULT 'educational', -- 'educational', 'motivational', 'urgent', 'casual'
    target_audience VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Generated images
CREATE TABLE IF NOT EXISTS generated_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_id UUID REFERENCES generated_content(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    prompt TEXT,
    image_type VARCHAR(50), -- 'background', 'overlay', 'thumbnail'
    width INTEGER,
    height INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Video reels
CREATE TABLE IF NOT EXISTS reels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_id UUID REFERENCES generated_content(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    video_url TEXT,
    storage_path TEXT,
    thumbnail_url TEXT,
    duration_seconds INTEGER,
    status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'pending_approval', 'approved', 'rejected', 'scheduled', 'posted', 'failed'
    approval_status VARCHAR(50),
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Scheduled posts
CREATE TABLE IF NOT EXISTS scheduled_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reel_id UUID REFERENCES reels(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    scheduled_time TIMESTAMP NOT NULL,
    status VARCHAR(50) DEFAULT 'scheduled', -- 'scheduled', 'posting', 'posted', 'failed', 'cancelled'
    instagram_post_id VARCHAR(255),
    instagram_permalink TEXT,
    posted_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Analytics and engagement metrics
CREATE TABLE IF NOT EXISTS post_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scheduled_post_id UUID REFERENCES scheduled_posts(id) ON DELETE CASCADE,
    instagram_post_id VARCHAR(255),
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    saves_count INTEGER DEFAULT 0,
    reach INTEGER DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    engagement_rate DECIMAL(5,2),
    last_synced_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Content templates
CREATE TABLE IF NOT EXISTS content_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    hook_template TEXT,
    script_structure JSONB,
    cta_options TEXT[],
    hashtag_groups TEXT[],
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Trending topics and news
CREATE TABLE IF NOT EXISTS trending_topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic VARCHAR(255) NOT NULL,
    category VARCHAR(100), -- 'savings', 'investments', 'crypto', 'stocks', 'personal_finance'
    source VARCHAR(255),
    article_url TEXT,
    relevance_score DECIMAL(3,2),
    is_used BOOLEAN DEFAULT false,
    discovered_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- User preferences and settings
CREATE TABLE IF NOT EXISTS user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    auto_generate_enabled BOOLEAN DEFAULT false,
    generation_frequency VARCHAR(50) DEFAULT 'daily', -- 'hourly', 'daily', 'weekly'
    preferred_posting_times TIME[],
    content_tone VARCHAR(50) DEFAULT 'educational',
    preferred_topics TEXT[],
    auto_post_enabled BOOLEAN DEFAULT false,
    require_approval BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Job queue tracking
CREATE TABLE IF NOT EXISTS job_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_type VARCHAR(100) NOT NULL, -- 'generate_content', 'create_video', 'post_instagram'
    job_data JSONB,
    status VARCHAR(50) DEFAULT 'queued', -- 'queued', 'processing', 'completed', 'failed'
    priority INTEGER DEFAULT 0,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    error_message TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_content_requests_user_id ON content_requests(user_id);
CREATE INDEX idx_content_requests_status ON content_requests(status);
CREATE INDEX idx_generated_content_request_id ON generated_content(request_id);
CREATE INDEX idx_reels_user_id ON reels(user_id);
CREATE INDEX idx_reels_status ON reels(status);
CREATE INDEX idx_scheduled_posts_user_id ON scheduled_posts(user_id);
CREATE INDEX idx_scheduled_posts_scheduled_time ON scheduled_posts(scheduled_time);
CREATE INDEX idx_scheduled_posts_status ON scheduled_posts(status);
CREATE INDEX idx_trending_topics_category ON trending_topics(category);
CREATE INDEX idx_trending_topics_is_used ON trending_topics(is_used);
CREATE INDEX idx_job_queue_status ON job_queue(status);
CREATE INDEX idx_job_queue_job_type ON job_queue(job_type);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_requests_updated_at BEFORE UPDATE ON content_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reels_updated_at BEFORE UPDATE ON reels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheduled_posts_updated_at BEFORE UPDATE ON scheduled_posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_post_analytics_updated_at BEFORE UPDATE ON post_analytics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_templates_updated_at BEFORE UPDATE ON content_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default content templates
INSERT INTO content_templates (name, description, hook_template, script_structure, cta_options, hashtag_groups) VALUES
('Savings Tip', 'Quick savings tips and hacks', 'Stop wasting money on {topic}! Here''s what rich people do instead...', 
 '{"intro": "Hook", "problem": "Common mistake", "solution": "Better approach", "action": "What to do", "outro": "CTA"}',
 ARRAY['Follow for more money tips!', 'Save this for later!', 'Share with someone who needs this!'],
 ARRAY['#moneytips', '#savingmoney', '#financialfreedom', '#personalfinance', '#moneyhacks']),

('Investment Strategy', 'Investment education and strategies', 'This {investment_type} strategy made me ${amount}...', 
 '{"intro": "Hook", "background": "Context", "strategy": "The method", "results": "Outcomes", "outro": "CTA"}',
 ARRAY['Start investing today!', 'Learn more in my bio!', 'Comment "INVEST" for free guide!'],
 ARRAY['#investing', '#stockmarket', '#wealthbuilding', '#passiveincome', '#investingtips']),

('Finance Myth Buster', 'Debunking common finance myths', 'Everyone believes this about {topic}, but it''s WRONG...', 
 '{"intro": "Hook", "myth": "Common belief", "truth": "Reality", "explanation": "Why", "outro": "CTA"}',
 ARRAY['Did you know this?', 'Tag someone who needs to see this!', 'Follow for truth bombs!'],
 ARRAY['#financemyths', '#moneymindset', '#financialliteracy', '#moneyfacts', '#wealthmindset']);

-- Insert default user (you can update this with your actual user data)
INSERT INTO users (email, name) VALUES ('admin@example.com', 'Admin User')
ON CONFLICT (email) DO NOTHING;
