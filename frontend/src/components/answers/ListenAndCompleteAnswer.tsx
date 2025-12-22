'use client'

import { useRef } from 'react'
import { Play, FileText } from 'lucide-react'
import { Input } from '@/components/ui/input'
import type { Question } from '@music-exam-builder/shared/types'

interface ListenAndCompleteAnswerProps {
  question: Question
  value: any
  onChange: (value: any) => void
}

export function ListenAndCompleteAnswer({ question, value, onChange }: ListenAndCompleteAnswerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const audioData = (question.typeData as any) || {}

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
            Listen carefully and complete the blanks
          </p>
        </div>
      )}

      {/* Optional Notation Display */}
      {audioData.incompleteScorePath && (
        <div className="border rounded-lg p-4 bg-gray-50">
          <div className="flex items-center space-x-3 mb-2">
            <FileText className="h-6 w-6 text-blue-600" />
            <span className="font-medium">Incomplete Score</span>
          </div>
          <p className="text-sm text-gray-600 mb-2">
            Review the incomplete score and fill in the blanks based on what you hear
          </p>
          <a
            href={audioData.incompleteScoreUrl || `/api/storage/notation/${audioData.incompleteScorePath}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline text-sm"
          >
            View/Download Score
          </a>
        </div>
      )}

      {/* Answer Input */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Your Answer (what fills the blanks):</label>
        <Input
          placeholder="Enter what should fill in the blanks..."
          value={value?.answer || ''}
          onChange={(e) => onChange({ answer: e.target.value })}
          className="text-lg"
        />
        <p className="text-xs text-gray-500">
          Enter the answer(s) that should complete the blanks. For multiple blanks, separate with commas.
        </p>
      </div>
    </div>
  )
}

