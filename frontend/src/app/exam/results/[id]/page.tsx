'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Users, TrendingUp, Award } from 'lucide-react'
import { formatDate, calculatePercentage } from '@/lib/utils'
import type { ExamAttempt } from '@music-exam-builder/shared/types'

export default function ExamResultsPage() {
  const router = useRouter()
  const params = useParams()
  const examId = params.id as string

  const [loading, setLoading] = useState(true)
  const [attempts, setAttempts] = useState<ExamAttempt[]>([])
  const [exam, setExam] = useState<any>(null)

  useEffect(() => {
    loadResults()
  }, [examId])

  const loadResults = async () => {
    try {
      const [examResponse, attemptsResponse] = await Promise.all([
        api.getExam(examId),
        api.getExamAttempts(examId)
      ])
      
      setExam(examResponse.data)
      setAttempts(attemptsResponse.data)
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

  const completedAttempts = attempts.filter(a => a.status !== 'IN_PROGRESS')
  const gradedAttempts = attempts.filter(a => a.status === 'GRADED')
  const averageScore = gradedAttempts.length > 0
    ? gradedAttempts.reduce((sum, a) => sum + (a.score || 0), 0) / gradedAttempts.length
    : 0
  const passRate = gradedAttempts.length > 0
    ? (gradedAttempts.filter(a => {
        const percentage = calculatePercentage(a.score || 0, a.totalPoints || 100)
        return percentage >= (exam?.passingScore || 70)
      }).length / gradedAttempts.length) * 100
    : 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <Link href="/dashboard/teacher">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{exam?.title}</h1>
          <p className="text-gray-600">Exam Results & Student Submissions</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedAttempts.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Graded</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{gradedAttempts.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Score</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {averageScore.toFixed(1)}/{exam?.totalPoints || 100}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{passRate.toFixed(0)}%</div>
            </CardContent>
          </Card>
        </div>

        {/* Student Attempts List */}
        <Card>
          <CardHeader>
            <CardTitle>Student Submissions</CardTitle>
            <CardDescription>Click on a submission to view details and grade</CardDescription>
          </CardHeader>
          <CardContent>
            {completedAttempts.length === 0 ? (
              <p className="text-center text-gray-600 py-8">No submissions yet</p>
            ) : (
              <div className="space-y-3">
                {completedAttempts.map((attempt) => {
                  // Handle both camelCase and snake_case from backend
                  const score = attempt.score || (attempt as any).score || 0
                  const totalPoints = attempt.totalPoints || (attempt as any).total_points || 0
                  const status = attempt.status || (attempt as any).status || 'SUBMITTED'
                  const percentage = totalPoints 
                    ? calculatePercentage(score, totalPoints)
                    : 0
                  const passed = percentage >= (exam?.passingScore || 70)

                  return (
                    <div
                      key={attempt.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:border-blue-400 transition-colors cursor-pointer"
                      onClick={() => router.push(`/exam/grade/${attempt.id}`)}
                    >
                      <div className="flex-1">
                        <p className="font-medium">
                          {(attempt as any).student?.first_name} {(attempt as any).student?.last_name}
                        </p>
                        <p className="text-sm text-gray-600">
                          Submitted {formatDate((attempt as any).submittedAt || (attempt as any).submitted_at || attempt.startedAt || (attempt as any).started_at)}
                        </p>
                      </div>

                      <div className="flex items-center space-x-4">
                        {status === 'GRADED' ? (
                          <>
                            <div className="text-right">
                              <p className="text-lg font-bold">
                                {score}/{totalPoints}
                              </p>
                              <p className={`text-sm ${passed ? 'text-green-600' : 'text-red-600'}`}>
                                {percentage}% {passed ? '✓ Passed' : '✗ Failed'}
                              </p>
                            </div>
                            <Button size="sm" variant="outline">
                              View
                            </Button>
                          </>
                        ) : (
                          <>
                            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                              Needs Grading
                            </span>
                            <Button size="sm">
                              Grade Now
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

