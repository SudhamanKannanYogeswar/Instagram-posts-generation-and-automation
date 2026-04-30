'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Instagram, Plus, Clock, CheckCircle, XCircle,
  Calendar, Eye, Loader2, Sparkles, RefreshCw
} from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

interface QueueItem {
  reel: {
    id: string
    status: string
    created_at: string
  }
  content: {
    hook: string
    topic: string
    tone: string
    caption: string
    hashtags: string[]
  }
  scheduled_post?: {
    id: string
    scheduled_time: string
    status: string
  }
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  pending_approval: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-blue-100 text-blue-700',
  scheduled: 'bg-purple-100 text-purple-700',
  posted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  failed: 'bg-red-100 text-red-700',
}

export default function QueuePage() {
  const [items, setItems] = useState<QueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetchQueue()
  }, [])

  const fetchQueue = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/queue')
      const data = await response.json()
      if (data.success) setItems(data.data || [])
    } catch (err) {
      console.error('Failed to fetch queue:', err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = filter === 'all'
    ? items
    : items.filter(item => item.reel.status === filter)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg instagram-gradient flex items-center justify-center">
                <Instagram className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold">Reels Automation</span>
            </Link>
            <nav className="hidden md:flex gap-2">
              <Link href="/dashboard"><Button variant="ghost" size="sm">Dashboard</Button></Link>
              <Link href="/dashboard/queue"><Button variant="ghost" size="sm" className="bg-gray-100">Queue</Button></Link>
              <Link href="/dashboard/analytics"><Button variant="ghost" size="sm">Analytics</Button></Link>
              <Link href="/dashboard/settings"><Button variant="ghost" size="sm">Settings</Button></Link>
            </nav>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchQueue}>
              <RefreshCw className="w-4 h-4 mr-1" /> Refresh
            </Button>
            <Link href="/dashboard/create">
              <Button size="sm"><Plus className="w-4 h-4 mr-1" /> New Reel</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Content Queue</h2>
          <div className="flex gap-2">
            {['all', 'draft', 'approved', 'scheduled', 'posted'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-full text-sm font-medium capitalize transition-colors ${
                  filter === f ? 'bg-blue-600 text-white' : 'bg-white border hover:bg-gray-50'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Sparkles className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No content yet</h3>
            <p className="text-gray-500 mb-6">Create your first reel to get started</p>
            <Link href="/dashboard/create">
              <Button><Plus className="w-4 h-4 mr-2" /> Create New Reel</Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {filtered.map((item, i) => (
              <Card key={i} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[item.reel.status] || 'bg-gray-100 text-gray-700'}`}>
                          {item.reel.status.replace('_', ' ')}
                        </span>
                        <span className="text-xs text-gray-500 capitalize">{item.content.tone}</span>
                        <span className="text-xs text-gray-400">{formatDateTime(item.reel.created_at)}</span>
                      </div>

                      <p className="font-semibold text-gray-900 mb-1 truncate">
                        {item.content.topic}
                      </p>
                      <p className="text-sm text-gray-600 line-clamp-2 italic">
                        "{item.content.hook}"
                      </p>

                      {item.scheduled_post && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-purple-600">
                          <Calendar className="w-3 h-3" />
                          Scheduled: {formatDateTime(item.scheduled_post.scheduled_time)}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 shrink-0">
                      <Link href={`/dashboard/preview/${item.reel.id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-1" /> View
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
