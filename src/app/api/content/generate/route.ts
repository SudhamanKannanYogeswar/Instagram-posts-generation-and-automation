import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { generateFinanceContent } from '@/lib/openai'
import { generateHookImage, generateContentImage, generateCombinedImage } from '@/lib/image-generator'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { topic, tone, userId, generationMode = 'manual', categoryId, preGeneratedContent } = body

    if (!topic) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 })
    }

    // 1. Create content request
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

    // 2. Generate or use pre-generated content
    let gc: any
    if (preGeneratedContent?.hook) {
      gc = preGeneratedContent
    } else {
      gc = await generateFinanceContent({
        topic,
        tone: tone || 'educational',
        includeStats: true,
        categoryId: categoryId || 'personal_finance',
      })
    }

    // 3. Save content
    const { data: content, error: contentError } = await supabaseAdmin
      .from('generated_content')
      .insert({
        request_id: contentRequest.id,
        hook: gc.hook,
        script: gc.script,
        caption: gc.caption,
        hashtags: gc.hashtags,
        cta: gc.cta,
        topic: topic.substring(0, 250),
        tone: tone || 'educational',
      })
      .select()
      .single()

    if (contentError) throw new Error('Failed to save content: ' + contentError.message)

    // 4. Generate 5 images in parallel:
    //    [0] story_hook     — Version 1 hook card
    //    [1] story_content  — Version 1 content card
    //    [2] story_combined — Version 1 combined (hook + content)
    //    [3] comp_hook      — Version 2 comparison hook card
    //    [4] comp_content   — Version 2 comparison content card

    const storyHookText    = gc.hookImageText    || gc.hook   || topic
    const storyContentText = gc.contentImageText || gc.script || topic
    const compHookText     = gc.comparisonHookText    || storyHookText
    const compContentText  = gc.comparisonContentText || storyContentText

    const [img0, img1, img2, img3, img4] = await Promise.all([
      generateHookImage(storyHookText),
      generateContentImage(storyContentText),
      generateCombinedImage(storyHookText, storyContentText),
      generateHookImage(compHookText),
      generateContentImage(compContentText),
    ])

    const imageDefs = [
      { url: img0, type: 'story_hook',     prompt: 'story_hook'     },
      { url: img1, type: 'story_content',  prompt: 'story_content'  },
      { url: img2, type: 'combined',       prompt: 'combined'       },
      { url: img3, type: 'comp_hook',      prompt: 'comp_hook'      },
      { url: img4, type: 'comp_content',   prompt: 'comp_content'   },
    ]

    const imageResults = await Promise.allSettled(
      imageDefs.map(async (def, index) => {
        const { data: imgRecord } = await supabaseAdmin
          .from('generated_images')
          .insert({
            content_id: content.id,
            image_url: def.url,
            storage_path: `generated/${content.id}/image_${index}.jpg`,
            prompt: def.prompt,
            image_type: def.type,
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

    // 6. Create reel
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
