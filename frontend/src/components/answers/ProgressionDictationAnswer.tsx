'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Play, Music, Plus, X } from 'lucide-react'
import { musicAudioGenerator } from '@/lib/music-theory/audioGenerator'
import { ROMAN_NUMERALS } from '@/lib/music-theory/constants'
import type { Question, QuestionBackendResponse, ProgressionDictationQuestionData } from '@music-exam-builder/shared/types'

interface ProgressionDictationAnswerProps {
  question: Question
  value?: {
    selectedProgression?: string[]
  }
  onChange: (value: { selectedProgression: string[] }) => void
}

export function ProgressionDictationAnswer({ question, value, onChange }: ProgressionDictationAnswerProps) {
  const [playCount, setPlayCount] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedProgression, setSelectedProgression] = useState<string[]>(value?.selectedProgression || ['I'])

  // Get Progression Dictation data
  const progressionData = (() => {
    const questionBackend = question as QuestionBackendResponse
    if (questionBackend.progression_dictation) {
      const progDataRaw = questionBackend.progression_dictation
      const data = Array.isArray(progDataRaw) ? progDataRaw[0] : progDataRaw
      return {
        correctProgression: data.correct_progression || [],
        progressionKey: data.progression_key || 'C major',
        examplePlayLimit: data.example_play_limit ?? 3,
        tempo: data.tempo ?? 120,
        chordDuration: data.chord_duration ?? 2.0,
        instrument: data.instrument || 'sine'
      }
    }
    return (question.typeData as ProgressionDictationQuestionData) || {}
  })()

  const correctProgression = progressionData.correctProgression || (question.typeData as ProgressionDictationQuestionData)?.correctProgression || []
  const progressionKey = progressionData.progressionKey || (question.typeData as ProgressionDictationQuestionData)?.progressionKey || 'C major'
  const examplePlayLimit = progressionData.examplePlayLimit ?? (question.typeData as ProgressionDictationQuestionData)?.examplePlayLimit ?? 3
  const tempo = progressionData.tempo ?? (question.typeData as ProgressionDictationQuestionData)?.tempo ?? 120
  const chordDuration = progressionData.chordDuration ?? (question.typeData as ProgressionDictationQuestionData)?.chordDuration ?? 2.0
  const instrument = progressionData.instrument || (question.typeData as ProgressionDictationQuestionData)?.instrument || 'sine'

  const canPlay = playCount < examplePlayLimit
  const playsRemaining = Math.max(0, examplePlayLimit - playCount)

  // Update parent when progression changes
  useEffect(() => {
    onChange({ selectedProgression })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProgression])

  const handlePlayExample = async () => {
    if (!canPlay || !correctProgression || correctProgression.length === 0) {
      if (!correctProgression || correctProgression.length === 0) {
        setError('Progression configuration is missing')
      }
      return
    }

    setPlaying(true)
    setError(null)

    try {
      // Play the correct progression (student doesn't see which one, they have to identify it)
      await musicAudioGenerator.generateProgression({
        progression: correctProgression,
        key: progressionKey,
        tempo,
        chordDuration,
        instrument: instrument as 'piano' | 'sine' | 'synth'
      })

      setPlayCount(prev => prev + 1)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to play progression'
      console.error('Error playing progression:', err)
      setError(errorMessage)
      alert('Failed to play progression. Please check your browser audio permissions.')
    } finally {
      setPlaying(false)
    }
  }

  const handleAddChord = () => {
    setSelectedProgression([...selectedProgression, 'I'])
  }

  const handleRemoveChord = (index: number) => {
    if (selectedProgression.length > 1) {
      const newProgression = selectedProgression.filter((_, i) => i !== index)
      setSelectedProgression(newProgression)
    }
  }

  const handleChordChange = (index: number, newChord: string) => {
    const newProgression = [...selectedProgression]
    newProgression[index] = newChord
    setSelectedProgression(newProgression)
  }

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="border rounded-lg p-6 bg-blue-50">
        <div className="flex items-center space-x-3 mb-3">
          <Music className="h-6 w-6 text-blue-600" />
          <h3 className="font-semibold">Progression Dictation</h3>
        </div>
        <p className="text-sm text-gray-700">
          Listen to the chord progression and identify it. You can play the example multiple times.
        </p>
        <p className="text-xs text-gray-600 mt-2">
          Key: <strong>{progressionKey}</strong>
        </p>
      </div>

      {/* Play Example Section */}
      <div className="border rounded-lg p-6 bg-gray-50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <Label className="text-base font-medium">Play Example</Label>
            <p className="text-sm text-gray-600 mt-1">
              {playsRemaining} / {examplePlayLimit} plays remaining
            </p>
          </div>
          <Button
            type="button"
            variant={canPlay ? "default" : "outline"}
            disabled={!canPlay || playing}
            onClick={handlePlayExample}
          >
            <Play className="h-4 w-4 mr-2" />
            {playing ? 'Playing...' : canPlay ? 'Play Progression' : 'Limit Reached'}
          </Button>
        </div>
        {!canPlay && (
          <p className="text-sm text-red-600 text-center">
            You have reached the maximum number of plays for this question.
          </p>
        )}
        {error && (
          <p className="text-sm text-red-600 text-center mt-2">{error}</p>
        )}
      </div>

      {/* Answer Selection */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>What progression do you hear? *</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddChord}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Chord
          </Button>
        </div>
        
        <div className="space-y-3">
          {selectedProgression.map((chord, index) => (
            <div key={index} className="flex items-center space-x-2">
              <span className="text-sm text-gray-600 w-8">#{index + 1}</span>
              <select
                className="flex h-10 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={chord}
                onChange={(e) => handleChordChange(index, e.target.value)}
              >
                {ROMAN_NUMERALS.map(roman => (
                  <option key={roman.value} value={roman.value}>{roman.label}</option>
                ))}
              </select>
              {selectedProgression.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveChord(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>

        <div className="text-sm text-gray-600 p-3 bg-gray-50 rounded border">
          Your answer: <strong>{selectedProgression.join(' → ')}</strong>
        </div>
        <p className="text-xs text-gray-500">
          Listen carefully and build the progression you hear
        </p>
      </div>
    </div>
  )
}

