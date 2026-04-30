'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Instagram, Plus, Settings, CheckCircle, ExternalLink } from 'lucide-react'

export default function SettingsPage() {
  const [saved, setSaved] = useState(false)
  const [settings, setSettings] = useState({
    autoGenerate: false,
    frequency: 'daily',
    requireApproval: true,
    autoPost: false,
    contentTone: 'educational',
    preferredTopics: 'savings, investments, personal finance',
  })

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

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
              <Link href="/dashboard/analytics"><Button variant="ghost" size="sm">Analytics</Button></Link>
              <Link href="/dashboard/settings"><Button variant="ghost" size="sm" className="bg-gray-100">Settings</Button></Link>
            </nav>
          </div>
          <Link href="/dashboard/create">
            <Button size="sm"><Plus className="w-4 h-4 mr-1" /> New Reel</Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Settings className="w-6 h-6" /> Settings
        </h2>

        <div className="space-y-6">
          {/* Instagram Connection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Instagram className="w-5 h-5" /> Instagram Connection
              </CardTitle>
              <CardDescription>Connect your Instagram Business account to enable auto-posting</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
                <p className="text-sm text-yellow-800">
                  ⚠️ Instagram not connected. Add your access token to the <code className="bg-yellow-100 px-1 rounded">.env</code> file to enable auto-posting.
                </p>
              </div>
              <a
                href="https://developers.facebook.com/tools/explorer/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" className="flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" />
                  Get Instagram Access Token
                </Button>
              </a>
            </CardContent>
          </Card>

          {/* Content Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Content Settings</CardTitle>
              <CardDescription>Configure how AI generates your content</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Default Content Tone</label>
                <select
                  value={settings.contentTone}
                  onChange={e => setSettings({ ...settings, contentTone: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="educational">Educational</option>
                  <option value="motivational">Motivational</option>
                  <option value="urgent">Urgent</option>
                  <option value="casual">Casual</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Preferred Topics</label>
                <textarea
                  value={settings.preferredTopics}
                  onChange={e => setSettings({ ...settings, preferredTopics: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={3}
                  placeholder="savings, investments, personal finance, crypto..."
                />
                <p className="text-xs text-gray-500 mt-1">Comma-separated list of topics for auto-generation</p>
              </div>
            </CardContent>
          </Card>

          {/* Automation Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Automation Settings</CardTitle>
              <CardDescription>Control how content is generated and posted</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                {
                  key: 'requireApproval',
                  label: 'Require Approval Before Posting',
                  description: 'Review all content before it goes live (recommended)',
                },
                {
                  key: 'autoGenerate',
                  label: 'Auto-Generate Content',
                  description: 'Automatically generate content on a schedule',
                },
                {
                  key: 'autoPost',
                  label: 'Auto-Post to Instagram',
                  description: 'Automatically post approved content (requires Instagram connection)',
                },
              ].map(({ key, label, description }) => (
                <div key={key} className="flex items-start justify-between gap-4 p-3 border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{label}</p>
                    <p className="text-xs text-gray-500">{description}</p>
                  </div>
                  <button
                    onClick={() => setSettings({ ...settings, [key]: !settings[key as keyof typeof settings] })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
                      settings[key as keyof typeof settings] ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings[key as keyof typeof settings] ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              ))}

              {settings.autoGenerate && (
                <div>
                  <label className="block text-sm font-medium mb-2">Generation Frequency</label>
                  <select
                    value={settings.frequency}
                    onChange={e => setSettings({ ...settings, frequency: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="hourly">Every Hour</option>
                    <option value="daily">Once Daily</option>
                    <option value="weekly">Once Weekly</option>
                  </select>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Save Button */}
          <Button onClick={handleSave} className="w-full" size="lg">
            {saved ? (
              <><CheckCircle className="w-5 h-5 mr-2" /> Saved!</>
            ) : (
              'Save Settings'
            )}
          </Button>
        </div>
      </main>
    </div>
  )
}
