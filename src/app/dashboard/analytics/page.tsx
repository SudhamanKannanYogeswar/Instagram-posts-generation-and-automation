'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Instagram, Plus, BarChart3, TrendingUp, Eye, Heart, MessageCircle, Share2 } from 'lucide-react'

export default function AnalyticsPage() {
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
              <Link href="/dashboard/queue"><Button variant="ghost" size="sm">Queue</Button></Link>
              <Link href="/dashboard/analytics"><Button variant="ghost" size="sm" className="bg-gray-100">Analytics</Button></Link>
              <Link href="/dashboard/settings"><Button variant="ghost" size="sm">Settings</Button></Link>
            </nav>
          </div>
          <Link href="/dashboard/create">
            <Button size="sm"><Plus className="w-4 h-4 mr-1" /> New Reel</Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-6">Analytics</h2>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Reach', value: '0', icon: Eye, color: 'text-blue-500' },
            { label: 'Total Likes', value: '0', icon: Heart, color: 'text-red-500' },
            { label: 'Comments', value: '0', icon: MessageCircle, color: 'text-green-500' },
            { label: 'Shares', value: '0', icon: Share2, color: 'text-purple-500' },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">{label}</CardTitle>
                <Icon className={`w-5 h-5 ${color}`} />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        <Card>
          <CardContent className="py-20 text-center">
            <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No analytics yet</h3>
            <p className="text-gray-500 mb-6">
              Post your first reel to start tracking performance
            </p>
            <Link href="/dashboard/create">
              <Button><Plus className="w-4 h-4 mr-2" /> Create Your First Reel</Button>
            </Link>
          </CardContent>
        </Card>

        {/* Tips */}
        <div className="mt-6 grid md:grid-cols-3 gap-4">
          {[
            { title: 'Best Time to Post', tip: 'Post between 6-9 PM on weekdays for maximum reach' },
            { title: 'Engagement Rate', tip: 'Aim for 3-6% engagement rate. Finance content averages 4.2%' },
            { title: 'Consistency', tip: 'Post 3-5 times per week to grow your audience steadily' },
          ].map(({ title, tip }) => (
            <Card key={title} className="bg-blue-50 border-blue-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-blue-800 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> {title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-blue-700">{tip}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  )
}
