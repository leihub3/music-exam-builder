'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Save, Music } from 'lucide-react'
import Link from 'next/link'

export default function CreateExamPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    durationMinutes: '',
    passingScore: '',
    institutionId: '', // This should be fetched from user's institution
  })

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      // Get user profile
      const response = await api.getMe()
      const userProfile = response.data.profile

      // Check if user is teacher or higher
      if (!['TEACHER', 'INSTITUTION_ADMIN', 'ADMIN'].includes(userProfile.role)) {
        router.push('/dashboard')
        return
      }

      setProfile(userProfile)
    } catch (err: any) {
      console.error('Error checking auth:', err)
      setError('Failed to load user profile. Please try logging in again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      // For now, we'll use a placeholder institution ID
      // In production, this should be fetched from the user's profile
      const examData = {
        title: formData.title,
        description: formData.description,
        durationMinutes: formData.durationMinutes ? parseInt(formData.durationMinutes) : null,
        passingScore: formData.passingScore ? parseFloat(formData.passingScore) : null,
        institutionId: formData.institutionId || null,
      }

      const response = await api.createExam(examData)
      
      if (response.success) {
        // Redirect to edit page to add sections and questions
        router.push(`/exam/edit/${response.data.id}`)
      }
    } catch (err: any) {
      console.error('Error creating exam:', err)
      setError(err.response?.data?.error || 'Failed to create exam')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Music className="h-12 w-12 animate-pulse text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (error && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600 mb-4">{error}</p>
            <div className="space-x-2">
              <Link href="/dashboard">
                <Button variant="outline">Back to Dashboard</Button>
              </Link>
              <Link href="/login">
                <Button>Login Again</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

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
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New Exam</h1>
          <p className="text-gray-600">Fill in the basic information for your exam</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Exam Details</CardTitle>
            <CardDescription>
              You'll be able to add sections and questions after creating the exam
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="title">Exam Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Music Theory Final Exam"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  disabled={submitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Provide details about the exam..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  disabled={submitting}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    placeholder="e.g., 60"
                    value={formData.durationMinutes}
                    onChange={(e) => setFormData({ ...formData, durationMinutes: e.target.value })}
                    disabled={submitting}
                    min="1"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="passingScore">Passing Score (%)</Label>
                  <Input
                    id="passingScore"
                    type="number"
                    placeholder="e.g., 70"
                    value={formData.passingScore}
                    onChange={(e) => setFormData({ ...formData, passingScore: e.target.value })}
                    disabled={submitting}
                    min="0"
                    max="100"
                    step="0.1"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-4 pt-4">
                <Link href="/dashboard/teacher">
                  <Button type="button" variant="outline" disabled={submitting}>
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    'Creating...'
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Create Exam
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

