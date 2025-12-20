'use client'

import { useEffect, useRef } from 'react'
import { Play, Pause } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Question } from '@music-exam-builder/shared/types'

interface ListeningAnswerProps {
  question: Question
  value: any
  onChange: (value: any) => void
}

export function ListeningAnswer({ question, value, onChange }: ListeningAnswerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const audioData = (question.typeData as any) || {}
  const options = audioData.options

  return (
    <div className="space-y-6">
      {/* Audio Player */}
      {audioData.audioFilePath && (
        <div className="border rounded-lg p-6 bg-gray-50">
          <div className="flex items-center justify-center mb-4">
            <Play className="h-8 w-8 text-blue-600" />
          </div>
          <audio
            ref={audioRef}
            controls
            className="w-full"
            src={audioData.audioUrl || `/api/storage/audio/${audioData.audioFilePath}`}
          >
            Your browser does not support the audio element.
          </audio>
          <p className="text-sm text-gray-600 text-center mt-2">
            Listen carefully and answer the question below
          </p>
        </div>
      )}

      {/* Answer Input */}
      {options && options.length > 0 ? (
        // Multiple choice options
        <div className="space-y-3">
          {options.map((option: string, index: number) => (
            <label
              key={index}
              className={`flex items-center space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                value?.selectedOption === option 
                  ? 'border-blue-600 bg-blue-50' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input
                type="radio"
                name="answer"
                checked={value?.selectedOption === option}
                onChange={() => onChange({ selectedOption: option, answer: option })}
                className="w-5 h-5"
              />
              <span className="text-lg">{option}</span>
            </label>
          ))}
        </div>
      ) : (
        // Text input
        <div className="space-y-2">
          <label className="text-sm font-medium">Your Answer:</label>
          <Input
            placeholder="Type your answer here..."
            value={value?.answer || ''}
            onChange={(e) => onChange({ answer: e.target.value })}
            className="text-lg"
          />
        </div>
      )}
    </div>
  )
}

