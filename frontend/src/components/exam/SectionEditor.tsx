'use client'

import { useState } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { SectionType, SectionCategory } from '@music-exam-builder/shared/types'

interface SectionEditorProps {
  examId: string
  onSaved: () => void
  onCancel: () => void
}

const SECTION_CATEGORIES: { value: SectionCategory; label: string; description: string }[] = [
  { value: 'EAR_TRAINING', label: 'Ear Training', description: 'Melodic exercises' },
  { value: 'RHYTHM', label: 'Rhythm', description: 'Rhythmic exercises' },
  { value: 'GENERAL', label: 'General', description: 'General questions' },
]

const EXERCISE_TYPES: Record<SectionCategory, { value: SectionType; label: string; description: string }[]> = {
  EAR_TRAINING: [
    { value: 'LISTEN_AND_WRITE', label: 'Listen and Write', description: 'Listen and write the melody' },
    { value: 'LISTEN_AND_REPEAT', label: 'Listen and Repeat', description: 'Listen and repeat (note names)' },
    { value: 'MULTIPLE_CHOICE', label: 'Multiple Choice', description: 'Multiple choice questions' },
    { value: 'TRUE_FALSE', label: 'True/False', description: 'True or false questions' },
    { value: 'LISTEN_AND_COMPLETE', label: 'Listen and Complete', description: 'Listen and complete the melody' },
  ],
  RHYTHM: [
    { value: 'LISTEN_AND_WRITE', label: 'Listen and Write', description: 'Listen and write the rhythm' },
    { value: 'LISTEN_AND_REPEAT', label: 'Listen and Repeat', description: 'Listen and repeat (rhythm)' },
    { value: 'MULTIPLE_CHOICE', label: 'Multiple Choice', description: 'Multiple choice questions' },
    { value: 'TRUE_FALSE', label: 'True/False', description: 'True or false questions' },
    { value: 'LISTEN_AND_COMPLETE', label: 'Listen and Complete', description: 'Listen and complete the rhythm' },
  ],
  GENERAL: [
    { value: 'TRUE_FALSE', label: 'True/False', description: 'Simple true or false questions' },
    { value: 'MULTIPLE_CHOICE', label: 'Multiple Choice', description: 'Questions with multiple options' },
    { value: 'LISTENING', label: 'Listening', description: 'Audio-based questions' },
    { value: 'TRANSPOSITION', label: 'Transposition', description: 'Transpose music for different instruments' },
    { value: 'ORCHESTRATION', label: 'Orchestration', description: 'Orchestrate piano scores for ensembles' },
  ],
}

export function SectionEditor({ examId, onSaved, onCancel }: SectionEditorProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    sectionCategory: '' as SectionCategory | '',
    sectionType: '' as SectionType | '',
  })

  const availableExercises = formData.sectionCategory 
    ? EXERCISE_TYPES[formData.sectionCategory] || []
    : []

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.sectionCategory) {
      alert('Please select a section category')
      return
    }

    if (!formData.sectionType) {
      alert('Please select an exercise type')
      return
    }

    setLoading(true)

    try {
      // Get current sections count to determine order
      const examResponse = await api.getExam(examId)
      const currentSections = examResponse.data.sections || []
      const orderIndex = currentSections.length

      const sectionData = {
        title: formData.title,
        description: formData.description,
        sectionCategory: formData.sectionCategory,
        sectionType: formData.sectionType,
        orderIndex,
      }

      await api.createSection(examId, sectionData)
      onSaved()
    } catch (err: any) {
      console.error('Error creating section:', err)
      alert('Failed to create section')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add New Section</CardTitle>
        <CardDescription>Choose a section type and provide details</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Section Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Part 1: Theory Questions"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="Optional description for this section"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label>Section Category *</Label>
            <div className="grid gap-3">
              {SECTION_CATEGORIES.map((category) => (
                <label
                  key={category.value}
                  className={`flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    formData.sectionCategory === category.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="sectionCategory"
                    value={category.value}
                    checked={formData.sectionCategory === category.value}
                    onChange={(e) => {
                      setFormData({ 
                        ...formData, 
                        sectionCategory: e.target.value as SectionCategory,
                        sectionType: '' // Reset exercise type when category changes
                      })
                    }}
                    className="mt-1"
                    disabled={loading}
                  />
                  <div className="flex-1">
                    <div className="font-medium">{category.label}</div>
                    <div className="text-sm text-gray-600">{category.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {formData.sectionCategory && (
            <div className="space-y-2">
              <Label>Exercise Type *</Label>
              <div className="grid gap-3">
                {availableExercises.map((exercise) => (
                  <label
                    key={exercise.value}
                    className={`flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      formData.sectionType === exercise.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="sectionType"
                      value={exercise.value}
                      checked={formData.sectionType === exercise.value}
                      onChange={(e) => setFormData({ ...formData, sectionType: e.target.value as SectionType })}
                      className="mt-1"
                      disabled={loading}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{exercise.label}</div>
                      <div className="text-sm text-gray-600">{exercise.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Section'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

