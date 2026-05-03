import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { generateHookImage, generateContentImage, generateCombinedImage } from '@/lib/image-generator'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const reelId = params.id

  try {
    const { editPrompt } = await request.json()
    if (!editPrompt?.trim()) {
      return NextResponse.json({ error: 'Edit prompt is required' }, { status: 400 })
    }

    // 1. Fetch existing content + images
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

    const { data: oldImages } = await supabaseAdmin
      .from('generated_images')
      .select('*')
      .eq('content_id', oldContent.id)
      .order('created_at', { ascending: true })

    // 2. Ask LLM to edit the content based on the prompt
    const editSystemPrompt = `You are an expert Indian finance content editor.
You receive existing Instagram Reel content and an edit instruction.
Apply the edit instruction precisely while keeping everything else the same.
Maintain the same format: short punchy lines, blank lines between sections, NO emojis in image text.
Keep the same names, scenario, and numbers UNLESS the edit instruction specifically asks to change them.`

    const editUserPrompt = `EXISTING CONTENT:
Hook: ${oldContent.hook}

Script:
${oldContent.script}

Hook Image Text:
${oldImages?.find(i => i.image_type === 'story_hook')?.prompt || oldContent.hook}

Content Image Text:
${oldImages?.find(i => i.image_type === 'story_content')?.prompt || oldContent.script}

Comparison Hook Text:
${oldImages?.find(i => i.image_type === 'comp_hook')?.prompt || ''}

Comparison Content Text:
${oldImages?.find(i => i.image_type === 'comp_content')?.prompt || ''}

EDIT INSTRUCTION: ${editPrompt}

Apply the edit instruction to ALL sections above. Return ONLY valid JSON:
{
  "hook": "edited hook",
  "script": "edited script — short punchy lines, blank lines between sections",
  "caption": "edited caption with emojis",
  "hashtags": ["tag1", "tag2"],
  "cta": "edited cta",
  "hookImageText": "edited hook image text — NO emojis, blank lines",
  "contentImageText": "edited content image text — NO emojis, blank lines",
  "comparisonHookText": "edited comparison hook — NO emojis, blank lines",
  "comparisonContentText": "edited comparison content — NO emojis, blank lines",
  "editSummary": "brief description of what was changed"
}`

    const model = process.env.OPENAI_MODEL || 'meta/llama-3.3-70b-instruct'
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: editSystemPrompt },
        { role: 'user', content: editUserPrompt },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    })

    const rawText = completion.choices[0].message.content || '{}'

    // Parse response
    let edited: any
    try {
      let cleaned = rawText
        .replace(/^```json\s*/im, '').replace(/^```\s*/im, '').replace(/\s*```\s*$/im, '').trim()
      let result = ''; let inStr = false; let esc = false
      for (const ch of cleaned) {
        if (esc) { result += ch; esc = false; continue }
        if (ch === '\\' && inStr) { result += ch; esc = true; continue }
        if (ch === '"') { inStr = !inStr; result += ch; continue }
        if (inStr && ch === '\n') { result += '\\n'; continue }
        if (inStr && ch === '\r') { result += '\\r'; continue }
        result += ch
      }
      edited = JSON.parse(result)
    } catch {
      return NextResponse.json({ error: 'Failed to parse edited content' }, { status: 500 })
    }

    // 3. Save updated content
    const { data: updatedContent, error: updateError } = await supabaseAdmin
      .from('generated_content')
      .update({
        hook: edited.hook || oldContent.hook,
        script: edited.script || oldContent.script,
        caption: edited.caption || oldContent.caption,
        hashtags: edited.hashtags || oldContent.hashtags,
        cta: edited.cta || oldContent.cta,
      })
      .eq('id', oldContent.id)
      .select()
      .single()

    if (updateError) throw new Error('Failed to update content')

    // 4. Regenerate images with edited text
    const isFinance = true
    const storyHookText    = edited.hookImageText    || edited.hook
    const storyContentText = edited.contentImageText || edited.script
    const compHookText     = edited.comparisonHookText    || storyHookText
    const compContentText  = edited.comparisonContentText || storyContentText

    const [img0, img1, img2, img3, img4, img5] = await Promise.all([
      generateHookImage(storyHookText, isFinance),
      generateContentImage(storyContentText, isFinance),
      generateCombinedImage(storyHookText, storyContentText, isFinance),
      generateHookImage(compHookText, isFinance),
      generateContentImage(compContentText, isFinance),
      generateCombinedImage(compHookText, compContentText, isFinance),
    ])

    // 5. Delete old images and insert new ones
    await supabaseAdmin.from('generated_images').delete().eq('content_id', oldContent.id)

    const imageDefs = [
      { url: img0, type: 'story_hook',    prompt: storyHookText    },
      { url: img1, type: 'story_content', prompt: storyContentText },
      { url: img2, type: 'combined',      prompt: 'combined'       },
      { url: img3, type: 'comp_hook',     prompt: compHookText     },
      { url: img4, type: 'comp_content',  prompt: compContentText  },
      { url: img5, type: 'comp_combined', prompt: 'comp_combined'  },
    ]

    const imageResults = await Promise.allSettled(
      imageDefs.map(async (def, index) => {
        const { data: imgRecord } = await supabaseAdmin
          .from('generated_images')
          .insert({
            content_id: oldContent.id,
            image_url: def.url,
            storage_path: `generated/${oldContent.id}/image_${index}_edited.jpg`,
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

    return NextResponse.json({
      success: true,
      data: {
        content: updatedContent,
        images,
        editSummary: edited.editSummary || 'Content updated',
      },
    })
  } catch (error: any) {
    console.error('Edit error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
