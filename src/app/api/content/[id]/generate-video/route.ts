import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { generateReelVideo } from '@/lib/video-generator'
import * as fs from 'fs'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const reelId = params.id

  try {
    // Fetch reel + content + images
    const { data: reel, error: reelErr } = await supabaseAdmin
      .from('reels')
      .select('*, generated_content(*)')
      .eq('id', reelId)
      .single()

    if (reelErr || !reel) {
      return NextResponse.json({ error: 'Reel not found' }, { status: 404 })
    }

    const content = Array.isArray(reel.generated_content)
      ? reel.generated_content[0]
      : reel.generated_content

    const { data: images } = await supabaseAdmin
      .from('generated_images')
      .select('image_url, image_type')
      .eq('content_id', content.id)
      .order('created_at', { ascending: true })

    const imageUrls = images?.map(i => i.image_url) || []

    // Generate video frames + assemble
    const result = await generateReelVideo({
      contentId: content.id,
      hook: content.hook,
      script: content.script,
      cta: content.cta,
      imageUrls,
      durationSeconds: 30,
    })

    // Upload video to Supabase Storage
    const videoBuffer = fs.readFileSync(result.videoPath)
    const thumbBuffer = fs.readFileSync(result.thumbnailPath)

    const videoStoragePath = `reels/${reelId}/reel.mp4`
    const thumbStoragePath = `reels/${reelId}/thumbnail.jpg`

    const { error: videoUploadErr } = await supabaseAdmin.storage
      .from('reels')
      .upload(videoStoragePath, videoBuffer, {
        contentType: 'video/mp4',
        upsert: true,
      })

    const { error: thumbUploadErr } = await supabaseAdmin.storage
      .from('reels')
      .upload(thumbStoragePath, thumbBuffer, {
        contentType: 'image/jpeg',
        upsert: true,
      })

    // Get public URLs
    const { data: videoUrlData } = supabaseAdmin.storage
      .from('reels')
      .getPublicUrl(videoStoragePath)

    const { data: thumbUrlData } = supabaseAdmin.storage
      .from('reels')
      .getPublicUrl(thumbStoragePath)

    const videoUrl = videoUrlData?.publicUrl || ''
    const thumbnailUrl = thumbUrlData?.publicUrl || ''

    // Update reel record
    await supabaseAdmin
      .from('reels')
      .update({
        video_url: videoUrl,
        thumbnail_url: thumbnailUrl,
        storage_path: videoStoragePath,
        duration_seconds: result.durationSeconds,
        status: 'pending_approval',
      })
      .eq('id', reelId)

    // Cleanup temp files
    try {
      fs.unlinkSync(result.videoPath)
      fs.unlinkSync(result.thumbnailPath)
    } catch {}

    return NextResponse.json({
      success: true,
      data: {
        videoUrl,
        thumbnailUrl,
        durationSeconds: result.durationSeconds,
      },
    })
  } catch (error: any) {
    console.error('Video generation error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
