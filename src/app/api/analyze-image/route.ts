import { NextRequest, NextResponse } from 'next/server'
import { getCategoryById, DEFAULT_CATEGORY } from '@/lib/categories'
import { supabaseAdmin } from '@/lib/supabase'
import sharp from 'sharp'

export const maxDuration = 60

const VISION_URL = 'https://integrate.api.nvidia.com/v1/chat/completions'
const VISION_KEY = process.env.VISION_API_KEY || process.env.OPENAI_API_KEY || ''
const VISION_MODEL = 'meta/llama-3.2-11b-vision-instruct'

async function uploadImageForVision(buffer: Buffer, mimeType: string): Promise<string | null> {
  try {
    const compressed = await sharp(buffer)
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer()

    const filename = `vision-temp/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`

    const { data: buckets } = await supabaseAdmin.storage.listBuckets()
    if (!buckets?.some(b => b.name === 'uploads')) {
      await supabaseAdmin.storage.createBucket('uploads', { public: true })
    }

    const { error } = await supabaseAdmin.storage
      .from('uploads')
      .upload(filename, compressed, { contentType: 'image/jpeg', upsert: true })

    if (error) return null

    const { data } = supabaseAdmin.storage.from('uploads').getPublicUrl(filename)
    return data?.publicUrl || null
  } catch {
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

    // Get a URL for the image (much faster than base64 for vision API)
    let finalImageUrl: string
    if (imageFile) {
      const bytes  = await imageFile.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const publicUrl = await uploadImageForVision(buffer, imageFile.type || 'image/jpeg')
      if (publicUrl) {
        finalImageUrl = publicUrl
      } else {
        const compressed = await sharp(buffer)
          .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 75 })
          .toBuffer()
        finalImageUrl = `data:image/jpeg;base64,${compressed.toString('base64')}`
      }
    } else {
      finalImageUrl = imageUrl!
    }

    // Randomise scenario values so output is never the same
    const seed = {
      age1: 24 + Math.floor(Math.random() * 6),
      age2: 30 + Math.floor(Math.random() * 8),
      salary: [45000, 52000, 58000, 65000, 72000, 80000][Math.floor(Math.random() * 6)],
      sipAmount: [3000, 5000, 7500, 8000, 10000, 12000][Math.floor(Math.random() * 6)],
      years: [15, 18, 20, 22, 25][Math.floor(Math.random() * 5)],
      names: [['Rahul', 'Arjun'], ['Priya', 'Meera'], ['Karthik', 'Vikram'], ['Ananya', 'Sneha'], ['Rohan', 'Amit']][Math.floor(Math.random() * 5)],
    }

    // Two-step prompt:
    // Step 1: Extract EXACTLY what is in the image (instruments, numbers, format, structure)
    // Step 2: Create a SIMILAR post with slightly different numbers/names but same style
    const prompt = `You are an expert ${category.label} content creator for Indian Instagram.

STEP 1 — READ THE IMAGE CAREFULLY:
Extract EXACTLY what is written in this image:
- What financial instruments are mentioned? (SIP, FD, PPF, stocks, mutual funds, etc.)
- What specific numbers, amounts, percentages, time periods are shown?
- What is the FORMAT? (comparison of two people, case study, data breakdown, story, etc.)
- What is the STRUCTURE? (how many sections, what order, what style)
- What is the HOOK or opening line?
- What is the KEY MESSAGE or conclusion?

STEP 2 — CREATE A SIMILAR POST:
Now create a NEW post that:
1. Uses the SAME FORMAT and STRUCTURE as the image
2. Uses the SAME TYPE of financial instruments (if image shows SIP vs FD, your post also compares SIP vs FD or similar)
3. Uses DIFFERENT but realistic numbers: age ${seed.age1}, salary Rs.${seed.salary.toLocaleString('en-IN')}, amount Rs.${seed.sipAmount.toLocaleString('en-IN')}/month, ${seed.years} years
4. Uses names: ${seed.names[0]} and ${seed.names[1]}
5. Has a DIFFERENT ANGLE or TWIST than the original — not a copy
6. Is MORE DETAILED and SPECIFIC than the original
7. Calculates EXACT corpus values using compound interest

${userHint ? `User's specific request: "${userHint}"` : ''}

RULES:
- Short punchy lines. NO paragraphs. Blank lines between sections.
- NO emojis in script or image text.
- Use Rs. for rupees.
- Every number must be calculated correctly.

Return ONLY valid JSON:
{
  "imageReading": "what you extracted from the image — instruments, numbers, format, structure",
  "subject": "what is in the image",
  "contentAngle": "the new angle you are taking",
  "suggestedTopic": "specific topic for this reel",
  "recommendedTone": "educational|motivational|urgent|casual",
  "hook": "one powerful hook line",
  "script": "full script matching the image format, short punchy lines, blank lines between sections",
  "caption": "Instagram caption with emojis",
  "hashtags": ["tag1", "tag2", "tag3"],
  "cta": "call to action",
  "hookImageText": "hook card — same format as image, ${seed.names[0]} and ${seed.names[1]}, specific numbers, NO emojis, blank lines",
  "contentImageText": "content card — same structure as image, exact calculated numbers, NO emojis, blank lines",
  "comparisonHookText": "comparison hook — ${seed.names[0]} vs ${seed.names[1]}, same starting point, NO emojis",
  "comparisonContentText": "comparison content — exact corpus for both, the gap, WHY it happened, NO emojis",
  "contentIdeas": ["variation 1 with different instruments", "variation 2 with different time period", "variation 3 with different scenario"]
}`

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
          max_tokens: 1500,
          temperature: 0.4,  // slightly higher for more variety
          stream: false,
        }),
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeoutId)
    }

    if (!response.ok) {
      throw new Error(`Vision API returned ${response.status}`)
    }

    const data    = await response.json()
    const rawText = data?.choices?.[0]?.message?.content || ''

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
      console.warn('Vision JSON parse failed')
      analysis = buildFallback(category.label, userHint, seed)
    }

    return NextResponse.json({ success: true, analysis, model: VISION_MODEL })
  } catch (error: any) {
    console.error('Image analysis error:', error.name, error.message)

    if (error.name === 'AbortError' || error.message?.includes('abort')) {
      return NextResponse.json({
        error: 'Vision AI timed out. Try a smaller image or use the text prompt mode.',
        code: 'TIMEOUT',
      }, { status: 504 })
    }

    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

function buildFallback(categoryLabel: string, userHint: string | null, seed: any) {
  return {
    imageReading: 'Could not read image content',
    subject: 'Finance content image',
    contentAngle: 'Educational finance story',
    suggestedTopic: userHint || `${categoryLabel} tips for Indians`,
    recommendedTone: 'educational',
    hook: `${seed.names[0]} and ${seed.names[1]} both earn Rs.${seed.salary.toLocaleString('en-IN')}/month. One will retire rich. One won't.`,
    script: `${seed.names[0]} and ${seed.names[1]}.\nSame salary. Same age.\n\nDifferent one decision.\n\n${seed.years} years later.\nThe gap is Rs.1 crore.\n\nWhat did ${seed.names[0]} do differently?`,
    caption: 'The one decision that changes everything. Follow for more.',
    hashtags: ['#IndianFinance', '#SIP', '#MutualFunds', '#MoneyTips'],
    cta: 'Follow for daily finance insights',
    hookImageText: `${seed.names[0]} and ${seed.names[1]}.\nBoth ${seed.age1} years old.\nBoth earn Rs.${seed.salary.toLocaleString('en-IN')}/month.\n\n${seed.names[0]} invests Rs.${seed.sipAmount.toLocaleString('en-IN')}/month in SIP.\n${seed.names[1]} keeps it in savings account.\n\nAfter ${seed.years} years...`,
    contentImageText: `${seed.names[0]}'s SIP corpus: Rs.${Math.round(seed.sipAmount * ((Math.pow(1 + 0.12/12, seed.years*12) - 1) / (0.12/12)) / 100000)} lakh\n${seed.names[1]}'s savings: Rs.${Math.round(seed.sipAmount * seed.years * 12 * 1.035 / 100000)} lakh\n\nDifference: Rs.${Math.round((seed.sipAmount * ((Math.pow(1 + 0.12/12, seed.years*12) - 1) / (0.12/12)) - seed.sipAmount * seed.years * 12 * 1.035) / 100000)} lakh\n\nSame money. Same years.\nDifferent decision.`,
    comparisonHookText: `${seed.names[0]} vs ${seed.names[1]}.\nSame Rs.${seed.sipAmount.toLocaleString('en-IN')}/month.\nSame ${seed.years} years.\n\nOne chose SIP.\nOne chose FD.\n\nThe difference will shock you.`,
    comparisonContentText: `SIP at 12% CAGR:\nRs.${Math.round(seed.sipAmount * ((Math.pow(1 + 0.12/12, seed.years*12) - 1) / (0.12/12)) / 100000)} lakh\n\nFD at 6.5%:\nRs.${Math.round(seed.sipAmount * ((Math.pow(1 + 0.065/12, seed.years*12) - 1) / (0.065/12)) / 100000)} lakh\n\nGap: Rs.${Math.round((seed.sipAmount * ((Math.pow(1 + 0.12/12, seed.years*12) - 1) / (0.12/12)) - seed.sipAmount * ((Math.pow(1 + 0.065/12, seed.years*12) - 1) / (0.065/12))) / 100000)} lakh\n\nThat is the cost of playing it safe.`,
    contentIdeas: [
      `${categoryLabel}: PPF vs ELSS over ${seed.years} years`,
      `${categoryLabel}: NPS vs mutual fund for retirement`,
      `${categoryLabel}: Gold vs equity over ${seed.years} years`,
    ],
  }
}
