'use client'

import { useRef } from 'react'
import { Play } from 'lucide-react'
import { Input } from '@/components/ui/input'
import type { Question } from '@music-exam-builder/shared/types'

interface ListenAndWriteAnswerProps {
  question: Question
  value: any
  onChange: (value: any) => void
}

export function ListenAndWriteAnswer({ question, value, onChange }: ListenAndWriteAnswerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const audioData = (question.typeData as any) || {}
  const answerFormat = audioData.answerFormat || 'notes'

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
            Listen carefully and write what you hear
          </p>
        </div>
      )}

      {/* Answer Input */}
      <div className="space-y-2">
        <label className="text-sm font-medium">
          Your Answer {answerFormat === 'notes' && '(use note names: do, re, mi, fa, sol, la, si)'}:
        </label>
        <Input
          placeholder={answerFormat === 'notes' ? 'e.g., do re mi fa sol' : 'Type your answer here...'}
          value={value?.answer || ''}
          onChange={(e) => onChange({ answer: e.target.value })}
          className="text-lg"
        />
        {answerFormat === 'notes' && (
          <p className="text-xs text-gray-500">
            Enter the sequence of notes separated by spaces (do, re, mi, fa, sol, la, si)
          </p>
        )}
      </div>
    </div>
  )
}

