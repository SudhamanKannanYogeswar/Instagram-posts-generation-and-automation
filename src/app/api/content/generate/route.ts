import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { generateFinanceContent, generateImage } from '@/lib/openai'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { topic, tone, userId, generationMode = 'manual' } = body

    if (!topic) {
      return NextResponse.json(
        { error: 'Topic is required' },
        { status: 400 }
      )
    }

    // Create content request
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

    if (requestError) {
      console.error('Error creating content request:', requestError)
      return NextResponse.json(
        { error: 'Failed to create content request' },
        { status: 500 }
      )
    }

    // Generate content using OpenAI
    const generatedContent = await generateFinanceContent({
      topic,
      tone: tone || 'educational',
      targetAudience: 'young professionals',
      includeStats: true,
    })

    // Save generated content
    const { data: content, error: contentError } = await supabaseAdmin
      .from('generated_content')
      .insert({
        request_id: contentRequest.id,
        hook: generatedContent.hook,
        script: generatedContent.script,
        caption: generatedContent.caption,
        hashtags: generatedContent.hashtags,
        cta: generatedContent.cta,
        topic: topic,
        tone: tone || 'educational',
      })
      .select()
      .single()

    if (contentError) {
      console.error('Error saving content:', contentError)
      return NextResponse.json(
        { error: 'Failed to save content' },
        { status: 500 }
      )
    }

    // Generate images
    const imagePromises = generatedContent.imagePrompts.map(async (prompt, index) => {
      try {
        const imageUrl = await generateImage(prompt)
        
        // In production, download and upload to Supabase Storage
        // For now, just save the URL
        return await supabaseAdmin
          .from('generated_images')
          .insert({
            content_id: content.id,
            image_url: imageUrl,
            storage_path: `generated/${content.id}/image_${index}.png`,
            prompt: prompt,
            image_type: index === 0 ? 'background' : 'overlay',
          })
          .select()
          .single()
      } catch (error) {
        console.error('Error generating image:', error)
        return null
      }
    })

    const images = await Promise.all(imagePromises)

    // Update request status
    await supabaseAdmin
      .from('content_requests')
      .update({ status: 'completed' })
      .eq('id', contentRequest.id)

    // Create reel entry
    const { data: reel } = await supabaseAdmin
      .from('reels')
      .insert({
        content_id: content.id,
        user_id: userId || null,
        status: 'draft',
      })
      .select()
      .single()

    return NextResponse.json({
      success: true,
      data: {
        contentRequest,
        content,
        images: images.filter(img => img !== null),
        reel,
      },
    })
  } catch (error: any) {
    console.error('Error in content generation:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
