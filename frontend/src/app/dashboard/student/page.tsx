'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, FileText, CheckCircle, Music, RefreshCw } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export default function StudentDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [assignments, setAssignments] = useState<any[]>([])

  useEffect(() => {
    checkAuth()
    loadAssignments()
  }, [])

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
      return
    }

    try {
      const response = await api.getMe()
      setProfile(response.data.profile)
    } catch (error) {
      console.error('Error loading profile:', error)
    }
  }

  const loadAssignments = async (showLoading = true) => {
    if (showLoading) {
      setLoading(true)
    }
    try {
      const response = await api.getStudentExams()
      console.log('Student assignments response:', response)
      setAssignments(response.data || [])
    } catch (error: any) {
      console.error('Error loading assignments:', error)
      console.error('Error details:', error.response?.data)
    } finally {
      if (showLoading) {
        setLoading(false)
      }
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const startExam = async (examId: string) => {
    router.push(`/exam/take/${examId}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Music className="h-12 w-12 animate-pulse text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Music className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">Music Exam Builder</span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-gray-700">
              {profile?.first_name} {profile?.last_name}
            </span>
            <Button variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Student Dashboard</h1>
            <p className="text-gray-600">View and take your assigned exams</p>
          </div>
          <Button
            variant="outline"
            onClick={() => loadAssignments()}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Assigned Exams */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">Assigned Exams</h2>
          
          {assignments.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No exams assigned yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {assignments.map((assignment: any) => {
                const hasAttempt = assignment.attempts && assignment.attempts.length > 0
                const latestAttempt = hasAttempt ? assignment.attempts[0] : null
                const isCompleted = latestAttempt?.status === 'GRADED' || latestAttempt?.status === 'SUBMITTED'

                return (
                  <Card key={assignment.id}>
                    <CardHeader>
                      <CardTitle className="text-lg">{assignment.exam.title}</CardTitle>
                      <CardDescription>
                        {assignment.exam.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2 text-sm text-gray-600">
                        {assignment.exam.duration_minutes && (
                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4" />
                            <span>{assignment.exam.duration_minutes} minutes</span>
                          </div>
                        )}
                        {assignment.due_date && (
                          <div className="flex items-center space-x-2">
                            <FileText className="h-4 w-4" />
                            <span>Due: {formatDate(assignment.due_date)}</span>
                          </div>
                        )}
                        {isCompleted && latestAttempt && (
                          <div className="flex items-center space-x-2 text-green-600">
                            <CheckCircle className="h-4 w-4" />
                            <span>
                              {latestAttempt.status === 'GRADED'
                                ? `Score: ${latestAttempt.score}/${latestAttempt.total_points}`
                                : 'Submitted - Awaiting grading'}
                            </span>
                          </div>
                        )}
                      </div>

                      <Button 
                        className="w-full"
                        onClick={() => startExam(assignment.exam.id)}
                        disabled={isCompleted}
                      >
                        {isCompleted ? 'Completed' : hasAttempt ? 'Continue' : 'Start Exam'}
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

