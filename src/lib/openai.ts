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
}

export async function generateFinanceContent(
  params: ContentGenerationParams
): Promise<GeneratedContent> {
  const { topic, tone = 'educational', targetAudience = 'young professionals', includeStats = true } = params

  const systemPrompt = `You are an expert finance content creator specializing in viral Instagram Reels. 
Your content is engaging, accurate, and designed to hook viewers in the first 3 seconds.
Focus on: savings, investments, personal finance, wealth building.
Tone: ${tone}
Target audience: ${targetAudience}`

  const userPrompt = `Create a viral Instagram Reel script about: ${topic}

Requirements:
1. HOOK (first 3 seconds): Must be attention-grabbing, controversial, or surprising
2. SCRIPT (30-60 seconds): Clear, concise, actionable advice
3. CAPTION: Engaging caption with emojis
4. HASHTAGS: 10-15 relevant hashtags
5. CTA: Strong call-to-action
${includeStats ? '6. Include relevant statistics or numbers when possible' : ''}

Format your response as JSON:
{
  "hook": "The opening hook (1 sentence)",
  "script": "Full script with clear sections",
  "caption": "Instagram caption with emojis",
  "hashtags": ["hashtag1", "hashtag2", ...],
  "cta": "Call to action",
  "imagePrompts": ["prompt for background image", "prompt for overlay graphics"]
}`

  try {
    const model = process.env.OPENAI_MODEL || 'gpt-4-turbo-preview'
    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      // Note: NVIDIA API may not support response_format, so we'll handle JSON parsing manually
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
    imagePrompts: Array.isArray(parsed.imagePrompts)
      ? parsed.imagePrompts.map(String)
      : [
          'Modern minimalist finance background with money symbols and growth charts',
          'Professional financial illustration with coins and upward trending graph',
        ],
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
    imagePrompts: extractArray('imagePrompts').length > 0
      ? extractArray('imagePrompts')
      : [
          'Modern minimalist finance background with money symbols',
          'Professional financial growth chart illustration',
        ],
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
    // Check if we have DALL-E available (OpenAI)
    if (process.env.OPENAI_BASE_URL?.includes('openai.com')) {
      const response = await openai.images.generate({
        model: 'dall-e-3',
        prompt: prompt,
        n: 1,
        size: '1024x1792', // Closest to 9:16 ratio
        quality: 'hd',
        style: 'vivid',
      })
      return response.data?.[0]?.url || ''
    } else {
      // For NVIDIA or other APIs without image generation, use placeholder service
      // You can replace this with any image generation API you have
      console.warn('Image generation not available with current API, using placeholder')
      
      // Using a placeholder image service (you can replace with your own)
      const encodedPrompt = encodeURIComponent(prompt.substring(0, 50))
      return `https://placehold.co/1080x1920/1e40af/white?text=${encodedPrompt}`
    }
  } catch (error) {
    console.error('Error generating image:', error)
    // Fallback to placeholder
    return 'https://placehold.co/1080x1920/1e40af/white?text=Finance+Content'
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
