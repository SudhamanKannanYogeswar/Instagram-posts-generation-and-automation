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
  hookImageText: string
  contentImageText: string
  // Version 2 — comparison style
  comparisonHookText: string
  comparisonContentText: string
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

  // Inject randomness so numbers vary every generation
  const seed = {
    age1: 24 + Math.floor(Math.random() * 6),        // 24-29
    age2: 30 + Math.floor(Math.random() * 8),        // 30-37
    salary: [45000, 52000, 58000, 65000, 72000, 80000][Math.floor(Math.random() * 6)],
    sipAmount: [3000, 5000, 7500, 8000, 10000, 12000][Math.floor(Math.random() * 6)],
    years: [15, 18, 20, 22, 25][Math.floor(Math.random() * 5)],
    cagr1: [11, 12, 13, 14, 15][Math.floor(Math.random() * 5)],
    cagr2: [5, 6, 7][Math.floor(Math.random() * 3)],
    investment1: ['HDFC Flexi Cap Fund', 'Mirae Asset Large Cap', 'Parag Parikh Flexi Cap', 'Axis Bluechip Fund', 'SBI Small Cap Fund'][Math.floor(Math.random() * 5)],
    investment2: ['FD', 'RD', 'LIC endowment plan', 'Post Office MIS', 'savings account'][Math.floor(Math.random() * 5)],
    names: [['Rahul', 'Arjun'], ['Priya', 'Meera'], ['Karthik', 'Vikram'], ['Ananya', 'Sneha'], ['Rohan', 'Amit']][Math.floor(Math.random() * 5)],
  }

  const userPrompt = `Create a viral Instagram Reel for Indian audience about: ${topic}

RANDOMIZED SCENARIO (use these EXACT values — do not change them):
- Names: ${seed.names[0]} and ${seed.names[1]}
- Age: ${seed.age1} years old
- Monthly salary: Rs.${seed.salary.toLocaleString('en-IN')}
- Monthly investment amount: Rs.${seed.sipAmount.toLocaleString('en-IN')}
- Time period: ${seed.years} years
- Investment 1 (smart choice): ${seed.investment1} at ${seed.cagr1}% CAGR
- Investment 2 (poor choice): ${seed.investment2} at ${seed.cagr2}% returns
- Calculate the EXACT corpus for both using compound interest formula

CONTENT QUALITY RULES:
1. Calculate EXACT corpus values using: P * ((1+r)^n - 1) / r where r = monthly rate
   - Smart choice corpus = Rs.${seed.sipAmount} * ((1+${seed.cagr1/100}/12)^${seed.years*12} - 1) / (${seed.cagr1/100}/12)
   - Poor choice corpus = Rs.${seed.sipAmount} * ${seed.years * 12} * (1 + ${seed.cagr2/100}/2) [approximate for FD/RD]
2. Show the EXACT rupee difference — not approximate
3. Include WHY the difference happens (compounding, inflation, real returns)
4. Reference real Indian context: salary credit day, EMI, Diwali bonus
5. End with a question that makes them think about their own money
6. NO generic advice — every line must have specific data

FORMAT: Short punchy lines. Blank lines between sections. NO emojis. NO paragraphs.

${includeStats ? 'Include: inflation rate (6%), real returns after inflation, tax implications where relevant.' : ''}

Return as JSON:
{
  "hook": "one powerful hook using the exact names and scenario",
  "script": "full script with exact calculated numbers, short punchy lines, blank lines between sections",
  "caption": "Instagram caption with emojis",
  "hashtags": ["tag1", "tag2", "tag3"],
  "cta": "call to action",
  "hookImageText": "VERSION 1 story hook — ${seed.names[0]}'s journey, specific numbers, NO emojis, blank lines between sections",
  "contentImageText": "VERSION 1 content — exact corpus breakdown, real returns, inflation impact, NO emojis, blank lines between points",
  "comparisonHookText": "VERSION 2 comparison hook — ${seed.names[0]} vs ${seed.names[1]}, same Rs.${seed.sipAmount.toLocaleString('en-IN')}/month, different choice, NO emojis, blank lines",
  "comparisonContentText": "VERSION 2 comparison content — exact calculated corpus for both, the gap in Rs., WHY it happened, NO emojis, blank lines"
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
    comparisonHookText: String(parsed.comparisonHookText || parsed.hookImageText || parsed.hook || ''),
    comparisonContentText: String(parsed.comparisonContentText || parsed.contentImageText || parsed.script || ''),
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
    comparisonHookText: extract('comparisonHookText') || extract('hookImageText') || extract('hook'),
    comparisonContentText: extract('comparisonContentText') || extract('contentImageText') || extract('script'),
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
