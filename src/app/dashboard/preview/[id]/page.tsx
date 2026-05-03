'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Instagram, ArrowLeft, CheckCircle, XCircle, Calendar,
  Copy, Loader2, Sparkles, Hash, MessageSquare, Zap,
  FileText, Video, Download, Play
} from 'lucide-react'

interface ContentData {
  reel: { id: string; status: string; created_at: string; video_url?: string }
  content: {
    id: string; hook: string; script: string; caption: string
    hashtags: string[]; cta: string; topic: string; tone: string
  }
  images: Array<{ id: string; image_url: string; image_type: string; prompt?: string }>
}

export default function PreviewPage() {
  const params = useParams()
  const router = useRouter()
  const reelId = params.id as string

  const [data, setData] = useState<ContentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [approving, setApproving] = useState(false)
  const [scheduledTime, setScheduledTime] = useState('')
  const [copied, setCopied] = useState('')
  const [activeTab, setActiveTab] = useState<'hook' | 'script' | 'caption' | 'hashtags'>('hook')
  const [generatingVideo, setGeneratingVideo] = useState(false)
  const [videoUrl, setVideoUrl] = useState('')
  const [videoError, setVideoError] = useState('')

  useEffect(() => {
    fetchContent()
    const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000)
    setScheduledTime(oneHourFromNow.toISOString().slice(0, 16))
  }, [reelId])

  const fetchContent = async () => {
    try {
      const response = await fetch(`/api/content/${reelId}`)
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to fetch content')
      setData(result.data)
      if (result.data?.reel?.video_url) setVideoUrl(result.data.reel.video_url)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateVideo = async () => {
    setGeneratingVideo(true)
    setVideoError('')
    try {
      const response = await fetch(`/api/content/${reelId}/generate-video`, { method: 'POST' })
      const result = await response.json()

      if (result.error === 'video_unavailable') {
        setVideoError(result.message)
        return
      }

      if (!response.ok) throw new Error(result.error || 'Video generation failed')
      setVideoUrl(result.data.videoUrl)
    } catch (err: any) {
      setVideoError(err.message)
    } finally {
      setGeneratingVideo(false)
    }
  }

  const handleApprove = async () => {
    setApproving(true)
    try {
      const response = await fetch(`/api/content/${reelId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledTime }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to approve')
      router.push('/dashboard/queue')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setApproving(false)
    }
  }

  const handleReject = async () => {
    try {
      await fetch(`/api/content/${reelId}/reject`, { method: 'POST' })
      router.push('/dashboard')
    } catch {}
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(''), 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-lg font-medium text-gray-700">Loading your content...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <p className="text-lg font-medium text-gray-700 mb-4">{error || 'Content not found'}</p>
          <Link href="/dashboard"><Button>Back to Dashboard</Button></Link>
        </div>
      </div>
    )
  }

  const { content, images } = data

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Dashboard</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg instagram-gradient flex items-center justify-center">
              <Instagram className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold">Review Content</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Topic Badge */}
        <div className="mb-6 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            {content.topic}
          </div>
          <div className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm capitalize">
            {content.tone}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">

          {/* ── Left: Content ── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Tab Nav */}
            <div className="flex gap-1 bg-white p-1 rounded-xl border">
              {[
                { key: 'hook', label: 'Hook', icon: Zap },
                { key: 'script', label: 'Script', icon: FileText },
                { key: 'caption', label: 'Caption', icon: MessageSquare },
                { key: 'hashtags', label: 'Hashtags', icon: Hash },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key as any)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === key ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>

            {/* Hook Tab */}
            {activeTab === 'hook' && (
              <Card className="border-2 border-blue-200">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-base">
                    <div className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-yellow-500" />
                      Viral Hook (First 3 seconds)
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => copyToClipboard(content.hook, 'hook')}>
                      {copied === 'hook' ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-100">
                    <p className="text-xl font-bold text-gray-800 leading-relaxed">"{content.hook}"</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-3">💡 Designed to stop the scroll in the first 3 seconds</p>
                </CardContent>
              </Card>
            )}

            {/* Script Tab */}
            {activeTab === 'script' && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-base">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-500" />
                      Full Script
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => copyToClipboard(content.script, 'script')}>
                      {copied === 'script' ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-50 rounded-lg p-4 border">
                    <p className="text-gray-800 leading-relaxed whitespace-pre-wrap text-sm">{content.script}</p>
                  </div>
                  <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm font-medium text-green-800">CTA: {content.cta}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Caption Tab */}
            {activeTab === 'caption' && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-base">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-purple-500" />
                      Instagram Caption
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => copyToClipboard(content.caption + '\n\n' + content.hashtags.join(' '), 'caption')}>
                      {copied === 'caption' ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-50 rounded-lg p-4 border">
                    <p className="text-gray-800 leading-relaxed whitespace-pre-wrap text-sm">{content.caption}</p>
                    <p className="text-blue-600 text-sm mt-3">{content.hashtags.join(' ')}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Hashtags Tab */}
            {activeTab === 'hashtags' && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-base">
                    <div className="flex items-center gap-2">
                      <Hash className="w-5 h-5 text-green-500" />
                      Hashtags ({content.hashtags.length})
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => copyToClipboard(content.hashtags.join(' '), 'hashtags')}>
                      {copied === 'hashtags' ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {content.hashtags.map((tag, i) => (
                      <span key={i} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                        {tag.startsWith('#') ? tag : `#${tag}`}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Generated Visuals */}
            {images && images.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    🖼️ Generated Images
                    <span className="text-xs font-normal text-gray-500">(5 cards — story + comparison)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">

                  {/* ── VERSION 1: Story / Facts ── */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">Version 1 — Story / Facts</span>
                    </div>
                    {/* Combined card */}
                    {images.find((img: any) => img.image_type === 'combined') && (
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-xs font-medium text-gray-500">Combined (Hook + Content)</p>
                          <a href={images.find((img: any) => img.image_type === 'combined')?.image_url} download="story-combined.jpg" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                            <Download className="w-3 h-3" /> Download
                          </a>
                        </div>
                        <div className="aspect-[9/16] rounded-xl overflow-hidden border-2 border-blue-300 max-w-[200px] mx-auto">
                          <img src={images.find((img: any) => img.image_type === 'combined')?.image_url} alt="Combined" className="w-full h-full object-cover" />
                        </div>
                      </div>
                    )}
                    {/* Hook + Content side by side */}
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { type: 'story_hook',    label: 'Hook Card',    file: 'story-hook.jpg'    },
                        { type: 'story_content', label: 'Content Card', file: 'story-content.jpg' },
                      ].map(({ type, label, file }) => {
                        const img = images.find((i: any) => i.image_type === type)
                        if (!img) return null
                        return (
                          <div key={type}>
                            <div className="flex items-center justify-between mb-1.5">
                              <p className="text-xs font-medium text-gray-500">{label}</p>
                              <a href={img.image_url} download={file} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                                <Download className="w-3 h-3" /> Save
                              </a>
                            </div>
                            <div className="aspect-[9/16] rounded-lg overflow-hidden border border-gray-200">
                              <img src={img.image_url} alt={label} className="w-full h-full object-cover" />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* ── VERSION 2: Comparison ── */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">Version 2 — Comparison (Person A vs B)</span>
                    </div>
                    {/* Comparison combined card */}
                    {images.find((img: any) => img.image_type === 'comp_combined') && (
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-xs font-medium text-gray-500">Combined (Hook + Content)</p>
                          <a href={images.find((img: any) => img.image_type === 'comp_combined')?.image_url} download="comparison-combined.jpg" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                            <Download className="w-3 h-3" /> Download
                          </a>
                        </div>
                        <div className="aspect-[9/16] rounded-xl overflow-hidden border-2 border-purple-300 max-w-[200px] mx-auto">
                          <img src={images.find((img: any) => img.image_type === 'comp_combined')?.image_url} alt="Comparison Combined" className="w-full h-full object-cover" />
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { type: 'comp_hook',    label: 'Hook Card',    file: 'comparison-hook.jpg'    },
                        { type: 'comp_content', label: 'Content Card', file: 'comparison-content.jpg' },
                      ].map(({ type, label, file }) => {
                        const img = images.find((i: any) => i.image_type === type)
                        if (!img) return null
                        return (
                          <div key={type}>
                            <div className="flex items-center justify-between mb-1.5">
                              <p className="text-xs font-medium text-gray-500">{label}</p>
                              <a href={img.image_url} download={file} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                                <Download className="w-3 h-3" /> Save
                              </a>
                            </div>
                            <div className="aspect-[9/16] rounded-lg overflow-hidden border border-purple-200">
                              <img src={img.image_url} alt={label} className="w-full h-full object-cover" />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                </CardContent>
              </Card>
            )}

            {/* Video Generation */}
            <Card className="border-2 border-purple-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Video className="w-5 h-5 text-purple-600" />
                  Reel Video
                </CardTitle>
              </CardHeader>
              <CardContent>
                {videoUrl ? (
                  <div className="space-y-3">
                    <div
                      className="aspect-[9/16] rounded-lg overflow-hidden bg-black mx-auto"
                      style={{ maxWidth: 200 }}
                    >
                      <video
                        src={videoUrl}
                        controls
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="flex gap-2">
                      <a href={videoUrl} download="reel.mp4" className="flex-1">
                        <Button variant="outline" className="w-full" size="sm">
                          <Download className="w-4 h-4 mr-2" /> Download
                        </Button>
                      </a>
                      <Button variant="ghost" size="sm" onClick={handleGenerateVideo} disabled={generatingVideo}>
                        <Sparkles className="w-4 h-4 mr-1" /> Regenerate
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    {videoError && (
                      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-left">
                        <p className="text-sm text-red-700 font-medium mb-1">Video generation failed</p>
                        <p className="text-xs text-red-600">{videoError}</p>
                      </div>
                    )}
                    <p className="text-sm text-gray-500 mb-4">
                      Assemble a complete Reel video — all server-side, nothing to install.
                    </p>
                    <Button
                      onClick={handleGenerateVideo}
                      disabled={generatingVideo}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      {generatingVideo ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating Video... (~30s)</>
                      ) : (
                        <><Play className="w-4 h-4 mr-2" /> Generate Reel Video</>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

          </div>{/* end left col */}

          {/* ── Right: Actions ── */}
          <div className="space-y-4">

            {/* Approve / Reject */}
            <Card className="border-2 border-green-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Ready to Post?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Schedule Post Time
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {error}
                  </div>
                )}

                <Button
                  onClick={handleApprove}
                  disabled={approving}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {approving
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Approving...</>
                    : <><CheckCircle className="w-4 h-4 mr-2" /> Approve & Schedule</>
                  }
                </Button>

                <Button
                  onClick={handleReject}
                  variant="outline"
                  className="w-full border-red-200 text-red-600 hover:bg-red-50"
                >
                  <XCircle className="w-4 h-4 mr-2" /> Reject & Discard
                </Button>

                <Link href="/dashboard/create">
                  <Button variant="ghost" className="w-full">
                    <Sparkles className="w-4 h-4 mr-2" /> Generate New Version
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Content Stats */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Content Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Hook length</span>
                  <span className="font-medium">{content.hook.split(' ').length} words</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Script length</span>
                  <span className="font-medium">{content.script.split(' ').length} words</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Hashtags</span>
                  <span className="font-medium">{content.hashtags.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Est. read time</span>
                  <span className="font-medium">~{Math.ceil(content.script.split(' ').length / 130)} min</span>
                </div>
              </CardContent>
            </Card>

            {/* Pro Tips */}
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="pt-4">
                <p className="text-sm text-amber-800 font-medium mb-2">💡 Pro Tips</p>
                <ul className="text-xs text-amber-700 space-y-1">
                  <li>• Post between 6–9 PM for best reach</li>
                  <li>• Respond to comments in first hour</li>
                  <li>• Use all hashtags for max visibility</li>
                  <li>• Pin the best comment</li>
                </ul>
              </CardContent>
            </Card>

          </div>{/* end right col */}

        </div>{/* end grid */}
      </main>
    </div>
  )
}
