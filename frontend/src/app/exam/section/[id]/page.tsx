'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, Plus } from 'lucide-react'
import Link from 'next/link'
import { QuestionEditor } from '@/components/questions/QuestionEditor'
import { QuestionCard } from '@/components/questions/QuestionCard'
import type { ExamSection, Question } from '@music-exam-builder/shared/types'

export default function SectionQuestionsPage() {
  const router = useRouter()
  const params = useParams()
  const sectionId = params.id as string

  const [loading, setLoading] = useState(true)
  const [section, setSection] = useState<ExamSection | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [showAddQuestion, setShowAddQuestion] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadSection()
  }, [sectionId])

  const loadSection = async () => {
    try {
      const response = await api.getSection(sectionId)
      setSection(response.data)
      setQuestions(response.data.questions || [])
    } catch (err: any) {
      console.error('Error loading section:', err)
      setError('Failed to load section')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading section...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Exam
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Section Questions
          </h1>
          <p className="text-gray-600">Manage questions for this section</p>
        </div>

        {/* Add Question Button */}
        <div className="mb-6">
          <Button onClick={() => setShowAddQuestion(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Question
          </Button>
        </div>

        {/* Add Question Form */}
        {showAddQuestion && section && (
          <div className="mb-6">
            <QuestionEditor
              sectionId={sectionId}
              sectionType={(section.section_type || section.sectionType) as any}
              onSaved={() => {
                setShowAddQuestion(false)
                loadSection()
              }}
              onCancel={() => setShowAddQuestion(false)}
            />
          </div>
        )}

        {/* Questions List */}
        {questions.length === 0 && !showAddQuestion ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-600 mb-4">No questions yet. Add your first question.</p>
              <Button onClick={() => setShowAddQuestion(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Question
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {questions.map((question, index) => (
              <QuestionCard
                key={question.id}
                question={question}
                index={index}
                sectionId={sectionId}
                sectionType={(section?.section_type || section?.sectionType) as any}
                onUpdated={loadSection}
                onDeleted={loadSection}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

