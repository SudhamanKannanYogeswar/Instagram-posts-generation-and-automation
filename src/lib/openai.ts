import OpenAI from 'openai'
import { getCategoryById, DEFAULT_CATEGORY } from './categories'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
})

export interface ContentGenerationParams {
  topic: string
  tone?: 'educational' | 'motivational' | 'urgent' | 'casual'
  targetAudience?: string
  includeStats?: boolean
  categoryId?: string
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
  const { topic, tone = 'educational', includeStats = true, categoryId } = params

  const category = getCategoryById(categoryId || 'personal_finance') || DEFAULT_CATEGORY

  const systemPrompt = `${category.systemPrompt}

You write content that makes people stop scrolling and think "I never knew this."
You use REAL specific numbers, REAL Indian names, REAL scenarios.
You always include a COMPARISON between two people or two choices — this is the most viral format.
You write like a storyteller, not a teacher.
Tone: ${tone}`

  const userPrompt = `Create a viral Instagram Reel for Indian audience about: ${topic}

QUALITY RULES — your content must:
1. Use a COMPARISON (Person A vs Person B, or Choice A vs Choice B) — this is mandatory
2. Use SPECIFIC numbers (not Rs.10,000 — use Rs.8,340 or Rs.12,500)
3. Include a TWIST or SURPRISING FACT that most people don't know
4. Reference REAL Indian life: salary credit day, Diwali shopping, EMI due date, office canteen, etc.
5. Make the reader feel "this is exactly my situation"
6. NO generic advice like "start saving" — give SPECIFIC actionable insight

FORMAT RULES:
- Short punchy lines only. NO paragraphs.
- Blank lines between sections.
- NO emojis in script or image text.
- Build tension, then reveal the twist.
- End with a question that makes them think.

COMPARISON EXAMPLE (use this style for hookImageText):
"Arjun and Vikram both earn Rs.65,000/month.
Both are 27 years old.
Both have the same expenses.

Arjun puts Rs.8,000 in FD every month.
Vikram puts Rs.8,000 in SIP every month.

At age 50:
Arjun has Rs.38 lakh.
Vikram has Rs.1.4 crore.

Same salary. Same years. Same amount.
Different decision."

CONTENT BREAKDOWN EXAMPLE (use this style for contentImageText):
"Why the difference?

FD gives 6-7% returns.
Inflation is 6%.
Real return: almost zero.

SIP in equity gives 12-15% CAGR.
After inflation: 6-9% real return.

Rs.8,000/month for 23 years:
FD: Rs.38 lakh
SIP: Rs.1.4 crore

The gap: Rs.1.02 crore.

That is the cost of playing it safe."

${includeStats ? 'Include real Indian statistics and specific fund performance data.' : ''}

Return as JSON:
{
  "hook": "one powerful hook line that creates curiosity or shock",
  "script": "full script with comparison story, short punchy lines, blank lines between sections, ends with a question",
  "caption": "Instagram caption with emojis",
  "hashtags": ["tag1", "tag2", "tag3"],
  "cta": "call to action",
  "hookImageText": "comparison story - two real Indian names, specific numbers, same starting point, shocking difference at the end. NO emojis. Blank lines between sections.",
  "contentImageText": "the WHY breakdown - specific numbers, percentages, the surprising reason behind the difference. NO emojis. Blank lines between points."
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
