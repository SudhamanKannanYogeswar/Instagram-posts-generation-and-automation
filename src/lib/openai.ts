import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8,
      max_tokens: 2000,
    })

    const content = JSON.parse(completion.choices[0].message.content || '{}')
    return content as GeneratedContent
  } catch (error) {
    console.error('Error generating content:', error)
    throw new Error('Failed to generate content')
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
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: prompt,
      n: 1,
      size: '1024x1792', // Closest to 9:16 ratio
      quality: 'hd',
      style: 'vivid',
    })

    return response.data[0].url || ''
  } catch (error) {
    console.error('Error generating image:', error)
    throw new Error('Failed to generate image')
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
