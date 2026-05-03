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

  // Step 1: Ask the LLM to generate a fresh, realistic scenario first
  // This gives far more variety than hardcoded lists
  const scenarioPrompt = `Generate a realistic Indian finance scenario for a viral Instagram Reel about: ${topic}

Pick values that feel REAL and RELATABLE to Indian audience. No fixed ranges — use your judgment.
Examples of variety:
- Could be a doctor earning Rs.3L/month or a teacher earning Rs.35,000/month
- Could be Rs.2,000 SIP or Rs.50,000 SIP
- Could be 10 years or 30 years
- Could be crores or lakhs depending on the scenario
- Names should be diverse Indian names — not just common ones

Return ONLY valid JSON (no markdown):
{
  "name1": "first Indian name",
  "name2": "second Indian name (different region/community from name1)",
  "age": number between 22 and 45,
  "profession1": "profession for name1",
  "profession2": "profession for name2",
  "monthlySalary": number in rupees (realistic for the profession),
  "monthlyInvestment": number in rupees (realistic portion of salary),
  "years": number between 10 and 30,
  "investment1": "smart investment choice (specific fund name or instrument)",
  "investment2": "poor/average investment choice",
  "cagr1": number between 10 and 18,
  "cagr2": number between 4 and 8,
  "moralLine": "one short powerful moral/lesson line for the end of the post"
}`

  let scenario: any
  try {
    const scenarioCompletion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'meta/llama-3.3-70b-instruct',
      messages: [{ role: 'user', content: scenarioPrompt }],
      temperature: 0.9,  // high temperature for maximum variety
      max_tokens: 400,
    })
    const raw = scenarioCompletion.choices[0].message.content || '{}'
    const cleaned = raw.replace(/^```json\s*/im, '').replace(/^```\s*/im, '').replace(/\s*```\s*$/im, '').trim()
    scenario = JSON.parse(cleaned)
  } catch {
    // Fallback scenario if LLM fails
    scenario = {
      name1: 'Arjun', name2: 'Deepak',
      age: 28, profession1: 'Software Engineer', profession2: 'Bank Manager',
      monthlySalary: 85000, monthlyInvestment: 10000,
      years: 20, investment1: 'Parag Parikh Flexi Cap Fund', investment2: 'FD',
      cagr1: 13, cagr2: 6,
      moralLine: 'The best time to invest was yesterday. The second best time is today.',
    }
  }

  // Calculate exact corpus values
  const r1 = scenario.cagr1 / 100 / 12
  const r2 = scenario.cagr2 / 100 / 12
  const n  = scenario.years * 12
  const P  = scenario.monthlyInvestment
  const corpus1 = Math.round(P * ((Math.pow(1 + r1, n) - 1) / r1))
  const corpus2 = Math.round(P * ((Math.pow(1 + r2, n) - 1) / r2))
  const gap = corpus1 - corpus2

  const formatRs = (n: number) => {
    if (n >= 10000000) return `Rs.${(n/10000000).toFixed(2)} crore`
    if (n >= 100000)   return `Rs.${(n/100000).toFixed(1)} lakh`
    return `Rs.${n.toLocaleString('en-IN')}`
  }

  const userPrompt = `Create a viral Instagram Reel for Indian audience about: ${topic}

USE THIS EXACT SCENARIO (already calculated — do not change numbers):
- Name 1: ${scenario.name1} (${scenario.profession1})
- Name 2: ${scenario.name2} (${scenario.profession2})
- Age: ${scenario.age} years old
- Monthly salary: ${formatRs(scenario.monthlySalary)}
- Monthly investment: ${formatRs(P)}
- Time period: ${scenario.years} years
- ${scenario.name1}'s choice: ${scenario.investment1} at ${scenario.cagr1}% CAGR → corpus = ${formatRs(corpus1)}
- ${scenario.name2}'s choice: ${scenario.investment2} at ${scenario.cagr2}% returns → corpus = ${formatRs(corpus2)}
- Gap: ${formatRs(gap)}
- Moral line: "${scenario.moralLine}"

CONTENT RULES:
1. Use EXACT numbers above — do not recalculate or change them
2. Show WHY the difference happens (compounding, inflation, real returns)
3. Reference real Indian life: salary credit day, EMI, Diwali bonus, office canteen
4. End EVERY image card with the moral line: "${scenario.moralLine}"
5. NO generic advice — every line must have specific data from the scenario above
6. Short punchy lines. Blank lines between sections. NO emojis. NO paragraphs.
${includeStats ? '7. Include inflation rate (6%), real returns after inflation.' : ''}

Return as JSON:
{
  "hook": "one powerful hook using ${scenario.name1} and ${scenario.name2}",
  "script": "full script with exact numbers, short punchy lines, blank lines between sections, ends with moral line",
  "caption": "Instagram caption with emojis",
  "hashtags": ["tag1", "tag2", "tag3"],
  "cta": "call to action",
  "hookImageText": "VERSION 1 story hook — ${scenario.name1}'s journey, specific numbers, NO emojis, blank lines, ends with moral line",
  "contentImageText": "VERSION 1 content — exact corpus breakdown, real returns, inflation impact, NO emojis, blank lines, ends with moral line",
  "comparisonHookText": "VERSION 2 comparison hook — ${scenario.name1} vs ${scenario.name2}, same ${formatRs(P)}/month, different choice, NO emojis, blank lines",
  "comparisonContentText": "VERSION 2 comparison content — ${formatRs(corpus1)} vs ${formatRs(corpus2)}, gap of ${formatRs(gap)}, WHY it happened, NO emojis, blank lines, ends with moral line"
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
