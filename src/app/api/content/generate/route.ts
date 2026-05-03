import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { generateFinanceContent } from '@/lib/openai'
import { generateReelImages } from '@/lib/image-generator'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { topic, tone, userId, generationMode = 'manual' } = body

    if (!topic) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 })
    }

    // 1. Create content request record
    const { data: contentRequest, error: requestError } = await supabaseAdmin
      .from('content_requests')
      .insert({
        user_id: userId || null,
        generation_mode: generationMode,
        input_topic: topic.substring(0, 250),
        status: 'generating',
      })
      .select()
      .single()

    if (requestError) throw new Error('Failed to create content request: ' + requestError.message)

    // 2. Generate text content via NVIDIA Llama
    const generatedContent = await generateFinanceContent({
      topic,
      tone: tone || 'educational',
      targetAudience: 'young professionals',
      includeStats: true,
    })

    // 3. Save generated content — truncate topic to 250 chars to fit VARCHAR(255)
    const safeTopic = topic.substring(0, 250)
    const { data: content, error: contentError } = await supabaseAdmin
      .from('generated_content')
      .insert({
        request_id: contentRequest.id,
        hook: generatedContent.hook,
        script: generatedContent.script,
        caption: generatedContent.caption,
        hashtags: generatedContent.hashtags,
        cta: generatedContent.cta,
        topic: safeTopic,
        tone: tone || 'educational',
      })
      .select()
      .single()

    if (contentError) throw new Error('Failed to save content: ' + contentError.message)

    // 4. Generate images — 3 cards: hook, content, combined
    const shortTopic = topic.substring(0, 80)
    const imageUrls = await generateReelImages(
      shortTopic,
      generatedContent.hookImageText || generatedContent.hook,
      generatedContent.contentImageText || generatedContent.script
    )

    const imageTypes = ['hook', 'content', 'combined']
    const imageResults = await Promise.allSettled(
      imageUrls.map(async (imageUrl, index) => {
        const { data: imgRecord } = await supabaseAdmin
          .from('generated_images')
          .insert({
            content_id: content.id,
            image_url: imageUrl,
            storage_path: `generated/${content.id}/image_${index}.jpg`,
            prompt: imageTypes[index],
            image_type: index === 0 ? 'background' : index === 1 ? 'overlay' : 'combined',
            width: 1080,
            height: 1920,
          })
          .select()
          .single()
        return imgRecord
      })
    )

    const images = imageResults
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && r.value !== null)
      .map(r => r.value)

    // 5. Update request status
    await supabaseAdmin
      .from('content_requests')
      .update({ status: 'completed' })
      .eq('id', contentRequest.id)

    // 6. Create reel entry
    const { data: reel } = await supabaseAdmin
      .from('reels')
      .insert({
        content_id: content.id,
        user_id: userId || null,
        status: 'pending_approval',
      })
      .select()
      .single()

    return NextResponse.json({
      success: true,
      data: { contentRequest, content, images, reel },
    })
  } catch (error: any) {
    console.error('Error in content generation:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
