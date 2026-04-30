import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Get all reels with their content
    const { data: reels, error } = await supabaseAdmin
      .from('reels')
      .select(`
        id,
        status,
        created_at,
        content_id,
        generated_content (
          id,
          hook,
          topic,
          tone,
          caption,
          hashtags
        )
      `)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error

    // Get scheduled posts for each reel
    const reelIds = reels?.map(r => r.id) || []
    const { data: scheduledPosts } = await supabaseAdmin
      .from('scheduled_posts')
      .select('*')
      .in('reel_id', reelIds)

    // Combine data
    const items = reels?.map(reel => {
      const content = Array.isArray(reel.generated_content)
        ? reel.generated_content[0]
        : reel.generated_content

      const scheduled_post = scheduledPosts?.find(sp => sp.reel_id === reel.id)

      return {
        reel: {
          id: reel.id,
          status: reel.status,
          created_at: reel.created_at,
        },
        content: content || {},
        scheduled_post: scheduled_post || null,
      }
    }) || []

    return NextResponse.json({ success: true, data: items })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
