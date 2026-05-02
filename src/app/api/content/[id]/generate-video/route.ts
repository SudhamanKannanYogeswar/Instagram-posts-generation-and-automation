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
      return NextResponse.json({ error: 'Content not found for this reel' }, { status: 404 })
    }

    // 2. Fetch images
    const { data: images } = await supabaseAdmin
      .from('generated_images')
      .select('image_url, image_type')
      .eq('content_id', content.id)
      .order('created_at', { ascending: true })

    const imageUrls = images?.map(i => i.image_url) || []

    // 3. Generate video frames + assemble with ffmpeg-static
    const result = await generateReelVideo({
      contentId: content.id,
      hook: content.hook,
      script: content.script,
      cta: content.cta,
      imageUrls,
      durationSeconds: 30,
    })

    // 4. Try to upload to Supabase Storage
    let videoUrl = ''
    let thumbnailUrl = ''

    try {
      const videoBuffer = fs.readFileSync(result.videoPath)
      const thumbBuffer = fs.readFileSync(result.thumbnailPath)

      const videoStoragePath = `reels/${reelId}/reel.mp4`
      const thumbStoragePath = `reels/${reelId}/thumbnail.jpg`

      // Ensure bucket exists
      const { data: buckets } = await supabaseAdmin.storage.listBuckets()
      const bucketExists = buckets?.some(b => b.name === 'reels')
      if (!bucketExists) {
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
      console.warn('Storage upload failed, falling back to base64:', storageErr.message)
      // Fallback: return video as base64 data URL so it still works
      const videoBuffer = fs.readFileSync(result.videoPath)
      videoUrl = `data:video/mp4;base64,${videoBuffer.toString('base64')}`
      const thumbBuffer = fs.readFileSync(result.thumbnailPath)
      thumbnailUrl = `data:image/jpeg;base64,${thumbBuffer.toString('base64')}`
    }

    // 5. Update reel record
    await supabaseAdmin
      .from('reels')
      .update({
        video_url: videoUrl,
        thumbnail_url: thumbnailUrl,
        duration_seconds: result.durationSeconds,
        status: 'pending_approval',
      })
      .eq('id', reelId)

    // 6. Cleanup temp files
    try {
      fs.unlinkSync(result.videoPath)
      fs.unlinkSync(result.thumbnailPath)
    } catch {}

    return NextResponse.json({
      success: true,
      data: { videoUrl, thumbnailUrl, durationSeconds: result.durationSeconds },
    })
  } catch (error: any) {
    console.error('Video generation error:', error)
    return NextResponse.json(
      { error: error.message || 'Video generation failed' },
      { status: 500 }
    )
  }
}
