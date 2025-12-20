'use client'

import type { Question } from '@music-exam-builder/shared/types'

interface MultipleChoiceAnswerProps {
  question: Question
  value: any
  onChange: (value: any) => void
}

export function MultipleChoiceAnswer({ question, value, onChange }: MultipleChoiceAnswerProps) {
  const options = (question.typeData as any)?.options || []

  return (
    <div className="space-y-3">
      {options.map((option: string, index: number) => (
        <label
          key={index}
          className={`flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
            value?.selectedIndex === index 
              ? 'border-blue-600 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <input
            type="radio"
            name="answer"
            checked={value?.selectedIndex === index}
            onChange={() => onChange({ selectedIndex: index, selectedOption: option })}
            className="w-5 h-5 mt-0.5"
          />
          <span className="text-lg flex-1">{option}</span>
        </label>
      ))}
    </div>
  )
}

