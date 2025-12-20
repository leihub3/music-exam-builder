'use client'

import { useEffect } from 'react'
import { Label } from '@/components/ui/label'

interface TrueFalseEditorProps {
  value: any
  onChange: (value: any) => void
}

export function TrueFalseEditor({ value, onChange }: TrueFalseEditorProps) {
  // Ensure correctAnswer is always set
  useEffect(() => {
    if (value?.correctAnswer === undefined) {
      onChange({ ...value, correctAnswer: true })
    }
  }, []) // Only run on mount

  const correctAnswer = value?.correctAnswer ?? true

  return (
    <div className="space-y-4">
      <Label>Correct Answer *</Label>
      <div className="space-y-2">
        <label className="flex items-center space-x-3 p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50">
          <input
            type="radio"
            name="correctAnswer"
            checked={correctAnswer === true}
            onChange={() => onChange({ correctAnswer: true })}
          />
          <span className="font-medium">True</span>
        </label>
        <label className="flex items-center space-x-3 p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50">
          <input
            type="radio"
            name="correctAnswer"
            checked={correctAnswer === false}
            onChange={() => onChange({ correctAnswer: false })}
          />
          <span className="font-medium">False</span>
        </label>
      </div>
    </div>
  )
}

