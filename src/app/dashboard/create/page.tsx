'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Instagram, ArrowLeft, Sparkles, Loader2 } from 'lucide-react'

export default function CreateReelPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const mode = searchParams.get('mode') || 'manual'

  const [topic, setTopic] = useState('')
  const [tone, setTone] = useState('educational')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError('Please enter a topic')
      return
    }

    setIsGenerating(true)
    setError('')

    try {
      const response = await fetch('/api/content/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic: topic.trim(),
          tone,
          generationMode: mode,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate content')
      }

      // Redirect to preview page
      router.push(`/dashboard/preview/${data.data.reel.id}`)
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-2">
              <ArrowLeft className="w-5 h-5" />
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg instagram-gradient flex items-center justify-center">
                  <Instagram className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-xl font-bold">Create New Reel</h1>
              </div>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-blue-600" />
              Generate Finance Content
            </CardTitle>
            <CardDescription>
              Enter a topic and AI will create a viral Reel with hook, script, and visuals
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Topic Input */}
            <div>
              <label className="block text-sm font-medium mb-2">
                What topic do you want to create content about?
              </label>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., How to save $10,000 in a year, Best investment strategies for beginners, Passive income ideas..."
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={4}
                disabled={isGenerating}
              />
            </div>

            {/* Tone Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">Content Tone</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {['educational', 'motivational', 'urgent', 'casual'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTone(t)}
                    disabled={isGenerating}
                    className={`px-4 py-2 rounded-lg border-2 transition-colors capitalize ${
                      tone === t
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {error}
              </div>
            )}

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !topic.trim()}
              className="w-full"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generating Content...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate Reel
                </>
              )}
            </Button>

            {/* Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>What happens next:</strong>
                <br />
                1. AI generates viral hook and script
                <br />
                2. Creates eye-catching images
                <br />
                3. Assembles video with text overlays
                <br />
                4. You review and approve before posting
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Examples */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4">Need inspiration? Try these topics:</h3>
          <div className="grid md:grid-cols-2 gap-3">
            {[
              '5 ways to save money on groceries',
              'How compound interest makes you rich',
              'Best side hustles for 2024',
              'Investing mistakes to avoid',
              'How to build an emergency fund',
              'Passive income ideas that actually work',
            ].map((example) => (
              <button
                key={example}
                onClick={() => setTopic(example)}
                disabled={isGenerating}
                className="text-left px-4 py-3 border rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
