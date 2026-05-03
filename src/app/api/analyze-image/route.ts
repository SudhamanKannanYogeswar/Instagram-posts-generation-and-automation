import { NextRequest, NextResponse } from 'next/server'

const VISION_URL = 'https://integrate.api.nvidia.com/v1/chat/completions'
const VISION_MODEL = process.env.VISION_MODEL || 'mistralai/mistral-large-3-675b-instruct-2512'
const VISION_KEY = process.env.VISION_API_KEY || process.env.OPENAI_API_KEY || ''

/**
 * Analyse an uploaded image using Mistral Large 3 vision.
 * Returns rich context for Indian finance content generation.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const imageFile = formData.get('image') as File | null
    const imageUrl  = formData.get('imageUrl') as string | null
    const userHint  = formData.get('prompt') as string | null

    if (!imageFile && !imageUrl) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    // ── Build image content block ──────────────────────────────────────────
    let imageContent: { type: string; image_url: { url: string } }

    if (imageFile) {
      const bytes  = await imageFile.arrayBuffer()
      const b64    = Buffer.from(bytes).toString('base64')
      const mime   = imageFile.type || 'image/jpeg'
      imageContent = { type: 'image_url', image_url: { url: `data:${mime};base64,${b64}` } }
    } else {
      imageContent = { type: 'image_url', image_url: { url: imageUrl! } }
    }

    // ── Vision prompt ──────────────────────────────────────────────────────
    const analysisPrompt = `You are an expert Indian finance content creator analysing an image to create a viral Instagram Reel.

Carefully look at this image and answer:
1. What is the main subject or scene? (e.g. stock chart, person with money, shopping, food, lifestyle)
2. What emotions or story does it convey?
3. What Indian finance topic does this image best represent? (savings, SIP, FD, debt, spending habits, salary, EMI, etc.)
4. What would be the most relatable hook for an Indian audience based on this image?
5. What content tone fits best? (educational / motivational / urgent / casual)
6. List 3 specific Indian finance content ideas this image could illustrate.

${userHint ? `Additional context from user: "${userHint}"` : ''}

Return ONLY valid JSON (no markdown, no extra text):
{
  "subject": "what is literally in the image",
  "emotion": "mood or story the image conveys",
  "suggestedTopic": "specific Indian finance topic this image suits best",
  "hookIdea": "attention-grabbing opening line for Indian audience using this image",
  "recommendedTone": "educational|motivational|urgent|casual",
  "indianContext": "how this relates to everyday Indian financial life",
  "contentIdeas": ["idea 1", "idea 2", "idea 3"],
  "visualElements": ["element 1", "element 2"]
}`

    // ── Call Mistral Large 3 vision ────────────────────────────────────────
    const response = await fetch(VISION_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${VISION_KEY}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        model: VISION_MODEL,
        messages: [
          {
            role: 'user',
            content: [
              imageContent,
              { type: 'text', text: analysisPrompt },
            ],
          },
        ],
        max_tokens: 800,
        temperature: 0.15,
        top_p: 1.0,
        stream: false,
      }),
      signal: AbortSignal.timeout(30000),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('Vision API error:', errText)
      throw new Error(`Vision API returned ${response.status}`)
    }

    const data = await response.json()
    const rawText = data?.choices?.[0]?.message?.content || ''

    // ── Parse JSON from response ───────────────────────────────────────────
    let analysis: any
    try {
      // Strip markdown fences if present
      let cleaned = rawText
        .replace(/^```json\s*/im, '')
        .replace(/^```\s*/im, '')
        .replace(/\s*```\s*$/im, '')
        .trim()

      // Fix control characters inside JSON strings
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
      // Fallback: extract what we can
      console.warn('Vision JSON parse failed, using fallback')
      analysis = {
        subject: 'Finance-related image',
        emotion: 'Professional',
        suggestedTopic: userHint || 'Personal finance tips for Indians',
        hookIdea: 'Yaar, kya tumhara paisa sach mein kaam kar raha hai?',
        recommendedTone: 'educational',
        indianContext: 'Relates to everyday Indian financial decisions',
        contentIdeas: [
          'How to start SIP with just ₹500/month',
          'Why most Indians never become rich',
          'The ₹10,000 savings trick nobody tells you',
        ],
        visualElements: ['image content'],
      }
    }

    return NextResponse.json({ success: true, analysis, model: VISION_MODEL })
  } catch (error: any) {
    console.error('Image analysis error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
