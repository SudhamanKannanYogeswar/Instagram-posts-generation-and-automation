'use client'

import { Suspense, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Instagram, ArrowLeft, Sparkles, Loader2, Upload,
  Link2, FileText, Image, X, CheckCircle, AlertCircle
} from 'lucide-react'

type InputMode = 'prompt' | 'image' | 'instagram'

function CreateReelForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const defaultMode = (searchParams.get('mode') as InputMode) || 'prompt'

  const [inputMode, setInputMode] = useState<InputMode>(defaultMode)
  const [topic, setTopic] = useState('')
  const [tone, setTone] = useState('educational')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState('')

  // Image upload state
  const [uploadedImage, setUploadedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [imageAnalysis, setImageAnalysis] = useState<any>(null)
  const [imagePrompt, setImagePrompt] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Instagram link state
  const [instagramUrl, setInstagramUrl] = useState('')
  const [instagramAnalysis, setInstagramAnalysis] = useState<any>(null)
  const [instagramOriginalPost, setInstagramOriginalPost] = useState<any>(null)
  const [instagramFetchedReal, setInstagramFetchedReal] = useState(false)
  const [instagramPrompt, setInstagramPrompt] = useState('')

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be under 10MB')
      return
    }

    setUploadedImage(file)
    setImageAnalysis(null)
    setError('')

    const reader = new FileReader()
    reader.onload = (e) => setImagePreview(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleAnalyzeImage = async () => {
    if (!uploadedImage) return
    setIsAnalyzing(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('image', uploadedImage)
      if (imagePrompt) formData.append('prompt', imagePrompt)

      const response = await fetch('/api/analyze-image', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      setImageAnalysis(data.analysis)
      // Pre-fill topic with suggested topic
      if (data.analysis.suggestedTopic) {
        setTopic(data.analysis.suggestedTopic)
        setTone(data.analysis.recommendedTone || 'educational')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to analyze image')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleAnalyzeInstagram = async () => {
    if (!instagramUrl) return
    setIsAnalyzing(true)
    setError('')

    try {
      const response = await fetch('/api/fetch-instagram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: instagramUrl, userPrompt: instagramPrompt }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      setInstagramAnalysis(data.analysis)
      setInstagramFetchedReal(data.fetchedRealData || false)
      setInstagramOriginalPost(data.originalPost || null)

      // Use hookIdea as the topic seed if available, otherwise suggestedTopic
      const topicSeed = data.analysis.hookIdea || data.analysis.suggestedTopic
      if (topicSeed) {
        setTopic(topicSeed)
        setTone(data.analysis.recommendedTone || 'educational')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to analyze Instagram post')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError('Please enter a topic or analyze an image/post first')
      return
    }

    setIsGenerating(true)
    setError('')

    try {
      // Build enriched topic based on mode
      let enrichedTopic = topic.trim()

      if (inputMode === 'image' && imageAnalysis) {
        enrichedTopic = `${topic}. Visual context: ${imageAnalysis.style}. Key elements: ${imageAnalysis.visualElements?.join(', ')}`
      } else if (inputMode === 'instagram' && instagramAnalysis) {
        enrichedTopic = `${topic}. Content angle: ${instagramAnalysis.contentAngle}. Key points: ${instagramAnalysis.keyPoints?.join(', ')}`
      }

      const response = await fetch('/api/content/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: enrichedTopic,
          tone,
          generationMode: inputMode === 'prompt' ? 'manual' : inputMode === 'image' ? 'image_based' : 'instagram_inspired',
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to generate content')

      router.push(`/dashboard/preview/${data.data.reel.id}`)
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setIsGenerating(false)
    }
  }

  const canGenerate = topic.trim().length > 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-5 h-5" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg instagram-gradient flex items-center justify-center">
                <Instagram className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold">Create New Reel</span>
            </div>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">

        {/* Mode Selector */}
        <div className="flex gap-2 mb-6 bg-white p-1 rounded-xl border">
          {[
            { key: 'prompt', label: 'Write Prompt', icon: FileText, desc: 'Enter a topic' },
            { key: 'image', label: 'Upload Image', icon: Image, desc: 'Use your image' },
            { key: 'instagram', label: 'Instagram Link', icon: Instagram, desc: 'Inspired by post' },
          ].map(({ key, label, icon: Icon, desc }) => (
            <button
              key={key}
              onClick={() => { setInputMode(key as InputMode); setError('') }}
              className={`flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-lg transition-all ${
                inputMode === key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm font-medium">{label}</span>
              <span className={`text-xs ${inputMode === key ? 'text-blue-100' : 'text-gray-400'}`}>{desc}</span>
            </button>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-blue-600" />
              {inputMode === 'prompt' && 'Generate from Topic'}
              {inputMode === 'image' && 'Generate from Image'}
              {inputMode === 'instagram' && 'Generate from Instagram Post'}
            </CardTitle>
            <CardDescription>
              {inputMode === 'prompt' && 'Enter a finance topic and AI will create a viral Reel'}
              {inputMode === 'image' && 'Upload an image and AI will analyze it to create matching content'}
              {inputMode === 'instagram' && 'Paste an Instagram post link and AI will create a similar but unique Reel'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">

            {/* ── PROMPT MODE ── */}
            {inputMode === 'prompt' && (
              <div>
                <label className="block text-sm font-medium mb-2">Finance Topic</label>
                <textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., How to save $10,000 in a year, Best investment strategies for beginners..."
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={4}
                  disabled={isGenerating}
                />
              </div>
            )}

            {/* ── IMAGE MODE ── */}
            {inputMode === 'image' && (
              <div className="space-y-4">
                {/* Upload area */}
                <div>
                  <label className="block text-sm font-medium mb-2">Upload Image</label>
                  {!imagePreview ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
                    >
                      <Upload className="w-10 h-10 mx-auto mb-3 text-gray-400" />
                      <p className="text-gray-600 font-medium">Click to upload image</p>
                      <p className="text-gray-400 text-sm mt-1">JPG, PNG, WEBP up to 10MB</p>
                    </div>
                  ) : (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Uploaded"
                        className="w-full max-h-64 object-cover rounded-xl border"
                      />
                      <button
                        onClick={() => { setUploadedImage(null); setImagePreview(''); setImageAnalysis(null); setTopic('') }}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>

                {/* Optional prompt for image */}
                {imagePreview && (
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Additional context <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={imagePrompt}
                      onChange={(e) => setImagePrompt(e.target.value)}
                      placeholder="e.g., focus on savings tips, make it motivational..."
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                {/* Analyze button */}
                {imagePreview && !imageAnalysis && (
                  <Button
                    onClick={handleAnalyzeImage}
                    disabled={isAnalyzing}
                    variant="outline"
                    className="w-full"
                  >
                    {isAnalyzing ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing Image...</>
                    ) : (
                      <><Sparkles className="w-4 h-4 mr-2" /> Analyze Image with AI</>
                    )}
                  </Button>
                )}

                {/* Analysis result */}
                {imageAnalysis && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-2 text-green-700 font-medium">
                      <CheckCircle className="w-4 h-4" />
                      Image Analyzed!
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">Subject:</span>
                        <span className="ml-1 text-gray-800">{imageAnalysis.subject}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Tone:</span>
                        <span className="ml-1 text-gray-800 capitalize">{imageAnalysis.recommendedTone}</span>
                      </div>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-500">Content ideas:</span>
                      <ul className="mt-1 space-y-1">
                        {imageAnalysis.contentIdeas?.slice(0, 3).map((idea: string, i: number) => (
                          <li key={i} className="flex items-center gap-2">
                            <button
                              onClick={() => setTopic(idea)}
                              className="text-blue-600 hover:underline text-left"
                            >
                              → {idea}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Topic input after analysis */}
                {imageAnalysis && (
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Topic <span className="text-gray-400 font-normal">(auto-filled from analysis, edit if needed)</span>
                    </label>
                    <textarea
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                      rows={3}
                    />
                  </div>
                )}
              </div>
            )}

            {/* ── INSTAGRAM MODE ── */}
            {inputMode === 'instagram' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Instagram Post URL</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="url"
                        value={instagramUrl}
                        onChange={(e) => setInstagramUrl(e.target.value)}
                        placeholder="https://www.instagram.com/p/..."
                        className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Paste any Instagram post, reel, or video URL
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Your tweaks / requirements <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={instagramPrompt}
                    onChange={(e) => setInstagramPrompt(e.target.value)}
                    placeholder="e.g., make it more educational, focus on crypto instead of stocks, add more statistics..."
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={3}
                  />
                </div>

                {instagramUrl && !instagramAnalysis && (
                  <Button
                    onClick={handleAnalyzeInstagram}
                    disabled={isAnalyzing || !instagramUrl}
                    variant="outline"
                    className="w-full"
                  >
                    {isAnalyzing ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing Post...</>
                    ) : (
                      <><Instagram className="w-4 h-4 mr-2" /> Analyze & Generate Concept</>
                    )}
                  </Button>
                )}

                {instagramAnalysis && (
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2 text-purple-700 font-medium">
                      <CheckCircle className="w-4 h-4" />
                      {instagramFetchedReal ? '✅ Real post data fetched & analysed!' : 'Content Concept Ready'}
                    </div>

                    {/* Show real post data if fetched */}
                    {instagramOriginalPost && (
                      <div className="bg-white rounded-lg p-3 border border-purple-100 text-sm">
                        <p className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wide">Original Post</p>
                        <p className="text-gray-700 font-medium">@{instagramOriginalPost.author}</p>
                        <p className="text-gray-600 text-xs mt-1 line-clamp-3 italic">
                          "{instagramOriginalPost.caption}"
                        </p>
                      </div>
                    )}

                    <div className="text-sm space-y-1.5">
                      {instagramAnalysis.originalStyle && instagramFetchedReal && (
                        <div>
                          <span className="text-gray-500">Original style:</span>
                          <span className="ml-1 text-gray-800">{instagramAnalysis.originalStyle}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-500">Finance angle:</span>
                        <span className="ml-1 text-gray-800">{instagramAnalysis.contentAngle}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Hook idea:</span>
                        <span className="ml-1 text-gray-800 font-medium">"{instagramAnalysis.hookIdea}"</span>
                      </div>
                      <div>
                        <span className="text-gray-500">What makes it unique:</span>
                        <span className="ml-1 text-gray-800">{instagramAnalysis.differentiators}</span>
                      </div>
                    </div>
                  </div>
                )}

                {instagramAnalysis && (
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Topic <span className="text-gray-400 font-normal">(auto-filled, edit if needed)</span>
                    </label>
                    <textarea
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                      rows={3}
                    />
                  </div>
                )}
              </div>
            )}

            {/* ── TONE SELECTOR (all modes) ── */}
            {(inputMode === 'prompt' || topic) && (
              <div>
                <label className="block text-sm font-medium mb-2">Content Tone</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { value: 'educational', emoji: '📚', label: 'Educational' },
                    { value: 'motivational', emoji: '🔥', label: 'Motivational' },
                    { value: 'urgent', emoji: '⚡', label: 'Urgent' },
                    { value: 'casual', emoji: '😊', label: 'Casual' },
                  ].map(({ value, emoji, label }) => (
                    <button
                      key={value}
                      onClick={() => setTone(value)}
                      disabled={isGenerating}
                      className={`px-3 py-2 rounded-lg border-2 transition-colors text-sm ${
                        tone === value
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {emoji} {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !canGenerate}
              className="w-full"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generating Content... (~20 seconds)
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate Reel
                </>
              )}
            </Button>

            {/* Info box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>What happens next:</strong>
                <br />1. AI generates viral hook and script
                <br />2. NVIDIA FLUX creates eye-catching images
                <br />3. You review and approve before posting
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Example topics (prompt mode only) */}
        {inputMode === 'prompt' && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4">💡 Need inspiration?</h3>
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
                  className="text-left px-4 py-3 border rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-sm"
                >
                  → {example}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Image mode tips */}
        {inputMode === 'image' && (
          <div className="mt-8 bg-white border rounded-xl p-5">
            <h3 className="font-semibold mb-3">📸 Image Tips</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>✅ Charts, graphs, or financial visuals work great</li>
              <li>✅ Lifestyle images (coffee, laptop, money) generate good content</li>
              <li>✅ Screenshots of financial data or news</li>
              <li>✅ Your own photos related to finance topics</li>
              <li>⚠️ AI will analyze the image and suggest relevant finance content</li>
            </ul>
          </div>
        )}

        {/* Instagram mode tips */}
        {inputMode === 'instagram' && (
          <div className="mt-8 bg-white border rounded-xl p-5">
            <h3 className="font-semibold mb-3">📱 Instagram Link Tips</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>✅ Paste any public Instagram post URL</li>
              <li>✅ Works with posts, reels, and videos</li>
              <li>✅ Add your tweaks to make it unique</li>
              <li>✅ AI creates inspired but original content</li>
              <li>⚠️ Content will be finance-focused regardless of original post</li>
            </ul>
          </div>
        )}
      </main>
    </div>
  )
}

export default function CreateReelPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <CreateReelForm />
    </Suspense>
  )
}
