import { NextRequest, NextResponse } from 'next/server'
import { getCategoryById, DEFAULT_CATEGORY } from '@/lib/categories'
import { supabaseAdmin } from '@/lib/supabase'
import sharp from 'sharp'

export const maxDuration = 60

const VISION_URL = 'https://integrate.api.nvidia.com/v1/chat/completions'
const VISION_KEY = process.env.VISION_API_KEY || process.env.OPENAI_API_KEY || ''
const VISION_MODEL = 'meta/llama-3.2-11b-vision-instruct'

/**
 * Compress image to max 800px and upload to Supabase Storage.
 * Returns a public URL — much faster for the vision API than base64.
 */
async function uploadImageForVision(buffer: Buffer, mimeType: string): Promise<string | null> {
  try {
    // Compress to max 800px wide/tall, JPEG 85%
    const compressed = await sharp(buffer)
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer()

    const filename = `vision-temp/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`

    // Ensure bucket exists
    const { data: buckets } = await supabaseAdmin.storage.listBuckets()
    if (!buckets?.some(b => b.name === 'uploads')) {
      await supabaseAdmin.storage.createBucket('uploads', { public: true })
    }

    const { error } = await supabaseAdmin.storage
      .from('uploads')
      .upload(filename, compressed, { contentType: 'image/jpeg', upsert: true })

    if (error) {
      console.warn('Storage upload failed:', error.message)
      return null
    }

    const { data } = supabaseAdmin.storage.from('uploads').getPublicUrl(filename)
    return data?.publicUrl || null
  } catch (err) {
    console.warn('Image upload failed:', err)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData  = await request.formData()
    const imageFile  = formData.get('image') as File | null
    const imageUrl   = formData.get('imageUrl') as string | null
    const userHint   = formData.get('prompt') as string | null
    const categoryId = formData.get('categoryId') as string | null

    if (!imageFile && !imageUrl) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    const category = getCategoryById(categoryId || 'personal_finance') || DEFAULT_CATEGORY

    // ── Get a URL for the image (URL is much faster than base64 for vision API) ──
    let finalImageUrl: string

    if (imageFile) {
      const bytes  = await imageFile.arrayBuffer()
      const buffer = Buffer.from(bytes)

      // Try to upload to Supabase and get a public URL
      const publicUrl = await uploadImageForVision(buffer, imageFile.type || 'image/jpeg')

      if (publicUrl) {
        finalImageUrl = publicUrl
      } else {
        // Fallback: compress and use base64 (slower but works)
        const compressed = await sharp(buffer)
          .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 75 })
          .toBuffer()
        finalImageUrl = `data:image/jpeg;base64,${compressed.toString('base64')}`
      }
    } else {
      finalImageUrl = imageUrl!
    }

    // ── Concise prompt for faster response ──
    const prompt = `You are an expert ${category.label} content creator for Indian Instagram.

${category.systemPrompt}

Analyse this image. Create a complete viral Instagram Reel INSPIRED by it (not copying).
Indian context, short punchy lines, NO emojis.
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

    // ── Call vision API ──
    const controller = new AbortController()
    const timeoutId  = setTimeout(() => controller.abort(), 25000)

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
              { type: 'image_url', image_url: { url: finalImageUrl } },
              { type: 'text', text: prompt },
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
      console.error('Vision API error:', response.status, errText.slice(0, 200))
      throw new Error(`Vision API returned ${response.status}`)
    }

    const data    = await response.json()
    const rawText = data?.choices?.[0]?.message?.content || ''

    // ── Parse JSON ──
    let analysis: any
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
      analysis = JSON.parse(result)
    } catch {
      console.warn('Vision JSON parse failed, using fallback')
      analysis = buildFallback(category.label, userHint)
    }

    return NextResponse.json({ success: true, analysis, model: VISION_MODEL })
  } catch (error: any) {
    console.error('Image analysis error:', error.name, error.message)

    if (error.name === 'AbortError' || error.message?.includes('abort')) {
      return NextResponse.json({
        error: 'Vision AI timed out. The image may be too large or complex. Try a screenshot or simpler image.',
        code: 'TIMEOUT',
      }, { status: 504 })
    }

    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

function buildFallback(categoryLabel: string, userHint: string | null) {
  return {
    subject: 'Finance content image',
    contentAngle: 'Educational finance story',
    suggestedTopic: userHint || `${categoryLabel} tips for Indians`,
    recommendedTone: 'educational',
    hook: 'Most Indians make this mistake every month.',
    script: 'You earn money.\nYou spend money.\nYou save nothing.\n\nThis is the cycle.\n\nBreak it today.',
    caption: 'Time to change the money game! Follow for more.',
    hashtags: ['#IndianFinance', '#MoneyTips', '#SIP'],
    cta: 'Follow for daily money tips',
    hookImageText: 'You earn Rs.50,000/month.\nYou spend Rs.49,000.\nYou save Rs.1,000.\n\nYou think that is not enough.\n\nBut it is enough to start.',
    contentImageText: 'Rs.1,000/month SIP\nAt 12% CAGR for 20 years\n= Rs.9.9 lakh\n\nStart small.\nStart now.\nTime beats amount.',
    contentIdeas: [
      `${categoryLabel} mistake most Indians make`,
      `How to start ${categoryLabel} with Rs.500`,
      `${categoryLabel} truth nobody tells you`,
    ],
  }
}
