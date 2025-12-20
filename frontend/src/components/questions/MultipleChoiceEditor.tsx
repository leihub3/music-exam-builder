'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2, CheckCircle } from 'lucide-react'

interface MultipleChoiceEditorProps {
  value: any
  onChange: (value: any) => void
}

export function MultipleChoiceEditor({ value, onChange }: MultipleChoiceEditorProps) {
  const options = value?.options || ['', '', '', '']
  const correctOptionIndex = value?.correctOptionIndex ?? 0

  const handleOptionChange = (index: number, text: string) => {
    const newOptions = [...options]
    newOptions[index] = text
    onChange({ ...value, options: newOptions })
  }

  const handleAddOption = () => {
    onChange({ ...value, options: [...options, ''] })
  }

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) {
      alert('Must have at least 2 options')
      return
    }
    const newOptions = options.filter((_: any, i: number) => i !== index)
    const newCorrectIndex = correctOptionIndex >= index && correctOptionIndex > 0 
      ? correctOptionIndex - 1 
      : correctOptionIndex
    onChange({ options: newOptions, correctOptionIndex: newCorrectIndex })
  }

  const handleSetCorrect = (index: number) => {
    onChange({ ...value, correctOptionIndex: index })
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Label>Answer Options *</Label>
        <Button type="button" size="sm" variant="outline" onClick={handleAddOption}>
          <Plus className="h-4 w-4 mr-1" />
          Add Option
        </Button>
      </div>

      <div className="space-y-3">
        {options.map((option: string, index: number) => (
          <div key={index} className="flex items-center space-x-2">
            <Button
              type="button"
              size="sm"
              variant={correctOptionIndex === index ? 'default' : 'outline'}
              onClick={() => handleSetCorrect(index)}
              title="Mark as correct answer"
            >
              <CheckCircle className="h-4 w-4" />
            </Button>
            <Input
              placeholder={`Option ${index + 1}`}
              value={option}
              onChange={(e) => handleOptionChange(index, e.target.value)}
              required
            />
            {options.length > 2 && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => handleRemoveOption(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>

      <p className="text-sm text-gray-600">
        Click the checkmark to set the correct answer. Currently: Option {correctOptionIndex + 1}
      </p>
    </div>
  )
}

