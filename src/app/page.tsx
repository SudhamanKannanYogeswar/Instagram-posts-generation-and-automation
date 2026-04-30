import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Sparkles, 
  Calendar, 
  CheckCircle, 
  TrendingUp, 
  Zap,
  Instagram,
  BarChart3,
  Clock
} from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg instagram-gradient flex items-center justify-center">
              <Instagram className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold">Reels Automation</h1>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button>Go to Dashboard</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 text-blue-700 text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            AI-Powered Content Generation
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Create Viral Finance Reels
            <br />
            On Autopilot
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Generate engaging finance content with AI, create stunning Reels automatically, 
            and grow your Instagram presence while you focus on what matters.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/dashboard">
              <Button size="lg" className="text-lg px-8">
                Get Started Free
                <Sparkles className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link href="/dashboard/create">
              <Button size="lg" variant="outline" className="text-lg px-8">
                Create Your First Reel
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Everything You Need to Succeed</h2>
          <p className="text-gray-600 text-lg">Powerful features to automate your content creation</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          <Card className="border-2 hover:border-blue-500 transition-colors">
            <CardHeader>
              <Sparkles className="w-10 h-10 text-blue-600 mb-2" />
              <CardTitle>AI Content Generation</CardTitle>
              <CardDescription>
                Generate viral hooks, scripts, and captions using advanced AI trained on finance content
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-purple-500 transition-colors">
            <CardHeader>
              <Zap className="w-10 h-10 text-purple-600 mb-2" />
              <CardTitle>Automatic Video Creation</CardTitle>
              <CardDescription>
                AI generates images and assembles professional Reels with text overlays and transitions
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-green-500 transition-colors">
            <CardHeader>
              <Calendar className="w-10 h-10 text-green-600 mb-2" />
              <CardTitle>Smart Scheduling</CardTitle>
              <CardDescription>
                Schedule posts at optimal times or let AI auto-generate content based on trends
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-orange-500 transition-colors">
            <CardHeader>
              <CheckCircle className="w-10 h-10 text-orange-600 mb-2" />
              <CardTitle>Approval Workflow</CardTitle>
              <CardDescription>
                Review and approve all content before posting. Full control over what goes live
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-pink-500 transition-colors">
            <CardHeader>
              <TrendingUp className="w-10 h-10 text-pink-600 mb-2" />
              <CardTitle>Trending Topics</CardTitle>
              <CardDescription>
                Auto-generate content based on trending finance news and viral topics
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-indigo-500 transition-colors">
            <CardHeader>
              <BarChart3 className="w-10 h-10 text-indigo-600 mb-2" />
              <CardTitle>Analytics Dashboard</CardTitle>
              <CardDescription>
                Track engagement, reach, and performance metrics for all your posts
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-4 py-20 bg-white/50 rounded-3xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">How It Works</h2>
          <p className="text-gray-600 text-lg">From idea to Instagram in 3 simple steps</p>
        </div>

        <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-blue-600">1</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Generate Content</h3>
            <p className="text-gray-600">
              Enter a topic or let AI find trending finance news. AI creates viral hooks and scripts.
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-purple-600">2</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Review & Approve</h3>
            <p className="text-gray-600">
              Preview the generated Reel, make edits if needed, and approve for posting.
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-green-600">3</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Auto-Post & Grow</h3>
            <p className="text-gray-600">
              Content posts automatically at the best time. Track analytics and watch your growth.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-3xl mx-auto bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-12 text-white">
          <Clock className="w-16 h-16 mx-auto mb-6" />
          <h2 className="text-4xl font-bold mb-4">Ready to Save 10+ Hours Per Week?</h2>
          <p className="text-xl mb-8 opacity-90">
            Join creators who are growing their Instagram on autopilot with AI-powered content
          </p>
          <Link href="/dashboard">
            <Button size="lg" variant="secondary" className="text-lg px-8">
              Start Creating Now
              <Sparkles className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white/80 backdrop-blur-sm mt-20">
        <div className="container mx-auto px-4 py-8 text-center text-gray-600">
          <p>© 2024 Instagram Reels Automation. Built with AI for creators.</p>
        </div>
      </footer>
    </div>
  )
}
