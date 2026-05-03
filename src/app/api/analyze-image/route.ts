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

    // Let the LLM generate a fresh scenario — no hardcoded lists
    // This gives maximum variety: any name, any salary, any investment
    const scenarioPrompt = `Generate a realistic Indian finance scenario for a viral Instagram Reel.
The scenario should be inspired by the image content but with DIFFERENT values.

Pick values that feel REAL. No fixed ranges — use your judgment.
Names should be diverse Indian names from different regions/communities.
Salary can be anything from Rs.25,000 to Rs.5 lakh/month.
Investment can be anything from Rs.1,000 to Rs.1 lakh/month.
Could involve crores if the scenario calls for it.

Return ONLY valid JSON:
{
  "name1": "first Indian name",
  "name2": "second Indian name (different region from name1)",
  "age": number,
  "profession1": "profession",
  "profession2": "profession",
  "monthlySalary": number,
  "monthlyInvestment": number,
  "years": number,
  "investment1": "smart investment (specific fund/instrument name)",
  "investment2": "poor/average investment",
  "cagr1": number,
  "cagr2": number,
  "moralLine": "one short powerful moral lesson for the end"
}`

    let scenario: any
    try {
      const scenarioRes = await fetch(VISION_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${VISION_KEY}`, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          model: 'meta/llama-3.3-70b-instruct',
          messages: [{ role: 'user', content: scenarioPrompt }],
          max_tokens: 300, temperature: 0.9, stream: false,
        }),
        signal: AbortSignal.timeout(10000),
      })
      const sData = await scenarioRes.json()
      const sRaw = sData?.choices?.[0]?.message?.content || '{}'
      const sCleaned = sRaw.replace(/^```json\s*/im, '').replace(/^```\s*/im, '').replace(/\s*```\s*$/im, '').trim()
      scenario = JSON.parse(sCleaned)
    } catch {
      scenario = {
        name1: 'Arjun', name2: 'Deepak', age: 28,
        profession1: 'Software Engineer', profession2: 'Bank Manager',
        monthlySalary: 85000, monthlyInvestment: 10000,
        years: 20, investment1: 'Parag Parikh Flexi Cap Fund', investment2: 'FD',
        cagr1: 13, cagr2: 6,
        moralLine: 'The best time to invest was yesterday. The second best time is today.',
      }
    }

    // Calculate exact corpus
    const r1 = scenario.cagr1 / 100 / 12
    const r2 = scenario.cagr2 / 100 / 12
    const n  = scenario.years * 12
    const P  = scenario.monthlyInvestment
    const corpus1 = Math.round(P * ((Math.pow(1 + r1, n) - 1) / r1))
    const corpus2 = Math.round(P * ((Math.pow(1 + r2, n) - 1) / r2))
    const gap = corpus1 - corpus2

    const fmtRs = (v: number) => {
      if (v >= 10000000) return `Rs.${(v/10000000).toFixed(2)} crore`
      if (v >= 100000)   return `Rs.${(v/100000).toFixed(1)} lakh`
      return `Rs.${v.toLocaleString('en-IN')}`
    }

    const prompt = `You are an expert ${category.label} content creator for Indian Instagram.

${category.systemPrompt}

STEP 1 — READ THE IMAGE CAREFULLY:
Extract EXACTLY what is written in this image:
- What financial instruments are mentioned? (SIP, FD, PPF, stocks, mutual funds, etc.)
- What specific numbers, amounts, percentages, time periods are shown?
- What is the FORMAT? (comparison of two people, case study, data breakdown, story, etc.)
- What is the STRUCTURE? (how many sections, what order, what style)
- What is the HOOK or opening line?
- What is the KEY MESSAGE or conclusion?

STEP 2 — CREATE A SIMILAR POST using this EXACT scenario:
- Name 1: ${scenario.name1} (${scenario.profession1})
- Name 2: ${scenario.name2} (${scenario.profession2})
- Age: ${scenario.age} years old
- Monthly salary: ${fmtRs(scenario.monthlySalary)}
- Monthly investment: ${fmtRs(P)}
- Time period: ${scenario.years} years
- ${scenario.name1}'s choice: ${scenario.investment1} at ${scenario.cagr1}% CAGR -> ${fmtRs(corpus1)}
- ${scenario.name2}'s choice: ${scenario.investment2} at ${scenario.cagr2}% -> ${fmtRs(corpus2)}
- Gap: ${fmtRs(gap)}
- Moral line (end every card with this): "${scenario.moralLine}"

RULES:
1. Use the SAME FORMAT and STRUCTURE as the image
2. Use the SAME TYPE of financial instruments shown in the image
3. Use the EXACT numbers from the scenario above
4. End EVERY image card with the moral line
5. Short punchy lines. Blank lines between sections. NO emojis.
${userHint ? `User's specific request: "${userHint}"` : ''}

Return ONLY valid JSON:
{
  "imageReading": "what you extracted from the image",
  "subject": "what is in the image",
  "contentAngle": "the new angle you are taking",
  "suggestedTopic": "specific topic for this reel",
  "recommendedTone": "educational|motivational|urgent|casual",
  "hook": "one powerful hook line",
  "script": "full script matching image format, short punchy lines, blank lines, ends with moral line",
  "caption": "Instagram caption with emojis",
  "hashtags": ["tag1", "tag2", "tag3"],
  "cta": "call to action",
  "hookImageText": "hook card — same format as image, ${scenario.name1} and ${scenario.name2}, NO emojis, blank lines, ends with moral line",
  "contentImageText": "content card — same structure as image, exact numbers, NO emojis, blank lines, ends with moral line",
  "comparisonHookText": "comparison hook — ${scenario.name1} vs ${scenario.name2}, same ${fmtRs(P)}/month, NO emojis",
  "comparisonContentText": "comparison content — ${fmtRs(corpus1)} vs ${fmtRs(corpus2)}, gap ${fmtRs(gap)}, WHY, NO emojis, ends with moral line",
  "contentIdeas": ["variation 1", "variation 2", "variation 3"]
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
      analysis = buildFallback(category.label, userHint, scenario)
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
