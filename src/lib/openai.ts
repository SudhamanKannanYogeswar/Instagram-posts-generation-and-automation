import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
})

export interface ContentGenerationParams {
  topic: string
  tone?: 'educational' | 'motivational' | 'urgent' | 'casual'
  targetAudience?: string
  includeStats?: boolean
}

export interface GeneratedContent {
  hook: string
  script: string
  caption: string
  hashtags: string[]
  cta: string
  imagePrompts: string[]
  hookImageText: string    // formatted text for hook image card
  contentImageText: string // formatted text for content image card
}

export async function generateFinanceContent(
  params: ContentGenerationParams
): Promise<GeneratedContent> {
  const { topic, tone = 'educational', includeStats = true } = params

  const systemPrompt = `You are an expert Indian finance content creator specialising in viral Instagram Reels for the Indian audience.
Your content uses Indian context: rupees (₹), SIP, mutual funds, FD, PPF, EPF, LIC, Zerodha, Groww, SEBI, NSE/BSE, Indian salary ranges, Indian cost of living.
Use relatable Indian examples: chai, auto-rickshaw, EMI, salary day, Diwali bonus, etc.
Tone: ${tone}
Write in simple, conversational English that every Indian can understand. Avoid jargon.`

  const userPrompt = `Create a viral Instagram Reel script for Indian audience about: ${topic}

Requirements:
1. HOOK (first 3 seconds): Shocking or relatable Indian fact/question. Use rupee amounts Indians relate to.
2. SCRIPT (30-60 seconds): Simple, actionable advice with Indian examples. Use SIP, FD, mutual funds, Zerodha/Groww where relevant.
3. CAPTION: Engaging caption with emojis, mix of English and common Hindi words (like "yaar", "bhai", "sahi hai")
4. HASHTAGS: 10-15 relevant hashtags including Indian ones like #IndianFinance #SIP #MutualFunds #MoneyTipsIndia
5. CTA: Strong call-to-action relevant to Indian audience
${includeStats ? '6. Include real Indian statistics (e.g. "Only 3% of Indians invest in stocks")' : ''}

IMPORTANT - Also generate text for 2 image cards:

IMAGE 1 - HOOK CARD:
Pure text, no emojis, black background style.
Should be a shocking/relatable opening statement that stops the scroll.
Format it like a story opening - short punchy lines, use rupee amounts, real scenarios.
Example style:
"Age: 32. Software Engineer.
Monthly Salary: Rs.80,000
Monthly SIP: Rs.0
Reason: 'I will start next month.'
Next month never came.
10 years passed."

IMAGE 2 - CONTENT CARD:
Pure text, no emojis, black background style.
The actual valuable content - facts, steps, or breakdown.
Format with clear structure - use line breaks between points.
Use rupee amounts, percentages, real Indian fund names where relevant.
Example style:
"Rs.5,000 SIP started at age 25
vs
Rs.10,000 SIP started at age 35

At 60, the Rs.5,000 SIP gives more.

Why?
Compounding needs time, not just money.

Start small. Start now.
Time in market beats timing the market."

Format your response as JSON:
{
  "hook": "The opening hook (1 sentence, Indian context)",
  "script": "Full script with Indian examples and rupee amounts",
  "caption": "Instagram caption with emojis and Indian flavour",
  "hashtags": ["hashtag1", "hashtag2", ...],
  "cta": "Call to action for Indian audience",
  "hookImageText": "Multi-line text for hook image card (no emojis, use \\n for line breaks)",
  "contentImageText": "Multi-line text for content image card (no emojis, use \\n for line breaks)"
}`

  try {
    const model = process.env.OPENAI_MODEL || 'gpt-4-turbo-preview'
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
      top_p: 0.7,
      max_tokens: 2000,
    })

    const responseText = completion.choices[0].message.content || '{}'
    const content = parseAIResponse(responseText)
    return content as GeneratedContent
  } catch (error) {
    console.error('Error generating content:', error)
    throw new Error('Failed to generate content')
  }
}

// Robust parser that handles all LLM response formats
function parseAIResponse(text: string): GeneratedContent {
  // Step 1: Strip markdown code fences if present
  let cleaned = text
    .replace(/^```json\s*/im, '')
    .replace(/^```\s*/im, '')
    .replace(/\s*```\s*$/im, '')
    .trim()

  // Step 2: Fix bad control characters inside JSON string values
  // Replace literal newlines/tabs inside JSON strings with escaped versions
  cleaned = sanitizeJsonString(cleaned)

  // Step 3: Try JSON.parse
  try {
    const parsed = JSON.parse(cleaned)
    return normalizeContent(parsed)
  } catch (e) {
    console.warn('JSON parse failed after sanitization, trying regex extraction. Error:', e)
  }

  // Step 4: Fallback - extract fields using regex directly from raw text
  return extractWithRegex(text)
}

// Fix control characters that break JSON.parse
function sanitizeJsonString(str: string): string {
  // We need to replace literal newlines/tabs that appear INSIDE JSON string values
  // Strategy: walk through and only replace control chars inside quoted strings
  let result = ''
  let inString = false
  let escaped = false

  for (let i = 0; i < str.length; i++) {
    const ch = str[i]

    if (escaped) {
      result += ch
      escaped = false
      continue
    }

    if (ch === '\\' && inString) {
      result += ch
      escaped = true
      continue
    }

    if (ch === '"') {
      inString = !inString
      result += ch
      continue
    }

    if (inString) {
      // Replace control characters with their escaped equivalents
      if (ch === '\n') { result += '\\n'; continue }
      if (ch === '\r') { result += '\\r'; continue }
      if (ch === '\t') { result += '\\t'; continue }
    }

    result += ch
  }

  return result
}

// Normalize parsed object to ensure all fields exist
function normalizeContent(parsed: any): GeneratedContent {
  return {
    hook: String(parsed.hook || ''),
    script: String(parsed.script || ''),
    caption: String(parsed.caption || ''),
    hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags.map(String) : [],
    cta: String(parsed.cta || ''),
    imagePrompts: [],
    hookImageText: String(parsed.hookImageText || parsed.hook || ''),
    contentImageText: String(parsed.contentImageText || parsed.script || ''),
  }
}

// Last resort: extract fields using regex from raw text
function extractWithRegex(text: string): GeneratedContent {
  const extract = (key: string): string => {
    // Match "key": "value" or "key": "multi\nline\nvalue"
    const re = new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`, 'i')
    const m = text.match(re)
    return m ? m[1].replace(/\\n/g, '\n').replace(/\\"/g, '"') : ''
  }

  const extractArray = (key: string): string[] => {
    const re = new RegExp(`"${key}"\\s*:\\s*\\[([^\\]]+)\\]`, 'i')
    const m = text.match(re)
    if (!m) return []
    return m[1].match(/"([^"]+)"/g)?.map(s => s.replace(/"/g, '')) || []
  }

  return {
    hook: extract('hook'),
    script: extract('script'),
    caption: extract('caption'),
    hashtags: extractArray('hashtags'),
    cta: extract('cta'),
    imagePrompts: [],
    hookImageText: extract('hookImageText') || extract('hook'),
    contentImageText: extract('contentImageText') || extract('script'),
  }
}

export async function generateImagePrompt(topic: string, style: string = 'modern minimalist'): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      {
        role: 'system',
        content: 'You are an expert at creating DALL-E image prompts for finance content.',
      },
      {
        role: 'user',
        content: `Create a detailed DALL-E prompt for a ${style} background image about: ${topic}. 
The image should be suitable for Instagram Reels (9:16 aspect ratio), professional, and eye-catching.
Focus on: abstract concepts, money symbols, growth charts, modern design.
Keep it under 400 characters.`,
      },
    ],
    max_tokens: 200,
  })

  return completion.choices[0].message.content || ''
}

export async function generateImage(prompt: string): Promise<string> {
  try {
    // NVIDIA FLUX.1-schnell image generation - same API key, different endpoint
    const response = await fetch('https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-schnell', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        prompt: prompt,
        width: 1024,
        height: 1024,
        num_inference_steps: 4,
        guidance: 3.5,
        num_images: 1,
        seed: Math.floor(Math.random() * 1000000),
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('NVIDIA image generation error:', errText)
      throw new Error(`Image generation failed: ${response.status}`)
    }

    const data = await response.json()

    // NVIDIA returns base64 encoded image
    if (data.artifacts?.[0]?.base64) {
      // Return as data URL so it can be displayed directly
      return `data:image/jpeg;base64,${data.artifacts[0].base64}`
    }

    throw new Error('No image data in response')
  } catch (error) {
    console.error('Error generating image with NVIDIA FLUX:', error)
    // Fallback to a styled placeholder
    const encoded = encodeURIComponent(prompt.substring(0, 40))
    return `https://placehold.co/1080x1920/1a1a2e/white?text=${encoded}`
  }
}

export async function improveHook(originalHook: string): Promise<string[]> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      {
        role: 'system',
        content: 'You are an expert at creating viral social media hooks.',
      },
      {
        role: 'user',
        content: `Generate 3 alternative viral hooks for this finance content: "${originalHook}"
        
Make them:
- Attention-grabbing in first 3 seconds
- Use numbers, questions, or controversial statements
- Create curiosity gap
- Be specific and concrete

Return as JSON array: ["hook1", "hook2", "hook3"]`,
      },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 300,
  })

  const result = JSON.parse(completion.choices[0].message.content || '{"hooks":[]}')
  return result.hooks || []
}

export default openai
