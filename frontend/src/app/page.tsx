import Link from 'next/link'
import { Music, BookOpen, Users, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="container mx-auto px-4 py-6 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Music className="h-8 w-8 text-blue-600" />
          <span className="text-2xl font-bold text-gray-900">Music Exam Builder</span>
        </div>
        <div className="space-x-4">
          <Link href="/login">
            <Button variant="ghost">Login</Button>
          </Link>
          <Link href="/register">
            <Button>Get Started</Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
          Create Music Exams
          <br />
          <span className="text-blue-600">With Ease</span>
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Comprehensive platform for music teachers to create, assign, and grade exams
          with support for listening, transposition, and orchestration questions.
        </p>
        <div className="space-x-4">
          <Link href="/register">
            <Button size="lg" className="text-lg">
              Start Creating Exams
            </Button>
          </Link>
          <Link href="/about">
            <Button size="lg" variant="outline" className="text-lg">
              Learn More
            </Button>
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">Features</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <FeatureCard
            icon={<CheckCircle className="h-10 w-10 text-blue-600" />}
            title="Multiple Question Types"
            description="True/False, Multiple Choice, Listening, Transposition, and Orchestration questions"
          />
          <FeatureCard
            icon={<Music className="h-10 w-10 text-blue-600" />}
            title="Audio Integration"
            description="Upload and play audio files for listening comprehension questions"
          />
          <FeatureCard
            icon={<BookOpen className="h-10 w-10 text-blue-600" />}
            title="Music Notation"
            description="Display and upload music scores for transposition and orchestration tasks"
          />
          <FeatureCard
            icon={<Users className="h-10 w-10 text-blue-600" />}
            title="Role Management"
            description="Separate dashboards for admins, teachers, and students"
          />
        </div>
      </section>

      {/* Question Types Section */}
      <section className="container mx-auto px-4 py-20 bg-gray-50 rounded-3xl">
        <h2 className="text-3xl font-bold text-center mb-12">Supported Question Types</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <QuestionTypeCard
            title="True/False"
            description="Simple true or false questions for quick assessments"
          />
          <QuestionTypeCard
            title="Multiple Choice"
            description="Multiple option questions with single correct answer"
          />
          <QuestionTypeCard
            title="Listening"
            description="Audio-based questions for ear training and music recognition"
          />
          <QuestionTypeCard
            title="Transposition"
            description="Give students a part and have them transpose for different instruments"
          />
          <QuestionTypeCard
            title="Orchestration"
            description="Piano scores that students orchestrate for various ensembles"
          />
          <QuestionTypeCard
            title="Auto-Grading"
            description="Objective questions are automatically graded upon submission"
          />
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-4xl font-bold mb-6">Ready to Get Started?</h2>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Join music educators around the world using Music Exam Builder
        </p>
        <Link href="/register">
          <Button size="lg" className="text-lg">
            Create Your Free Account
          </Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 border-t border-gray-200">
        <div className="text-center text-gray-600">
          <p>&copy; 2024 Music Exam Builder. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { 
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  )
}

function QuestionTypeCard({ title, description }: { 
  title: string
  description: string
}) {
  return (
    <div className="bg-white p-6 rounded-lg border-2 border-gray-200 hover:border-blue-400 transition-colors">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-gray-600 text-sm">{description}</p>
    </div>
  )
}

