'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Play, Music } from 'lucide-react'
import { musicAudioGenerator } from '@/lib/music-theory/audioGenerator'
import { INTERVALS } from '@/lib/music-theory/constants'
import type { Question, QuestionBackendResponse, IntervalDictationQuestionData, IntervalDictationItem } from '@music-exam-builder/shared/types'

interface IntervalDictationAnswerProps {
  question: Question
  value?: {
    answers?: Array<{ intervalIndex: number; selectedInterval: string }>
  }
  onChange: (value: { answers: Array<{ intervalIndex: number; selectedInterval: string }> }) => void
}

export function IntervalDictationAnswer({ question, value, onChange }: IntervalDictationAnswerProps) {
  const [playingIndex, setPlayingIndex] = useState<number | null>(null)
  const [playCounts, setPlayCounts] = useState<Record<number, number>>({})
  const [error, setError] = useState<string | null>(null)

  // Get Interval Dictation data - handle both typeData and backend structure
  const questionBackend = question as QuestionBackendResponse
  let intervals: IntervalDictationItem[] = []
  let examplePlayLimit = 5
  let tempo = 120
  let noteDuration = 1.0
  let instrument = 'sine'

  if (questionBackend.interval_dictation) {
    const intDataRaw = questionBackend.interval_dictation
    const data = Array.isArray(intDataRaw) ? intDataRaw[0] : intDataRaw
    examplePlayLimit = data?.example_play_limit ?? 5
    tempo = data?.tempo ?? 120
    noteDuration = data?.note_duration ?? 1.0
    instrument = data?.instrument || 'sine'
  }

  // Load interval items
  if (questionBackend.interval_dictation_items) {
    const items = Array.isArray(questionBackend.interval_dictation_items)
      ? questionBackend.interval_dictation_items
      : [questionBackend.interval_dictation_items]
    
    intervals = items
      .filter((item: any) => item && item.correct_interval)
      .map((item: any) => ({
        rootNote: item.root_note || 'C4',
        correctInterval: item.correct_interval || '',
        intervalDirection: item.interval_direction || 'ascending',
        orderIndex: item.order_index ?? 0
      }))
      .sort((a, b) => a.orderIndex - b.orderIndex)
  }

  // Fallback to typeData if no items
  if (intervals.length === 0 && question.typeData) {
    const typeData = question.typeData as IntervalDictationQuestionData
    intervals = typeData.intervals || []
    examplePlayLimit = typeData.examplePlayLimit ?? 5
    tempo = typeData.tempo ?? 120
    noteDuration = typeData.noteDuration ?? 1.0
    instrument = typeData.instrument || 'sine'
  }

  // Initialize answers if needed
  const answers = value?.answers || intervals.map((_, index) => ({ intervalIndex: index, selectedInterval: '' }))

  const handlePlayExample = async (index: number) => {
    const interval = intervals[index]
    if (!interval) return

    const playCount = playCounts[index] || 0
    if (playCount >= examplePlayLimit) {
      return
    }

    setPlayingIndex(index)
    setError(null)

    try {
      await musicAudioGenerator.generateInterval({
        rootNote: interval.rootNote || 'C4',
        interval: interval.correctInterval,
        direction: (interval.intervalDirection || 'ascending') as 'ascending' | 'descending' | 'harmonic',
        tempo,
        noteDuration,
        instrument: instrument as 'piano' | 'sine' | 'synth'
      })

      setPlayCounts(prev => ({ ...prev, [index]: playCount + 1 }))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to play interval'
      console.error('Error playing interval:', err)
      setError(errorMessage)
      alert('Failed to play interval. Please check your browser audio permissions.')
    } finally {
      setPlayingIndex(null)
    }
  }

  const handleIntervalChange = (intervalIndex: number, selectedInterval: string) => {
    const updatedAnswers = answers.map(answer =>
      answer.intervalIndex === intervalIndex
        ? { ...answer, selectedInterval }
        : answer
    )
    onChange({ answers: updatedAnswers })
  }

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="border rounded-lg p-6 bg-blue-50">
        <div className="flex items-center space-x-3 mb-3">
          <Music className="h-6 w-6 text-blue-600" />
          <h3 className="font-semibold">Interval Dictation</h3>
        </div>
        <p className="text-sm text-gray-700">
          Listen to each interval and identify it. You can play each example multiple times.
        </p>
        <p className="text-xs text-gray-600 mt-2">
          {intervals.length} interval{intervals.length !== 1 ? 's' : ''} to identify
        </p>
      </div>

      {/* Intervals List */}
      <div className="space-y-6">
        {intervals.map((interval, index) => {
          const playCount = playCounts[index] || 0
          const canPlay = playCount < examplePlayLimit
          const playsRemaining = Math.max(0, examplePlayLimit - playCount)
          const answer = answers.find(a => a.intervalIndex === index)
          const selectedInterval = answer?.selectedInterval || ''

          return (
            <div key={index} className="border rounded-lg p-6 bg-gray-50 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-base font-medium">Interval {index + 1}</Label>
                <div className="text-sm text-gray-600">
                  {playsRemaining} / {examplePlayLimit} plays remaining
                </div>
              </div>

              {/* Play Example Section */}
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm text-gray-700 mb-2">Listen to the interval</p>
                  {!canPlay && (
                    <p className="text-sm text-red-600">
                      Maximum plays reached for this interval
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  variant={canPlay ? "default" : "outline"}
                  disabled={!canPlay || playingIndex === index}
                  onClick={() => handlePlayExample(index)}
                >
                  <Play className="h-4 w-4 mr-2" />
                  {playingIndex === index ? 'Playing...' : canPlay ? 'Play' : 'Limit Reached'}
                </Button>
              </div>

              {/* Answer Selection */}
              <div className="space-y-2">
                <Label htmlFor={`selectedInterval-${index}`}>What interval do you hear? *</Label>
                <select
                  id={`selectedInterval-${index}`}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={selectedInterval}
                  onChange={(e) => handleIntervalChange(index, e.target.value)}
                  required
                >
                  <option value="">Select interval...</option>
                  {INTERVALS.map(int => (
                    <option key={int.value} value={int.value}>
                      {int.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )
        })}
      </div>

      {error && (
        <div className="border rounded-lg p-4 bg-red-50">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  )
}

