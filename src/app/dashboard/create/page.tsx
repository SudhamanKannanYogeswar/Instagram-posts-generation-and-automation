'use client'

import { Suspense, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Instagram, ArrowLeft, Sparkles, Loader2, Upload,
  Link2, FileText, Image, X, CheckCircle, AlertCircle, ChevronDown
} from 'lucide-react'
import { CATEGORIES } from '@/lib/categories'

type InputMode = 'prompt' | 'image' | 'instagram'

function CreateReelForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const defaultMode = (searchParams.get('mode') as InputMode) || 'prompt'

  const [inputMode, setInputMode] = useState<InputMode>(defaultMode)
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0])
  const [showCategoryPicker, setShowCategoryPicker] = useState(false)
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
    if (!file.type.startsWith('image/')) { setError('Please upload an image file'); return }
    if (file.size > 10 * 1024 * 1024) { setError('Image must be under 10MB'); return }
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
      formData.append('categoryId', selectedCategory.id)
      if (imagePrompt) formData.append('prompt', imagePrompt)

      const response = await fetch('/api/analyze-image', { method: 'POST', body: formData })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      setImageAnalysis(data.analysis)
      // Pre-fill topic and tone from analysis
      if (data.analysis.suggestedTopic) setTopic(data.analysis.suggestedTopic)
      if (data.analysis.recommendedTone) setTone(data.analysis.recommendedTone)
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
        body: JSON.stringify({ url: instagramUrl, userPrompt: instagramPrompt, categoryId: selectedCategory.id }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      setInstagramAnalysis(data.analysis)
      setInstagramFetchedReal(data.fetchedRealData || false)
      setInstagramOriginalPost(data.originalPost || null)
      const topicSeed = data.analysis.hookIdea || data.analysis.suggestedTopic
      if (topicSeed) { setTopic(topicSeed); setTone(data.analysis.recommendedTone || 'educational') }
    } catch (err: any) {
      setError(err.message || 'Failed to analyze Instagram post')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleGenerate = async () => {
    if (!topic.trim()) { setError('Please enter a topic first'); return }
    setIsGenerating(true)
    setError('')
    try {
      let enrichedTopic = topic.trim()

      // If image was analysed, pass the full generated content directly
      if (inputMode === 'image' && imageAnalysis?.hookImageText) {
        // Image analysis already generated full content — use it directly
        const response = await fetch('/api/content/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic: imageAnalysis.suggestedTopic || topic,
            tone: imageAnalysis.recommendedTone || tone,
            categoryId: selectedCategory.id,
            generationMode: 'image_based',
            // Pass pre-generated content to skip LLM call
            preGeneratedContent: {
              hook: imageAnalysis.hook,
              script: imageAnalysis.script,
              caption: imageAnalysis.caption,
              hashtags: imageAnalysis.hashtags,
              cta: imageAnalysis.cta,
              hookImageText: imageAnalysis.hookImageText,
              contentImageText: imageAnalysis.contentImageText,
            },
          }),
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Failed to generate content')
        router.push(`/dashboard/preview/${data.data.reel.id}`)
        return
      }

      if (inputMode === 'instagram' && instagramAnalysis) {
        enrichedTopic = `${topic}. Content angle: ${instagramAnalysis.contentAngle || ''}. Hook: ${instagramAnalysis.hookIdea || ''}`
      }

      const response = await fetch('/api/content/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: enrichedTopic,
          tone,
          categoryId: selectedCategory.id,
          generationMode: inputMode === 'prompt' ? 'manual' : 'instagram_inspired',
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

  const canGenerate = topic.trim().length > 0 || (inputMode === 'image' && imageAnalysis)

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

        {/* ── CATEGORY SELECTOR ── */}
        <div className="mb-6">
          <label className="block text-sm font-semibold mb-2 text-gray-700">Select Category</label>
          <div className="relative">
            <button
              onClick={() => setShowCategoryPicker(!showCategoryPicker)}
              className="w-full flex items-center justify-between px-4 py-3 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-400 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{selectedCategory.emoji}</span>
                <div className="text-left">
                  <p className="font-semibold text-gray-900">{selectedCategory.label}</p>
                  <p className="text-xs text-gray-500">{selectedCategory.description}</p>
                </div>
              </div>
              <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showCategoryPicker ? 'rotate-180' : ''}`} />
            </button>

            {showCategoryPicker && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-xl shadow-xl z-50 max-h-80 overflow-y-auto">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => { setSelectedCategory(cat); setShowCategoryPicker(false); setTopic(''); setImageAnalysis(null) }}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left ${selectedCategory.id === cat.id ? 'bg-blue-50' : ''}`}
                  >
                    <span className="text-xl">{cat.emoji}</span>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{cat.label}</p>
                      <p className="text-xs text-gray-500">{cat.description}</p>
                    </div>
                    {selectedCategory.id === cat.id && <CheckCircle className="w-4 h-4 text-blue-600 ml-auto" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── INPUT MODE TABS ── */}
        <div className="flex gap-2 mb-6 bg-white p-1 rounded-xl border">
          {[
            { key: 'prompt', label: 'Write Topic', icon: FileText },
            { key: 'image', label: 'Upload Image', icon: Image },
            { key: 'instagram', label: 'Instagram Link', icon: Instagram },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => { setInputMode(key as InputMode); setError('') }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-2 rounded-lg transition-all text-sm font-medium ${
                inputMode === key ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-xl">{selectedCategory.emoji}</span>
              {inputMode === 'prompt' && `Create ${selectedCategory.label} Reel`}
              {inputMode === 'image' && 'Generate from Image'}
              {inputMode === 'instagram' && 'Generate from Instagram Post'}
            </CardTitle>
            <CardDescription>
              {inputMode === 'prompt' && `AI will create a story-driven ${selectedCategory.label} reel for Indian audience`}
              {inputMode === 'image' && 'Upload an image — AI analyses it and creates full hook + script inspired by it'}
              {inputMode === 'instagram' && 'Paste a post URL — AI creates original content inspired by the same style'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">

            {/* ── PROMPT MODE ── */}
            {inputMode === 'prompt' && (
              <div>
                <label className="block text-sm font-medium mb-2">Topic</label>
                <textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder={`e.g., ${selectedCategory.exampleTopics[0]}`}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={3}
                  disabled={isGenerating}
                />
                {/* Example topics */}
                <div className="mt-3 grid grid-cols-1 gap-2">
                  {selectedCategory.exampleTopics.map((ex) => (
                    <button
                      key={ex}
                      onClick={() => setTopic(ex)}
                      disabled={isGenerating}
                      className="text-left px-3 py-2 border rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors text-sm text-gray-700"
                    >
                      → {ex}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── IMAGE MODE ── */}
            {inputMode === 'image' && (
              <div className="space-y-4">
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
                      <img src={imagePreview} alt="Uploaded" className="w-full max-h-64 object-cover rounded-xl border" />
                      <button
                        onClick={() => { setUploadedImage(null); setImagePreview(''); setImageAnalysis(null); setTopic('') }}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </div>

                {imagePreview && (
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Additional context <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={imagePrompt}
                      onChange={(e) => setImagePrompt(e.target.value)}
                      placeholder="e.g., focus on savings, make it motivational..."
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                {imagePreview && !imageAnalysis && (
                  <Button onClick={handleAnalyzeImage} disabled={isAnalyzing} variant="outline" className="w-full">
                    {isAnalyzing
                      ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analysing with Mistral Vision AI...</>
                      : <><Sparkles className="w-4 h-4 mr-2" /> Analyse Image & Generate Content</>
                    }
                  </Button>
                )}

                {imageAnalysis && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2 text-green-700 font-semibold">
                      <CheckCircle className="w-4 h-4" />
                      Full content generated from image!
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-green-100 text-sm space-y-1.5">
                      <div><span className="text-gray-500">AI sees:</span> <span className="text-gray-800">{imageAnalysis.subject}</span></div>
                      <div><span className="text-gray-500">Content angle:</span> <span className="text-gray-800">{imageAnalysis.contentAngle}</span></div>
                      <div><span className="text-gray-500">Topic:</span> <span className="text-gray-800 font-medium">{imageAnalysis.suggestedTopic}</span></div>
                    </div>
                    {imageAnalysis.hook && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <p className="text-xs text-yellow-700 font-medium mb-1">Generated Hook</p>
                        <p className="text-sm text-gray-800 italic">"{imageAnalysis.hook}"</p>
                      </div>
                    )}
                    <p className="text-xs text-green-700">
                      Hook + Script + Images are ready. Click Generate to create the reel.
                    </p>
                    {/* Alternative ideas */}
                    {imageAnalysis.contentIdeas?.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 font-medium mb-1">Or try a different angle:</p>
                        {imageAnalysis.contentIdeas.slice(0, 3).map((idea: string, i: number) => (
                          <button
                            key={i}
                            onClick={() => setTopic(idea)}
                            className="block w-full text-left text-xs px-3 py-1.5 border rounded-lg hover:bg-blue-50 hover:border-blue-400 transition-colors mb-1 text-gray-700"
                          >
                            → {idea}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── INSTAGRAM MODE ── */}
            {inputMode === 'instagram' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Instagram Post URL</label>
                  <div className="relative">
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
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Your tweaks <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={instagramPrompt}
                    onChange={(e) => setInstagramPrompt(e.target.value)}
                    placeholder="e.g., make it more educational, focus on savings instead..."
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={2}
                  />
                </div>
                {instagramUrl && !instagramAnalysis && (
                  <Button onClick={handleAnalyzeInstagram} disabled={isAnalyzing || !instagramUrl} variant="outline" className="w-full">
                    {isAnalyzing
                      ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analysing Post...</>
                      : <><Instagram className="w-4 h-4 mr-2" /> Analyse & Generate Concept</>
                    }
                  </Button>
                )}
                {instagramAnalysis && (
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-2 text-purple-700 font-medium">
                      <CheckCircle className="w-4 h-4" />
                      {instagramFetchedReal ? 'Real post analysed!' : 'Content concept ready'}
                    </div>
                    {instagramOriginalPost && (
                      <div className="bg-white rounded-lg p-3 border border-purple-100 text-sm">
                        <p className="text-gray-700 font-medium">@{instagramOriginalPost.author}</p>
                        <p className="text-gray-600 text-xs mt-1 line-clamp-2 italic">"{instagramOriginalPost.caption}"</p>
                      </div>
                    )}
                    <div className="text-sm space-y-1">
                      <div><span className="text-gray-500">Angle:</span> <span className="text-gray-800">{instagramAnalysis.contentAngle}</span></div>
                      <div><span className="text-gray-500">Hook:</span> <span className="text-gray-800 font-medium">"{instagramAnalysis.hookIdea}"</span></div>
                    </div>
                  </div>
                )}
                {instagramAnalysis && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Topic <span className="text-gray-400 font-normal">(edit if needed)</span></label>
                    <textarea
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                      rows={2}
                    />
                  </div>
                )}
              </div>
            )}

            {/* ── TONE SELECTOR ── */}
            {(inputMode === 'prompt' || (inputMode !== 'image') || !imageAnalysis) && (
              <div>
                <label className="block text-sm font-medium mb-2">Tone</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { value: 'educational', label: 'Educational' },
                    { value: 'motivational', label: 'Motivational' },
                    { value: 'urgent', label: 'Urgent' },
                    { value: 'casual', label: 'Casual' },
                  ].map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setTone(value)}
                      disabled={isGenerating}
                      className={`py-2 rounded-lg border-2 transition-colors text-sm font-medium ${
                        tone === value ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {label}
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
            <Button onClick={handleGenerate} disabled={isGenerating || !canGenerate} className="w-full" size="lg">
              {isGenerating
                ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Generating... (~20 seconds)</>
                : <><Sparkles className="w-5 h-5 mr-2" /> Generate Reel</>
              }
            </Button>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              <strong>What you get:</strong> Story-style hook + script + 3 image cards (hook, content, combined) ready to post
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

export default function CreateReelPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    }>
      <CreateReelForm />
    </Suspense>
  )
}
