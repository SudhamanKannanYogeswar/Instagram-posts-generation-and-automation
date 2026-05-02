import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
})

function extractInstagramPostId(url: string): string | null {
  const patterns = [
    /instagram\.com\/p\/([A-Za-z0-9_-]+)/,
    /instagram\.com\/reel\/([A-Za-z0-9_-]+)/,
    /instagram\.com\/tv\/([A-Za-z0-9_-]+)/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

interface OEmbedData {
  title?: string          // caption text
  author_name?: string    // username
  thumbnail_url?: string  // cover image URL
  type?: string
}

/** Fetch real post data from Instagram's public oEmbed API */
async function fetchInstagramOEmbed(postUrl: string): Promise<OEmbedData | null> {
  try {
    const encoded = encodeURIComponent(postUrl)
    const res = await fetch(
      `https://www.instagram.com/api/v1/oembed/?url=${encoded}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; bot/1.0)',
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(8000),
      }
    )
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const { url, userPrompt } = await request.json()

    if (!url) {
      return NextResponse.json({ error: 'Instagram URL required' }, { status: 400 })
    }

    const postId = extractInstagramPostId(url)
    if (!postId) {
      return NextResponse.json({ error: 'Invalid Instagram URL. Paste a post or reel link.' }, { status: 400 })
    }

    // ── Step 1: Fetch REAL post data from Instagram oEmbed ──
    const oembed = await fetchInstagramOEmbed(url)

    const realCaption = oembed?.title || ''
    const realAuthor = oembed?.author_name || ''
    const thumbnailUrl = oembed?.thumbnail_url || ''

    // ── Step 2: Send real data to LLM to create a finance-adapted concept ──
    const model = process.env.OPENAI_MODEL || 'meta/llama-3.3-70b-instruct'

    const hasRealData = realCaption.length > 0

    const systemPrompt = `You are an expert finance content creator who specialises in adapting viral social media content into finance-focused Instagram Reels about savings, investments, and personal finance.`

    const userMessage = hasRealData
      ? `I found this Instagram post and want to create a finance-focused Reel inspired by it.

REAL POST DATA:
- Author: @${realAuthor}
- Caption: "${realCaption}"
- Post URL: ${url}
${userPrompt ? `\nMy specific requirements: ${userPrompt}` : ''}

Analyse the post's style, format, hook technique, and engagement approach. Then create a finance-focused concept that:
1. Uses the SAME content format/style as the original (e.g. if it's a list, make a finance list; if it's a story, tell a finance story)
2. Adapts the hook technique to finance
3. Keeps what makes the original viral but applies it to savings/investments/personal finance

Return as JSON:
{
  "originalStyle": "brief description of the original post's format and style",
  "suggestedTopic": "specific finance topic that mirrors the original's style",
  "contentAngle": "how to adapt the original's approach to finance",
  "recommendedTone": "educational|motivational|urgent|casual",
  "keyPoints": ["point1", "point2", "point3"],
  "hookIdea": "specific hook inspired by the original post",
  "differentiators": "what makes this finance version unique"
}`
      : `I want to create a finance Reel inspired by this Instagram post: ${url}
${userPrompt ? `\nMy requirements: ${userPrompt}` : ''}

Note: I couldn't fetch the post data. Please create a general finance concept.

Return as JSON:
{
  "originalStyle": "unknown - could not fetch post",
  "suggestedTopic": "specific finance topic",
  "contentAngle": "educational finance angle",
  "recommendedTone": "educational|motivational|urgent|casual",
  "keyPoints": ["point1", "point2", "point3"],
  "hookIdea": "attention-grabbing finance hook",
  "differentiators": "what makes this unique"
}`

    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 700,
      temperature: 0.3,
    })

    const responseText = completion.choices[0].message.content || '{}'

    let analysis: any
    try {
      // Strip markdown fences + fix control chars
      let cleaned = responseText
        .replace(/^```json\s*/im, '').replace(/^```\s*/im, '').replace(/\s*```\s*$/im, '').trim()
      // Fix literal newlines inside JSON strings
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
      analysis = {
        originalStyle: hasRealData ? `Post by @${realAuthor}` : 'unknown',
        suggestedTopic: userPrompt || 'Personal finance tips',
        contentAngle: 'Educational with actionable steps',
        recommendedTone: 'educational',
        keyPoints: ['Save consistently', 'Invest early', 'Build emergency fund'],
        hookIdea: 'Stop wasting money on things that don\'t grow your wealth',
        differentiators: 'Finance-focused version of the original style',
      }
    }

    return NextResponse.json({
      success: true,
      postId,
      fetchedRealData: hasRealData,
      originalPost: hasRealData ? {
        caption: realCaption.substring(0, 300),
        author: realAuthor,
        thumbnailUrl,
      } : null,
      analysis,
    })
  } catch (error: any) {
    console.error('Instagram fetch error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
