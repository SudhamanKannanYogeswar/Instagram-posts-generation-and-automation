'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Plus,
  Calendar,
  CheckCircle,
  Clock,
  TrendingUp,
  Instagram,
  BarChart3,
  Settings,
  Sparkles,
  Video,
  Eye
} from 'lucide-react'

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalReels: 0,
    pendingApproval: 0,
    scheduled: 0,
    posted: 0,
    totalReach: 0,
    totalEngagement: 0,
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg instagram-gradient flex items-center justify-center">
                  <Instagram className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-xl font-bold">Reels Automation</h1>
              </Link>
              <nav className="hidden md:flex items-center gap-4">
                <Link href="/dashboard">
                  <Button variant="ghost">Dashboard</Button>
                </Link>
                <Link href="/dashboard/queue">
                  <Button variant="ghost">Queue</Button>
                </Link>
                <Link href="/dashboard/analytics">
                  <Button variant="ghost">Analytics</Button>
                </Link>
                <Link href="/dashboard/settings">
                  <Button variant="ghost">
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </Button>
                </Link>
              </nav>
            </div>
            <Link href="/dashboard/create">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create New Reel
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Welcome back! 👋</h2>
          <p className="text-gray-600">Here's what's happening with your content</p>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Reels</CardTitle>
              <Video className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalReels}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
              <Clock className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingApproval}</div>
              <p className="text-xs text-muted-foreground">Awaiting review</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
              <Calendar className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.scheduled}</div>
              <p className="text-xs text-muted-foreground">Ready to post</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Posted</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.posted}</div>
              <p className="text-xs text-muted-foreground">Live on Instagram</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="border-2 border-dashed hover:border-blue-500 transition-colors cursor-pointer">
            <Link href="/dashboard/create?mode=manual">
              <CardHeader>
                <Sparkles className="w-10 h-10 text-blue-600 mb-2" />
                <CardTitle>Create from Topic</CardTitle>
                <CardDescription>
                  Enter a topic and let AI generate viral content
                </CardDescription>
              </CardHeader>
            </Link>
          </Card>

          <Card className="border-2 border-dashed hover:border-purple-500 transition-colors cursor-pointer">
            <Link href="/dashboard/create?mode=news">
              <CardHeader>
                <TrendingUp className="w-10 h-10 text-purple-600 mb-2" />
                <CardTitle>Generate from News</CardTitle>
                <CardDescription>
                  Create content based on trending finance news
                </CardDescription>
              </CardHeader>
            </Link>
          </Card>

          <Card className="border-2 border-dashed hover:border-green-500 transition-colors cursor-pointer">
            <Link href="/dashboard/create?mode=auto">
              <CardHeader>
                <Calendar className="w-10 h-10 text-green-600 mb-2" />
                <CardTitle>Auto-Generate</CardTitle>
                <CardDescription>
                  Set schedule and let AI create content automatically
                </CardDescription>
              </CardHeader>
            </Link>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Reels</CardTitle>
              <CardDescription>Your latest created content</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <Video className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No reels yet</p>
                <Link href="/dashboard/create">
                  <Button className="mt-4" size="sm">
                    Create Your First Reel
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Performance Overview</CardTitle>
              <CardDescription>Last 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-blue-500" />
                    <span className="text-sm">Total Reach</span>
                  </div>
                  <span className="font-semibold">{stats.totalReach.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-purple-500" />
                    <span className="text-sm">Engagement</span>
                  </div>
                  <span className="font-semibold">{stats.totalEngagement.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    <span className="text-sm">Avg. Engagement Rate</span>
                  </div>
                  <span className="font-semibold">0%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
