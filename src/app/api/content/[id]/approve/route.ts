import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const reelId = params.id
    const { scheduledTime } = await request.json()

    // Update reel status to approved
    const { error: reelError } = await supabaseAdmin
      .from('reels')
      .update({ status: 'approved', approval_status: 'approved' })
      .eq('id', reelId)

    if (reelError) throw reelError

    // Create scheduled post if time provided
    if (scheduledTime) {
      const { data: reel } = await supabaseAdmin
        .from('reels')
        .select('user_id')
        .eq('id', reelId)
        .single()

      await supabaseAdmin.from('scheduled_posts').insert({
        reel_id: reelId,
        user_id: reel?.user_id || null,
        scheduled_time: scheduledTime,
        status: 'scheduled',
      })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
