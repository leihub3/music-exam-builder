'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Plus, Save, Eye, Trash2, UserPlus } from 'lucide-react'
import { AssignExamDialog } from '@/components/exam/AssignExamDialog'
import Link from 'next/link'
import { SectionEditor } from '@/components/exam/SectionEditor'
import type { Exam, ExamSection } from '@music-exam-builder/shared/types'

export default function EditExamPage() {
  const router = useRouter()
  const params = useParams()
  const examId = params.id as string

  const [loading, setLoading] = useState(true)
  const [exam, setExam] = useState<Exam | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showAddSection, setShowAddSection] = useState(false)
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)

  useEffect(() => {
    loadExam()
  }, [examId])

  const loadExam = async () => {
    try {
      const response = await api.getExam(examId)
      setExam(response.data)
    } catch (err: any) {
      console.error('Error loading exam:', err)
      setError('Failed to load exam')
    } finally {
      setLoading(false)
    }
  }

  const handlePublish = async () => {
    if (!exam) return

    try {
      await api.publishExam(examId, !exam.is_published)
      await loadExam()
    } catch (err: any) {
      console.error('Error publishing exam:', err)
      alert('Failed to publish exam')
    }
  }

  const handleDeleteExam = async () => {
    if (!confirm('Are you sure you want to delete this exam? This action cannot be undone.')) {
      return
    }

    try {
      await api.deleteExam(examId)
      router.push('/dashboard/teacher')
    } catch (err: any) {
      console.error('Error deleting exam:', err)
      alert('Failed to delete exam')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading exam...</p>
      </div>
    )
  }

  if (error || !exam) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Exam not found'}</p>
          <Link href="/dashboard/teacher">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link href="/dashboard/teacher">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            
            <div className="flex items-center space-x-2">
              <Button variant="outline" onClick={() => router.push(`/exam/preview/${examId}`)}>
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
              {exam.is_published && (
                <Button
                  variant="outline"
                  onClick={() => setAssignDialogOpen(true)}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Assign to Students
                </Button>
              )}
              <Button
                variant={exam.is_published ? 'outline' : 'default'}
                onClick={handlePublish}
              >
                {exam.is_published ? 'Unpublish' : 'Publish'}
              </Button>
              <Button variant="destructive" onClick={handleDeleteExam}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Exam Info */}
        <div className="mb-8">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{exam.title}</h1>
              {exam.description && (
                <p className="text-gray-600 mt-2">{exam.description}</p>
              )}
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              exam.is_published 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              {exam.is_published ? 'Published' : 'Draft'}
            </span>
          </div>
          <div className="text-sm text-gray-600">
            {exam.duration_minutes && <span>{exam.duration_minutes} minutes • </span>}
            {exam.total_points > 0 && <span>{exam.total_points} points</span>}
            {exam.passing_score && <span> • Passing: {exam.passing_score}%</span>}
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Exam Sections</h2>
            <Button onClick={() => setShowAddSection(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Section
            </Button>
          </div>

          {(!exam.sections || exam.sections.length === 0) && !showAddSection && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-gray-600 mb-4">No sections yet. Add your first section to get started.</p>
                <Button onClick={() => setShowAddSection(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Section
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Add Section Form */}
          {showAddSection && (
            <SectionEditor
              examId={examId}
              onSaved={() => {
                setShowAddSection(false)
                loadExam()
              }}
              onCancel={() => setShowAddSection(false)}
            />
          )}

          {/* Existing Sections */}
          {exam.sections && exam.sections.length > 0 && (
            <div className="space-y-4">
              {exam.sections
                .sort((a, b) => (a.order_index || a.orderIndex || 0) - (b.order_index || b.orderIndex || 0))
                .map((section) => (
                  <SectionCard
                    key={section.id}
                    section={section}
                    onUpdated={loadExam}
                  />
                ))}
            </div>
          )}
        </div>
      </main>

      {/* Assign Exam Dialog */}
      {exam && (
        <AssignExamDialog
          examId={examId}
          examTitle={exam.title}
          open={assignDialogOpen}
          onClose={() => setAssignDialogOpen(false)}
          onAssigned={() => {
            // Optionally show success message
          }}
        />
      )}
    </div>
  )
}

function SectionCard({ 
  section, 
  onUpdated 
}: { 
  section: ExamSection
  onUpdated: () => void 
}) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)
  
  const questionCount = section.questions?.length || 0
  const totalPoints = section.questions?.reduce((sum, q) => sum + q.points, 0) || 0

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this section? All questions in this section will also be deleted.')) {
      return
    }

    setDeleting(true)
    try {
      await api.deleteSection(section.id)
      onUpdated()
    } catch (err: any) {
      console.error('Error deleting section:', err)
      alert('Failed to delete section')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{section.title}</CardTitle>
            <CardDescription>
              {section.description || 'No description'}
            </CardDescription>
          </div>
          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
            {section.section_type?.replace('_', ' ') || section.sectionType?.replace('_', ' ')}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {questionCount} {questionCount === 1 ? 'question' : 'questions'} • {totalPoints} points
          </div>
          <div className="flex space-x-2">
            <Button 
              size="sm"
              variant="outline"
              onClick={() => router.push(`/exam/section/${section.id}`)}
            >
              Manage Questions
            </Button>
            <Button 
              size="sm"
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

