import { NextRequest, NextResponse } from 'next/server'
import { getCategoryById, DEFAULT_CATEGORY } from '@/lib/categories'

const VISION_URL = 'https://integrate.api.nvidia.com/v1/chat/completions'
const VISION_MODEL = process.env.VISION_MODEL || 'mistralai/mistral-large-3-675b-instruct-2512'
const VISION_KEY = process.env.VISION_API_KEY || process.env.OPENAI_API_KEY || ''

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const imageFile = formData.get('image') as File | null
    const imageUrl  = formData.get('imageUrl') as string | null
    const userHint  = formData.get('prompt') as string | null
    const categoryId = formData.get('categoryId') as string | null

    if (!imageFile && !imageUrl) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    // Get category context
    const category = getCategoryById(categoryId || 'personal_finance') || DEFAULT_CATEGORY

    // Build image content block
    let imageContent: { type: string; image_url: { url: string } }
    if (imageFile) {
      const bytes = await imageFile.arrayBuffer()
      const b64   = Buffer.from(bytes).toString('base64')
      const mime  = imageFile.type || 'image/jpeg'
      imageContent = { type: 'image_url', image_url: { url: `data:${mime};base64,${b64}` } }
    } else {
      imageContent = { type: 'image_url', image_url: { url: imageUrl! } }
    }

    // Vision prompt — analyse image AND generate full content
    const analysisPrompt = `You are an expert ${category.label} content creator for Indian Instagram audience.

${category.systemPrompt}

Look at this image carefully. Understand:
1. What is shown in the image
2. What story or message it conveys
3. How it relates to ${category.label} for Indian audience

${userHint ? `User's context: "${userHint}"` : ''}

Now create a complete viral Instagram Reel inspired by this image.
The content should be INSPIRED by the image — same style/format — but with ORIGINAL content.
Do NOT copy the exact content. Create something fresh but equally relatable.

CRITICAL FORMAT RULES:
- Short punchy lines only. NO paragraphs.
- NO emojis in script or image text.
- Use blank lines between sections.
- Write like a real story unfolding.
- Indian context and numbers throughout.

Return ONLY valid JSON (no markdown):
{
  "subject": "what is in the image",
  "contentAngle": "how this image inspired the content angle",
  "suggestedTopic": "the specific topic for this reel",
  "recommendedTone": "educational|motivational|urgent|casual",
  "hook": "one powerful hook line",
  "script": "full script in short punchy lines with blank lines between sections",
  "caption": "Instagram caption with emojis",
  "hashtags": ["tag1", "tag2", "tag3"],
  "cta": "call to action",
  "hookImageText": "hook image text - short story lines, NO emojis, blank lines between sections",
  "contentImageText": "content image text - data/facts/steps, NO emojis, blank lines between points",
  "contentIdeas": ["alternative idea 1", "alternative idea 2", "alternative idea 3"]
}`

    // Call Mistral Large 3 vision
    const response = await fetch(VISION_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${VISION_KEY}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        model: VISION_MODEL,
        messages: [{
          role: 'user',
          content: [
            imageContent,
            { type: 'text', text: analysisPrompt },
          ],
        }],
        max_tokens: 1500,
        temperature: 0.2,
        stream: false,
      }),
      signal: AbortSignal.timeout(35000),
    })

    if (!response.ok) {
      throw new Error(`Vision API returned ${response.status}`)
    }

    const data = await response.json()
    const rawText = data?.choices?.[0]?.message?.content || ''

    // Parse JSON from response
    let analysis: any
    try {
      let cleaned = rawText
        .replace(/^```json\s*/im, '').replace(/^```\s*/im, '').replace(/\s*```\s*$/im, '').trim()
      // Fix control chars in JSON strings
      let result = ''; let inStr = false; let esc = false
      for (const ch of cleaned) {
        if (esc) { result += ch; esc = false; continue }
        if (ch === '\\' && inStr) { result += ch; esc = true; continue }
        if (ch === '"') { inStr = !inStr; result += ch; continue }
        if (inStr && ch === '\n') { result += '\\n'; continue }
        if (inStr && ch === '\r') { result += '\\r'; continue }
        result += ch
      }
      analysis = JSON.parse(result)
    } catch {
      // Fallback
      analysis = {
        subject: 'Finance content',
        contentAngle: 'Educational finance story',
        suggestedTopic: userHint || `${category.label} tips for Indians`,
        recommendedTone: 'educational',
        hook: 'Most Indians make this mistake every month.',
        script: 'You earn money.\nYou spend money.\nYou save nothing.\n\nThis is the cycle.\n\nBreak it today.',
        caption: 'Time to change the money game! Follow for more.',
        hashtags: ['#IndianFinance', '#MoneyTips', '#SIP'],
        cta: 'Follow for daily money tips',
        hookImageText: 'You earn Rs.50,000/month.\nYou spend Rs.49,000.\nYou save Rs.1,000.\n\nYou think that is not enough.\n\nBut it is enough to start.',
        contentImageText: 'Rs.1,000/month SIP\nAt 12% CAGR for 20 years\n= Rs.9.9 lakh\n\nStart small.\nStart now.\nTime beats amount.',
        contentIdeas: [
          `${category.label} mistake most Indians make`,
          `How to start ${category.label} with Rs.500`,
          `${category.label} truth nobody tells you`,
        ],
      }
    }

    return NextResponse.json({ success: true, analysis, model: VISION_MODEL })
  } catch (error: any) {
    console.error('Image analysis error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
