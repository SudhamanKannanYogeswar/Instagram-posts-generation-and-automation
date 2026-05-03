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
    // 1. Fetch reel + content
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

    if (!content) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 })
    }

    // 2. Fetch images
    const { data: images } = await supabaseAdmin
      .from('generated_images')
      .select('image_url, image_type')
      .eq('content_id', content.id)
      .order('created_at', { ascending: true })

    const imageUrls = images?.map(i => i.image_url) || []

    // 3. Try to generate video
    const result = await generateReelVideo({
      contentId: content.id,
      hook: content.hook,
      script: content.script,
      cta: content.cta,
      imageUrls,
      durationSeconds: 30,
    })

    // 4. Upload to Supabase Storage
    let videoUrl = ''
    let thumbnailUrl = ''

    try {
      const videoBuffer = fs.readFileSync(result.videoPath)
      const thumbBuffer = fs.readFileSync(result.thumbnailPath)

      const videoStoragePath = `reels/${reelId}/reel.mp4`
      const thumbStoragePath = `reels/${reelId}/thumbnail.jpg`

      const { data: buckets } = await supabaseAdmin.storage.listBuckets()
      if (!buckets?.some(b => b.name === 'reels')) {
        await supabaseAdmin.storage.createBucket('reels', { public: true })
      }

      await supabaseAdmin.storage
        .from('reels')
        .upload(videoStoragePath, videoBuffer, { contentType: 'video/mp4', upsert: true })

      await supabaseAdmin.storage
        .from('reels')
        .upload(thumbStoragePath, thumbBuffer, { contentType: 'image/jpeg', upsert: true })

      const { data: vd } = supabaseAdmin.storage.from('reels').getPublicUrl(videoStoragePath)
      const { data: td } = supabaseAdmin.storage.from('reels').getPublicUrl(thumbStoragePath)

      videoUrl = vd?.publicUrl || ''
      thumbnailUrl = td?.publicUrl || ''
    } catch (storageErr: any) {
      // Fallback to base64
      const videoBuffer = fs.readFileSync(result.videoPath)
      videoUrl = `data:video/mp4;base64,${videoBuffer.toString('base64')}`
      const thumbBuffer = fs.readFileSync(result.thumbnailPath)
      thumbnailUrl = `data:image/jpeg;base64,${thumbBuffer.toString('base64')}`
    }

    await supabaseAdmin
      .from('reels')
      .update({ video_url: videoUrl, thumbnail_url: thumbnailUrl, duration_seconds: result.durationSeconds, status: 'pending_approval' })
      .eq('id', reelId)

    try { fs.unlinkSync(result.videoPath); fs.unlinkSync(result.thumbnailPath) } catch {}

    return NextResponse.json({
      success: true,
      data: { videoUrl, thumbnailUrl, durationSeconds: result.durationSeconds },
    })
  } catch (error: any) {
    console.error('Video generation error:', error.message)

    // If ffmpeg is not available, return a helpful message
    if (
      error.message?.includes('ffmpeg') ||
      error.message?.includes('ENOENT') ||
      error.message?.includes('not found')
    ) {
      return NextResponse.json({
        error: 'video_unavailable',
        message: 'Video generation is not available on this server. Download the images above and use them directly on Instagram — they work perfectly as Reels slides.',
        suggestion: 'Use the downloaded images as a carousel post or create a Reel using Instagram\'s built-in editor with your images.',
      }, { status: 422 })
    }

    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
