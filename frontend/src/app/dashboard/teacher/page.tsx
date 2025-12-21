'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Music, FileText, Users, UserPlus } from 'lucide-react'
import { AssignExamDialog } from '@/components/exam/AssignExamDialog'
import { formatDate } from '@/lib/utils'

export default function TeacherDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [exams, setExams] = useState<any[]>([])
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [selectedExam, setSelectedExam] = useState<any>(null)

  useEffect(() => {
    checkAuth()
    loadExams()
  }, [])

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
      return
    }

    try {
      const response = await api.getMe()
      const userProfile = response.data.profile
      
      // Check if user is teacher
      if (!['TEACHER', 'INSTITUTION_ADMIN', 'ADMIN'].includes(userProfile.role)) {
        router.push('/dashboard/student')
        return
      }
      
      setProfile(userProfile)
    } catch (error) {
      console.error('Error loading profile:', error)
    }
  }

  const loadExams = async () => {
    try {
      const response = await api.getTeacherExams()
      setExams(response.data || [])
    } catch (error) {
      console.error('Error loading exams:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Teacher Dashboard</h1>
            <p className="text-gray-600">Create and manage your music exams</p>
          </div>
          <Link href="/exam/create">
            <Button size="lg">
              <Plus className="h-5 w-5 mr-2" />
              Create Exam
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Exams</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{exams.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Published</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {exams.filter(e => e.isPublished).length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Draft</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {exams.filter(e => !e.isPublished).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Exams List */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">Your Exams</h2>
          
          {exams.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">No exams created yet</p>
                <Link href="/exam/create">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Exam
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {exams.map((exam: any) => (
                <Card key={exam.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{exam.title}</CardTitle>
                        <CardDescription>{exam.description}</CardDescription>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        exam.isPublished 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {exam.isPublished ? 'Published' : 'Draft'}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center">
                      <div className="text-sm text-gray-600">
                        Created {formatDate(exam.created_at)}
                        {exam.duration_minutes && ` • ${exam.duration_minutes} minutes`}
                        {exam.total_points > 0 && ` • ${exam.total_points} points`}
                      </div>
                      <div className="space-x-2">
                        <Link href={`/exam/edit/${exam.id}`}>
                          <Button variant="outline" size="sm">
                            Edit
                          </Button>
                        </Link>
                        {exam.isPublished && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedExam(exam)
                              setAssignDialogOpen(true)
                            }}
                          >
                            <UserPlus className="h-4 w-4 mr-1" />
                            Assign
                          </Button>
                        )}
                        <Link href={`/exam/results/${exam.id}`}>
                          <Button variant="outline" size="sm">
                            <Users className="h-4 w-4 mr-1" />
                            Results
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Assign Exam Dialog */}
      {selectedExam && (
        <AssignExamDialog
          examId={selectedExam.id}
          examTitle={selectedExam.title}
          open={assignDialogOpen}
          onClose={() => {
            setAssignDialogOpen(false)
            setSelectedExam(null)
          }}
          onAssigned={() => {
            // Optionally reload exams or show success message
          }}
        />
      )}
    </div>
  )
}

