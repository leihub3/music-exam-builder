'use client'

import { useState } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { SectionType } from '@music-exam-builder/shared/types'

interface SectionEditorProps {
  examId: string
  onSaved: () => void
  onCancel: () => void
}

const SECTION_TYPES: { value: SectionType; label: string; description: string }[] = [
  { value: 'TRUE_FALSE', label: 'True/False', description: 'Simple true or false questions' },
  { value: 'MULTIPLE_CHOICE', label: 'Multiple Choice', description: 'Questions with multiple options' },
  { value: 'LISTENING', label: 'Listening', description: 'Audio-based questions' },
  { value: 'TRANSPOSITION', label: 'Transposition', description: 'Transpose music for different instruments' },
  { value: 'ORCHESTRATION', label: 'Orchestration', description: 'Orchestrate piano scores for ensembles' },
]

export function SectionEditor({ examId, onSaved, onCancel }: SectionEditorProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    sectionType: '' as SectionType | '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.sectionType) {
      alert('Please select a section type')
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
            <Label>Section Type *</Label>
            <div className="grid gap-3">
              {SECTION_TYPES.map((type) => (
                <label
                  key={type.value}
                  className={`flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    formData.sectionType === type.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="sectionType"
                    value={type.value}
                    checked={formData.sectionType === type.value}
                    onChange={(e) => setFormData({ ...formData, sectionType: e.target.value as SectionType })}
                    className="mt-1"
                    disabled={loading}
                  />
                  <div className="flex-1">
                    <div className="font-medium">{type.label}</div>
                    <div className="text-sm text-gray-600">{type.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

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

