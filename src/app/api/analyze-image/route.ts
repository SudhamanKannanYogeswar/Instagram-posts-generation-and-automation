import { NextRequest, NextResponse } from 'next/server'
import { getCategoryById, DEFAULT_CATEGORY } from '@/lib/categories'
import sharp from 'sharp'

// Tell Vercel to allow up to 60 seconds for this route (requires Pro plan)
// On free plan this is ignored but doesn't break anything
export const maxDuration = 60

const VISION_URL = 'https://integrate.api.nvidia.com/v1/chat/completions'
const VISION_KEY = process.env.VISION_API_KEY || process.env.OPENAI_API_KEY || ''

// Use a faster vision model — llama-3.2-11b is much faster than mistral-large-3
// while still supporting image input
const VISION_MODEL = process.env.VISION_MODEL || 'meta/llama-3.2-11b-vision-instruct'

/**
 * Compress image to max 512x512 and convert to JPEG before sending to API.
 * This dramatically reduces payload size and API response time.
 */
async function compressImage(buffer: Buffer, mimeType: string): Promise<string> {
  try {
    const compressed = await sharp(buffer)
      .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer()
    return `data:image/jpeg;base64,${compressed.toString('base64')}`
  } catch {
    // Fallback: just base64 encode as-is
    return `data:${mimeType};base64,${buffer.toString('base64')}`
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const imageFile  = formData.get('image') as File | null
    const imageUrl   = formData.get('imageUrl') as string | null
    const userHint   = formData.get('prompt') as string | null
    const categoryId = formData.get('categoryId') as string | null

    if (!imageFile && !imageUrl) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    const category = getCategoryById(categoryId || 'personal_finance') || DEFAULT_CATEGORY

    // Build image content — compress uploaded files to reduce API latency
    let imageContent: { type: string; image_url: { url: string } }

    if (imageFile) {
      const bytes  = await imageFile.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const dataUrl = await compressImage(buffer, imageFile.type || 'image/jpeg')
      imageContent = { type: 'image_url', image_url: { url: dataUrl } }
    } else {
      imageContent = { type: 'image_url', image_url: { url: imageUrl! } }
    }

    // Concise prompt — shorter prompt = faster response
    const analysisPrompt = `You are an expert ${category.label} content creator for Indian Instagram.

${category.systemPrompt}

Analyse this image. Create a complete viral Instagram Reel INSPIRED by it (not copying it).
Use Indian context, short punchy lines, NO emojis, NO paragraphs.

${userHint ? `User context: "${userHint}"` : ''}

Return ONLY valid JSON:
{
  "subject": "what is in the image",
  "contentAngle": "how this inspired the content",
  "suggestedTopic": "specific topic for this reel",
  "recommendedTone": "educational|motivational|urgent|casual",
  "hook": "one powerful hook line",
  "script": "full script in short punchy lines with blank lines between sections",
  "caption": "Instagram caption with emojis",
  "hashtags": ["tag1", "tag2", "tag3"],
  "cta": "call to action",
  "hookImageText": "hook card text - short story lines, NO emojis, blank lines between sections",
  "contentImageText": "content card text - data/facts/steps, NO emojis, blank lines between points",
  "contentIdeas": ["idea 1", "idea 2", "idea 3"]
}`

    // Call vision API with a 45s timeout
    const controller = new AbortController()
    const timeoutId  = setTimeout(() => controller.abort(), 45000)

    let response: Response
    try {
      response = await fetch(VISION_URL, {
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
          max_tokens: 1200,
          temperature: 0.2,
          stream: false,
        }),
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeoutId)
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      console.error('Vision API error:', response.status, errText)
      throw new Error(`Vision API returned ${response.status}`)
    }

    const data    = await response.json()
    const rawText = data?.choices?.[0]?.message?.content || ''

    // Parse JSON from response
    let analysis: any
    try {
      let cleaned = rawText
        .replace(/^```json\s*/im, '').replace(/^```\s*/im, '').replace(/\s*```\s*$/im, '').trim()
      // Fix control chars inside JSON strings
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
      console.warn('Vision JSON parse failed, using fallback')
      analysis = {
        subject: 'Finance content image',
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
    console.error('Image analysis error:', error.name, error.message)

    if (error.name === 'AbortError' || error.message?.includes('abort')) {
      return NextResponse.json({
        error: 'The vision API took too long to respond. Try with a smaller image or use the text prompt mode instead.',
        code: 'TIMEOUT',
      }, { status: 504 })
    }

    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
