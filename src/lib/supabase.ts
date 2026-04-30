import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Client for browser/client-side operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Admin client for server-side operations with elevated privileges
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

// Database types
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string | null
          instagram_user_id: string | null
          instagram_username: string | null
          instagram_access_token: string | null
          instagram_token_expires_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['users']['Insert']>
      }
      content_requests: {
        Row: {
          id: string
          user_id: string
          generation_mode: 'automatic' | 'news_based' | 'manual'
          input_topic: string | null
          news_article_url: string | null
          status: 'pending' | 'generating' | 'completed' | 'failed'
          error_message: string | null
          created_at: string
          updated_at: string
        }
      }
      generated_content: {
        Row: {
          id: string
          request_id: string
          hook: string
          script: string
          caption: string
          hashtags: string[]
          cta: string
          topic: string
          tone: string
          target_audience: string | null
          created_at: string
        }
      }
      reels: {
        Row: {
          id: string
          content_id: string
          user_id: string
          video_url: string | null
          storage_path: string | null
          thumbnail_url: string | null
          duration_seconds: number | null
          status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'scheduled' | 'posted' | 'failed'
          approval_status: string | null
          rejection_reason: string | null
          created_at: string
          updated_at: string
        }
      }
      scheduled_posts: {
        Row: {
          id: string
          reel_id: string
          user_id: string
          scheduled_time: string
          status: 'scheduled' | 'posting' | 'posted' | 'failed' | 'cancelled'
          instagram_post_id: string | null
          instagram_permalink: string | null
          posted_at: string | null
          error_message: string | null
          created_at: string
          updated_at: string
        }
      }
      post_analytics: {
        Row: {
          id: string
          scheduled_post_id: string
          instagram_post_id: string
          likes_count: number
          comments_count: number
          shares_count: number
          saves_count: number
          reach: number
          impressions: number
          engagement_rate: number
          last_synced_at: string | null
          created_at: string
          updated_at: string
        }
      }
      user_settings: {
        Row: {
          id: string
          user_id: string
          auto_generate_enabled: boolean
          generation_frequency: 'hourly' | 'daily' | 'weekly'
          preferred_posting_times: string[]
          content_tone: string
          preferred_topics: string[]
          auto_post_enabled: boolean
          require_approval: boolean
          created_at: string
          updated_at: string
        }
      }
    }
  }
}
