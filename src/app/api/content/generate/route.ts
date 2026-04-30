import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { generateFinanceContent, generateImage } from '@/lib/openai'

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
        input_topic: topic,
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

    // 3. Save generated content
    const { data: content, error: contentError } = await supabaseAdmin
      .from('generated_content')
      .insert({
        request_id: contentRequest.id,
        hook: generatedContent.hook,
        script: generatedContent.script,
        caption: generatedContent.caption,
        hashtags: generatedContent.hashtags,
        cta: generatedContent.cta,
        topic,
        tone: tone || 'educational',
      })
      .select()
      .single()

    if (contentError) throw new Error('Failed to save content: ' + contentError.message)

    // 4. Generate images using NVIDIA FLUX.1-schnell
    // Build finance-specific prompts from the content
    const imagePrompts = buildImagePrompts(topic, generatedContent.imagePrompts)

    const imageResults = await Promise.allSettled(
      imagePrompts.map(async (prompt, index) => {
        const imageUrl = await generateImage(prompt)
        const imageType = index === 0 ? 'background' : 'overlay'

        // Store image record (URL is either base64 data URL or placeholder)
        const { data: imgRecord } = await supabaseAdmin
          .from('generated_images')
          .insert({
            content_id: content.id,
            image_url: imageUrl,
            storage_path: `generated/${content.id}/image_${index}.jpg`,
            prompt,
            image_type: imageType,
            width: 1024,
            height: 1024,
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

// Build rich, finance-specific image prompts
function buildImagePrompts(topic: string, aiPrompts: string[]): string[] {
  const financeStyles = [
    `Professional finance Instagram Reel background about "${topic}". Modern dark blue gradient, gold accents, floating coins, upward trending chart lines, clean minimalist design, 9:16 vertical format, no text`,
    `Vibrant finance content visual for "${topic}". Abstract money symbols, green growth arrows, dollar signs, wealth visualization, modern gradient background, Instagram Reels format, photorealistic, no text`,
  ]

  // Use AI-generated prompts if available, otherwise use our finance-specific ones
  const prompts = aiPrompts && aiPrompts.length >= 2
    ? aiPrompts.map((p, i) =>
        `${p}, professional finance Instagram content, modern design, vibrant colors, ${i === 0 ? 'dark background' : 'light background'}, no text overlay, high quality`
      )
    : financeStyles

  return prompts.slice(0, 2)
}
