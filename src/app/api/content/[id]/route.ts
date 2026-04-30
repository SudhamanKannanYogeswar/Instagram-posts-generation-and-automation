import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const reelId = params.id

    // Get reel
    const { data: reel, error: reelError } = await supabaseAdmin
      .from('reels')
      .select('*')
      .eq('id', reelId)
      .single()

    if (reelError || !reel) {
      return NextResponse.json({ error: 'Reel not found' }, { status: 404 })
    }

    // Get content
    const { data: content, error: contentError } = await supabaseAdmin
      .from('generated_content')
      .select('*')
      .eq('id', reel.content_id)
      .single()

    if (contentError || !content) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 })
    }

    // Get images
    const { data: images } = await supabaseAdmin
      .from('generated_images')
      .select('*')
      .eq('content_id', content.id)

    return NextResponse.json({
      success: true,
      data: { reel, content, images: images || [] },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
