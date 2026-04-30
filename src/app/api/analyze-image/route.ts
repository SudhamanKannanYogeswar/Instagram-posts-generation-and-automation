import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// NVIDIA supports vision models - we'll use Llama 3.2 Vision for image analysis
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
})

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const imageFile = formData.get('image') as File | null
    const imageUrl = formData.get('imageUrl') as string | null
    const userPrompt = formData.get('prompt') as string | null

    let imageContent: any

    if (imageFile) {
      // Convert uploaded file to base64
      const bytes = await imageFile.arrayBuffer()
      const base64 = Buffer.from(bytes).toString('base64')
      const mimeType = imageFile.type || 'image/jpeg'
      imageContent = {
        type: 'image_url',
        image_url: { url: `data:${mimeType};base64,${base64}` },
      }
    } else if (imageUrl) {
      imageContent = {
        type: 'image_url',
        image_url: { url: imageUrl },
      }
    } else {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    // Use NVIDIA's vision model (Llama 3.2 Vision or similar)
    const visionModel = process.env.VISION_MODEL || 'meta/llama-3.2-90b-vision-instruct'

    const completion = await openai.chat.completions.create({
      model: visionModel,
      messages: [
        {
          role: 'user',
          content: [
            imageContent,
            {
              type: 'text',
              text: `Analyze this image for Instagram Reel content creation. 
              
${userPrompt ? `User's additional context: ${userPrompt}` : ''}

Please provide:
1. Main subject/theme of the image
2. Visual style (colors, mood, aesthetic)
3. Suggested finance/savings/investment topic this image could represent
4. Recommended content angle (educational, motivational, urgent, casual)
5. Key visual elements to reference in the script

Return as JSON:
{
  "subject": "main subject",
  "style": "visual style description",
  "suggestedTopic": "finance topic this image suits",
  "recommendedTone": "educational|motivational|urgent|casual",
  "visualElements": ["element1", "element2"],
  "contentIdeas": ["idea1", "idea2", "idea3"]
}`,
            },
          ],
        },
      ],
      max_tokens: 800,
      temperature: 0.2,
    })

    const responseText = completion.choices[0].message.content || '{}'

    // Parse the response
    let analysis: any
    try {
      const jsonMatch = responseText.match(/```json\n?([\s\S]*?)\n?```/) ||
        responseText.match(/\{[\s\S]*\}/)
      const jsonText = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : responseText
      analysis = JSON.parse(jsonText)
    } catch {
      // Fallback if JSON parsing fails
      analysis = {
        subject: 'Finance content',
        style: 'Professional',
        suggestedTopic: userPrompt || 'Personal finance tips',
        recommendedTone: 'educational',
        visualElements: ['image elements'],
        contentIdeas: [
          'How to save money',
          'Investment strategies',
          'Financial freedom tips',
        ],
      }
    }

    return NextResponse.json({ success: true, analysis })
  } catch (error: any) {
    console.error('Image analysis error:', error)

    // If vision model not available, return a helpful fallback
    if (error.status === 404 || error.message?.includes('model')) {
      return NextResponse.json({
        success: true,
        analysis: {
          subject: 'Finance content',
          style: 'Professional',
          suggestedTopic: 'Personal finance and savings tips',
          recommendedTone: 'educational',
          visualElements: ['uploaded image'],
          contentIdeas: [
            'How to save money effectively',
            'Investment strategies for beginners',
            'Building wealth step by step',
          ],
          note: 'Vision analysis unavailable - using default suggestions',
        },
      })
    }

    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
