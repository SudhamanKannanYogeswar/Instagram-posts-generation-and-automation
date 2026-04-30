import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
})

// Extract Instagram post ID from URL
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

export async function POST(request: NextRequest) {
  try {
    const { url, userPrompt } = await request.json()

    if (!url) {
      return NextResponse.json({ error: 'Instagram URL required' }, { status: 400 })
    }

    const postId = extractInstagramPostId(url)
    if (!postId) {
      return NextResponse.json({ error: 'Invalid Instagram URL' }, { status: 400 })
    }

    // Since we can't directly scrape Instagram (requires auth),
    // we'll use the LLM to generate content inspired by the URL pattern
    // and any user-provided context
    const model = process.env.OPENAI_MODEL || 'meta/llama-3.3-70b-instruct'

    const completion = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'user',
          content: `I want to create a similar Instagram Reel inspired by this post: ${url}

${userPrompt ? `My specific requirements/tweaks: ${userPrompt}` : ''}

Based on the URL pattern and context, generate a finance-focused Instagram Reel concept.
The content should be about savings, investments, or personal finance.

Return as JSON:
{
  "suggestedTopic": "specific finance topic",
  "contentAngle": "unique angle for this content",
  "recommendedTone": "educational|motivational|urgent|casual",
  "keyPoints": ["point1", "point2", "point3"],
  "differentiators": "what makes this version unique",
  "targetAudience": "who this is for"
}`,
        },
      ],
      max_tokens: 600,
      temperature: 0.3,
    })

    const responseText = completion.choices[0].message.content || '{}'

    let analysis: any
    try {
      const jsonMatch = responseText.match(/```json\n?([\s\S]*?)\n?```/) ||
        responseText.match(/\{[\s\S]*\}/)
      const jsonText = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : responseText
      // Fix control characters
      const cleaned = jsonText.replace(/[\x00-\x1F\x7F]/g, ' ')
      analysis = JSON.parse(cleaned)
    } catch {
      analysis = {
        suggestedTopic: userPrompt || 'Personal finance tips inspired by viral content',
        contentAngle: 'Educational with actionable steps',
        recommendedTone: 'educational',
        keyPoints: ['Save consistently', 'Invest early', 'Build emergency fund'],
        differentiators: 'More specific and actionable than the original',
        targetAudience: 'Young professionals aged 25-35',
      }
    }

    return NextResponse.json({
      success: true,
      postId,
      analysis,
    })
  } catch (error: any) {
    console.error('Instagram fetch error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
