'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, CheckCircle, XCircle, Clock } from 'lucide-react'
import { formatDate, calculatePercentage } from '@/lib/utils'
import type { ExamAttempt } from '@music-exam-builder/shared/types'

export default function StudentResultsPage() {
  const router = useRouter()
  const params = useParams()
  const attemptId = params.id as string

  const [loading, setLoading] = useState(true)
  const [attempt, setAttempt] = useState<ExamAttempt | null>(null)

  useEffect(() => {
    loadResults()
  }, [attemptId])

  const loadResults = async () => {
    try {
      const response = await api.getAttempt(attemptId)
      setAttempt(response.data)
    } catch (err: any) {
      console.error('Error loading results:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading results...</p>
      </div>
    )
  }

  if (!attempt) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Results not found</p>
          <Link href="/dashboard/student">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    )
  }

  const exam = attempt.exam
  const totalPoints = (attempt as any).totalPoints || (attempt as any).total_points || 0
  const score = (attempt as any).score || 0
  const percentage = totalPoints 
    ? calculatePercentage(score, totalPoints)
    : 0
  const passed = exam?.passingScore ? percentage >= exam.passingScore : percentage >= 70

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <Link href="/dashboard/student">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Results Summary */}
        <Card className="mb-8">
          <CardHeader>
            <div className="text-center">
              {attempt.status === 'GRADED' ? (
                <>
                  <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full mb-4 ${
                    passed ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    {passed ? (
                      <CheckCircle className="h-12 w-12 text-green-600" />
                    ) : (
                      <XCircle className="h-12 w-12 text-red-600" />
                    )}
                  </div>
                  <CardTitle className="text-3xl mb-2">
                    {passed ? 'Congratulations!' : 'Keep Practicing!'}
                  </CardTitle>
                  <p className="text-gray-600 mb-4">{exam?.title}</p>
                  <div className="text-5xl font-bold mb-2">
                    {percentage}%
                  </div>
                  <p className="text-xl text-gray-600">
                    {score} / {totalPoints} points
                  </p>
                </>
              ) : (
                <>
                  <div className="inline-flex items-center justify-center w-24 h-24 rounded-full mb-4 bg-yellow-100">
                    <Clock className="h-12 w-12 text-yellow-600" />
                  </div>
                  <CardTitle className="text-3xl mb-2">
                    Exam Submitted
                  </CardTitle>
                  <p className="text-gray-600">
                    Your exam has been submitted and is awaiting grading
                  </p>
                </>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-gray-600">Submitted</p>
                <p className="font-semibold">{formatDate(
                  (attempt as any).submittedAt || 
                  (attempt as any).submitted_at || 
                  (attempt as any).startedAt || 
                  (attempt as any).started_at
                )}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Time Spent</p>
                <p className="font-semibold">
                  {(attempt as any).timeSpentSeconds || (attempt as any).time_spent_seconds
                    ? `${Math.floor(((attempt as any).timeSpentSeconds || (attempt as any).time_spent_seconds) / 60)} minutes`
                    : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <p className="font-semibold">
                  <span className={`px-3 py-1 rounded-full ${
                    attempt.status === 'GRADED' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {attempt.status === 'GRADED' ? 'Graded' : 'Pending'}
                  </span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Results */}
        {attempt.status === 'GRADED' && attempt.answers && (
          <Card>
            <CardHeader>
              <CardTitle>Question-by-Question Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {attempt.answers.map((answer, index) => (
                <div key={answer.id} className="border-b last:border-0 pb-4 last:pb-0">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <p className="font-medium">Question {index + 1}</p>
                      <p className="text-gray-700 text-sm mt-1">
                        {answer.question?.questionText}
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      {(() => {
                        const pointsEarned = (answer as any).pointsEarned || (answer as any).points_earned || 0
                        const maxPoints = (answer as any).maxPoints || (answer as any).max_points || 0
                        return (
                          <p className={`font-semibold ${
                            pointsEarned === maxPoints 
                              ? 'text-green-600' 
                              : pointsEarned > 0 
                              ? 'text-yellow-600' 
                              : 'text-red-600'
                          }`}>
                            {pointsEarned} / {maxPoints}
                          </p>
                        )
                      })()}
                    </div>
                  </div>

                  {answer.feedback && (
                    <div className="bg-blue-50 border border-blue-200 rounded p-3 mt-2">
                      <p className="text-sm font-semibold text-blue-900 mb-1">Teacher's Feedback:</p>
                      <p className="text-sm text-blue-800">{answer.feedback}</p>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}

