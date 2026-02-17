'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Play, Music, Plus, X } from 'lucide-react'
import { musicAudioGenerator } from '@/lib/music-theory/audioGenerator'
import { ROMAN_NUMERALS } from '@/lib/music-theory/constants'
import type { Question, QuestionBackendResponse, ProgressionDictationQuestionData, ProgressionChord } from '@music-exam-builder/shared/types'

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

  // Get Progression Dictation data with backward compatibility
  const progressionData = (() => {
    const questionBackend = question as QuestionBackendResponse
    if (questionBackend.progression_dictation) {
      const progDataRaw = questionBackend.progression_dictation
      const data = Array.isArray(progDataRaw) ? progDataRaw[0] : progDataRaw
      
      // Handle both old format (string[]) and new format (ProgressionChord[])
      let correctProgression: ProgressionChord[] = []
      const prog = data.correct_progression
      
      if (Array.isArray(prog) && prog.length > 0) {
        if (typeof prog[0] === 'string') {
          // Old format: convert string[] to ProgressionChord[] with default quarter rhythm
          correctProgression = (prog as string[]).map(chord => ({ chord, rhythm: 'quarter' }))
        } else {
          // New format: already ProgressionChord[]
          correctProgression = prog as ProgressionChord[]
        }
      }
      
      return {
        correctProgression,
        progressionKey: data.progression_key || 'C major',
        timeSignature: data.time_signature || '4/4',
        metronomeEnabled: data.metronome_enabled ?? true,
        examplePlayLimit: data.example_play_limit ?? 3,
        tempo: data.tempo ?? 120,
        instrument: data.instrument || 'sine'
      }
    }
    
    // Fallback to typeData
    const typeData = question.typeData as ProgressionDictationQuestionData
    if (typeData?.correctProgression) {
      // Ensure it's ProgressionChord[] format
      const prog = typeData.correctProgression
      let correctProgression: ProgressionChord[] = []
      
      if (Array.isArray(prog) && prog.length > 0) {
        if (typeof prog[0] === 'string') {
          correctProgression = (prog as string[]).map(chord => ({ chord, rhythm: 'quarter' }))
        } else {
          correctProgression = prog
        }
      }
      
      return {
        correctProgression,
        progressionKey: typeData.progressionKey || 'C major',
        timeSignature: typeData.timeSignature || '4/4',
        metronomeEnabled: typeData.metronomeEnabled ?? true,
        examplePlayLimit: typeData.examplePlayLimit ?? 3,
        tempo: typeData.tempo ?? 120,
        instrument: typeData.instrument || 'sine'
      }
    }
    
    return {
      correctProgression: [{ chord: 'I', rhythm: 'quarter' }],
      progressionKey: 'C major',
      timeSignature: '4/4',
      metronomeEnabled: true,
      examplePlayLimit: 3,
      tempo: 120,
      instrument: 'sine'
    }
  })()

  const correctProgression = progressionData.correctProgression
  const progressionKey = progressionData.progressionKey
  const timeSignature = progressionData.timeSignature
  const metronomeEnabled = progressionData.metronomeEnabled
  const examplePlayLimit = progressionData.examplePlayLimit
  const tempo = progressionData.tempo
  const instrument = progressionData.instrument

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
      // Play the correct progression with rhythm patterns and optional metronome
      await musicAudioGenerator.generateProgression({
        progression: correctProgression,
        key: progressionKey,
        tempo,
        timeSignature,
        metronomeEnabled,
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

  // Calculate number of measures based on correct progression (for display purposes)
  const calculateMeasures = () => {
    const rhythmToBeats: Record<string, number> = {
      'whole': 4,
      'dotted-half': 3,
      'half': 2,
      'dotted-quarter': 1.5,
      'quarter': 1,
      'eighth': 0.5
    }
    
    const [beatsPerMeasure] = timeSignature.split('/').map(Number)
    const totalBeats = correctProgression.reduce((sum, item) => {
      return sum + (rhythmToBeats[item.rhythm] || 1)
    }, 0)
    
    return Math.ceil(totalBeats / beatsPerMeasure)
  }

  const measureCount = calculateMeasures()

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="border rounded-lg p-6 bg-blue-50">
        <div className="flex items-center space-x-3 mb-3">
          <Music className="h-6 w-6 text-blue-600" />
          <h3 className="font-semibold">Progression Dictation</h3>
        </div>
        <p className="text-sm text-gray-700">
          Listen to the chord progression and identify it measure by measure. {metronomeEnabled && 'You will hear a metronome before the progression starts.'}
        </p>
        <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
          <span>Key: <strong>{progressionKey}</strong></span>
          <span>Time: <strong>{timeSignature}</strong></span>
          <span>Measures: <strong>{measureCount}</strong></span>
        </div>
      </div>

      {/* Play Example Section */}
      <div className="border rounded-lg p-6 bg-gray-50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <Label className="text-base font-medium">Play Example</Label>
            <p className="text-sm text-gray-600 mt-1">
              {playsRemaining} / {examplePlayLimit} plays remaining
            </p>
            {metronomeEnabled && (
              <p className="text-xs text-gray-500 mt-1">
                Metronome will play {timeSignature} throughout the progression
              </p>
            )}
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

      {/* Answer Selection - Measure by Measure */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>What progression do you hear? * (Enter chords measure by measure)</Label>
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
        <p className="text-xs text-gray-500">
          Build the progression you hear. Each chord represents a chord in the progression (not necessarily one per measure).
        </p>
        
        <div className="space-y-3">
          {selectedProgression.map((chord, index) => (
            <div key={index} className="flex items-center space-x-2 p-2 border rounded bg-white">
              <span className="text-sm text-gray-600 w-8 font-medium">#{index + 1}</span>
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
          Listen carefully and build the progression you hear. The progression spans {measureCount} measure(s).
        </p>
      </div>
    </div>
  )
}
