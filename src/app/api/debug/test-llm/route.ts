import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function GET(request: NextRequest) {
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    })

    const model = process.env.OPENAI_MODEL || 'gpt-4-turbo-preview'

    const completion = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'user',
          content: `Create a viral Instagram Reel script about: 5 ways to save money on groceries

Return ONLY a valid JSON object with no extra text, no markdown, no code blocks. Just raw JSON:
{
  "hook": "attention grabbing opening line",
  "script": "full 30-60 second script",
  "caption": "instagram caption with emojis",
  "hashtags": ["hashtag1", "hashtag2"],
  "cta": "call to action",
  "imagePrompts": ["image prompt 1", "image prompt 2"]
}`,
        },
      ],
      temperature: 0.2,
      top_p: 0.7,
      max_tokens: 1500,
    })

    const rawText = completion.choices[0].message.content || ''

    // Try parsing with the same logic as the main app
    let parsed = null
    let parseError = null
    try {
      // Strip markdown if present
      let cleaned = rawText
        .replace(/^```json\s*/im, '')
        .replace(/^```\s*/im, '')
        .replace(/\s*```\s*$/im, '')
        .trim()

      // Fix control characters inside JSON strings
      let result = ''
      let inString = false
      let escaped = false
      for (let i = 0; i < cleaned.length; i++) {
        const ch = cleaned[i]
        if (escaped) { result += ch; escaped = false; continue }
        if (ch === '\\' && inString) { result += ch; escaped = true; continue }
        if (ch === '"') { inString = !inString; result += ch; continue }
        if (inString) {
          if (ch === '\n') { result += '\\n'; continue }
          if (ch === '\r') { result += '\\r'; continue }
          if (ch === '\t') { result += '\\t'; continue }
        }
        result += ch
      }

      parsed = JSON.parse(result)
    } catch (e: any) {
      parseError = e.message
    }

    return NextResponse.json({
      success: true,
      model,
      rawResponse: rawText,
      parsed,
      parseError,
      charCount: rawText.length,
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      details: error.response?.data || null,
    }, { status: 500 })
  }
}
