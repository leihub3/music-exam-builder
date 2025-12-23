'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Edit, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import { QuestionEditor } from './QuestionEditor'
import type { Question, QuestionBackendResponse } from '@music-exam-builder/shared/types'

interface QuestionCardProps {
  question: Question
  index: number
  sectionId?: string
  sectionType?: string
  sectionCategory?: string
  onUpdated: () => void
  onDeleted: () => void
}

export function QuestionCard({ question, index, sectionId, sectionType, sectionCategory, onUpdated, onDeleted }: QuestionCardProps) {
  const [deleting, setDeleting] = useState(false)
  const [editing, setEditing] = useState(false)

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this question?')) {
      return
    }

    setDeleting(true)
    try {
      await api.deleteQuestion(question.id)
      onDeleted()
    } catch (err: unknown) {
      console.error('Error deleting question:', err)
      alert('Failed to delete question')
    } finally {
      setDeleting(false)
    }
  }

  const handleEdit = () => {
    setEditing(true)
  }

  const handleCancelEdit = () => {
    setEditing(false)
  }

  const handleSaved = () => {
    setEditing(false)
    onUpdated()
  }

  const questionBackend = question as QuestionBackendResponse
  const questionText = questionBackend.question_text || question.questionText
  const questionPoints = question.points

  // Get section type, category, and ID from props or question
  const finalSectionId = sectionId || 
                         questionBackend.section_id || 
                         questionBackend.sectionId ||
                         questionBackend.section?.id
  const finalSectionType = sectionType ||
                          questionBackend.section?.section_type || 
                          questionBackend.section?.sectionType ||
                          (question as Question & { sectionType?: string }).sectionType
  const finalSectionCategory = sectionCategory ||
                              questionBackend.section?.section_category ||
                              questionBackend.section?.sectionCategory

  if (editing) {
    if (!finalSectionId || !finalSectionType) {
      return (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-red-600">Error: Missing section information</p>
            <Button onClick={handleCancelEdit} className="mt-4">Cancel</Button>
          </CardContent>
        </Card>
      )
    }

    return (
      <QuestionEditor
        sectionId={finalSectionId}
        sectionType={finalSectionType as SectionType}
        sectionCategory={finalSectionCategory}
        questionId={question.id}
        onSaved={handleSaved}
        onCancel={handleCancelEdit}
      />
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-base">
            Question {index + 1} ({questionPoints} {questionPoints === 1 ? 'point' : 'points'})
          </CardTitle>
          <div className="flex space-x-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={handleEdit}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={handleDelete}
              disabled={deleting}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-gray-700 whitespace-pre-wrap">{questionText}</p>
      </CardContent>
    </Card>
  )
}

