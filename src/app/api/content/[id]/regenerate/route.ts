import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { generateFinanceContent } from '@/lib/openai'
import { generateHookImage, generateContentImage, generateCombinedImage } from '@/lib/image-generator'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const reelId = params.id

  try {
    // 1. Fetch existing reel + content to get the original topic/tone/category
    const { data: reel } = await supabaseAdmin
      .from('reels')
      .select('*, generated_content(*)')
      .eq('id', reelId)
      .single()

    if (!reel) return NextResponse.json({ error: 'Reel not found' }, { status: 404 })

    const oldContent = Array.isArray(reel.generated_content)
      ? reel.generated_content[0]
      : reel.generated_content

    if (!oldContent) return NextResponse.json({ error: 'Content not found' }, { status: 404 })

    // 2. Regenerate with a fresh LLM scenario (different names, numbers, moral line)
    const gc = await generateFinanceContent({
      topic: oldContent.topic,
      tone: oldContent.tone || 'educational',
      includeStats: true,
      categoryId: 'personal_finance',
    })

    // 3. Save new content record
    const { data: newContent, error: contentError } = await supabaseAdmin
      .from('generated_content')
      .insert({
        request_id: oldContent.request_id,
        hook: gc.hook,
        script: gc.script,
        caption: gc.caption,
        hashtags: gc.hashtags,
        cta: gc.cta,
        topic: oldContent.topic,
        tone: oldContent.tone || 'educational',
      })
      .select()
      .single()

    if (contentError) throw new Error('Failed to save content: ' + contentError.message)

    // 4. Generate fresh images
    const isFinance = true
    const storyHookText    = gc.hookImageText    || gc.hook
    const storyContentText = gc.contentImageText || gc.script
    const compHookText     = gc.comparisonHookText    || storyHookText
    const compContentText  = gc.comparisonContentText || storyContentText

    const [img0, img1, img2, img3, img4, img5] = await Promise.all([
      generateHookImage(storyHookText, isFinance),
      generateContentImage(storyContentText, isFinance),
      generateCombinedImage(storyHookText, storyContentText, isFinance),
      generateHookImage(compHookText, isFinance),
      generateContentImage(compContentText, isFinance),
      generateCombinedImage(compHookText, compContentText, isFinance),
    ])

    const imageDefs = [
      { url: img0, type: 'story_hook',    prompt: 'story_hook'    },
      { url: img1, type: 'story_content', prompt: 'story_content' },
      { url: img2, type: 'combined',      prompt: 'combined'      },
      { url: img3, type: 'comp_hook',     prompt: 'comp_hook'     },
      { url: img4, type: 'comp_content',  prompt: 'comp_content'  },
      { url: img5, type: 'comp_combined', prompt: 'comp_combined' },
    ]

    const imageResults = await Promise.allSettled(
      imageDefs.map(async (def, index) => {
        const { data: imgRecord } = await supabaseAdmin
          .from('generated_images')
          .insert({
            content_id: newContent.id,
            image_url: def.url,
            storage_path: `generated/${newContent.id}/image_${index}.jpg`,
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

    // 5. Update reel to point to new content
    await supabaseAdmin
      .from('reels')
      .update({ content_id: newContent.id, status: 'pending_approval' })
      .eq('id', reelId)

    return NextResponse.json({
      success: true,
      data: { content: newContent, images },
    })
  } catch (error: any) {
    console.error('Regenerate error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
