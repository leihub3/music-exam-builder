'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Play, Music } from 'lucide-react'
import { musicAudioGenerator } from '@/lib/music-theory/audioGenerator'
import { CHORD_QUALITIES, NOTES } from '@/lib/music-theory/constants'
import type { Question, QuestionBackendResponse, ChordDictationQuestionData } from '@music-exam-builder/shared/types'

interface ChordDictationAnswerProps {
  question: Question
  value?: {
    selectedChord?: string
  }
  onChange: (value: { selectedChord: string }) => void
}

export function ChordDictationAnswer({ question, value, onChange }: ChordDictationAnswerProps) {
  const [playCount, setPlayCount] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chordNote, setChordNote] = useState('C')
  const [chordQuality, setChordQuality] = useState('major')

  // Get Chord Dictation data
  const chordData = (() => {
    const questionBackend = question as QuestionBackendResponse
    if (questionBackend.chord_dictation) {
      const chDataRaw = questionBackend.chord_dictation
      const data = Array.isArray(chDataRaw) ? chDataRaw[0] : chDataRaw
      return {
        correctChord: data.correct_chord || '',
        octave: data.octave ?? 4,
        examplePlayLimit: data.example_play_limit ?? 5,
        tempo: data.tempo ?? 120,
        duration: data.duration ?? 2.0,
        instrument: data.instrument || 'sine'
      }
    }
    return (question.typeData as ChordDictationQuestionData) || {}
  })()

  const correctChord = chordData.correctChord || (question.typeData as ChordDictationQuestionData)?.correctChord || ''
  const octave = chordData.octave ?? (question.typeData as ChordDictationQuestionData)?.octave ?? 4
  const examplePlayLimit = chordData.examplePlayLimit ?? (question.typeData as ChordDictationQuestionData)?.examplePlayLimit ?? 5
  const tempo = chordData.tempo ?? (question.typeData as ChordDictationQuestionData)?.tempo ?? 120
  const duration = chordData.duration ?? (question.typeData as ChordDictationQuestionData)?.duration ?? 2.0
  const instrument = chordData.instrument || (question.typeData as ChordDictationQuestionData)?.instrument || 'sine'

  const canPlay = playCount < examplePlayLimit
  const playsRemaining = Math.max(0, examplePlayLimit - playCount)

  const handlePlayExample = async () => {
    if (!canPlay || !correctChord) {
      if (!correctChord) {
        setError('Chord configuration is missing')
      }
      return
    }

    setPlaying(true)
    setError(null)

    try {
      // Play the correct chord (student doesn't see which one, they have to identify it)
      await musicAudioGenerator.generateChord({
        chordName: correctChord,
        octave,
        tempo,
        duration,
        instrument: instrument as 'piano' | 'sine' | 'synth'
      })

      setPlayCount(prev => prev + 1)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to play chord'
      console.error('Error playing chord:', err)
      setError(errorMessage)
      alert('Failed to play chord. Please check your browser audio permissions.')
    } finally {
      setPlaying(false)
    }
  }

  const handleChordChange = (note: string, quality: string) => {
    const fullChord = `${note} ${quality}`
    onChange({ selectedChord: fullChord })
    setChordNote(note)
    setChordQuality(quality)
  }

  // Initialize chord selection from value
  if (value?.selectedChord && !chordNote && !chordQuality) {
    const parts = value.selectedChord.split(' ')
    if (parts.length >= 2) {
      setChordNote(parts[0])
      setChordQuality(parts.slice(1).join(' '))
    }
  }

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="border rounded-lg p-6 bg-blue-50">
        <div className="flex items-center space-x-3 mb-3">
          <Music className="h-6 w-6 text-blue-600" />
          <h3 className="font-semibold">Chord Dictation</h3>
        </div>
        <p className="text-sm text-gray-700">
          Listen to the chord and identify it. You can play the example multiple times.
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
            {playing ? 'Playing...' : canPlay ? 'Play Chord' : 'Limit Reached'}
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
        <Label>What chord do you hear? *</Label>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="chordNote" className="text-sm">Root Note</Label>
            <select
              id="chordNote"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={chordNote}
              onChange={(e) => handleChordChange(e.target.value, chordQuality)}
            >
              {NOTES.map(note => (
                <option key={note} value={note}>{note}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="chordQuality" className="text-sm">Quality</Label>
            <select
              id="chordQuality"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={chordQuality}
              onChange={(e) => handleChordChange(chordNote, e.target.value)}
            >
              {CHORD_QUALITIES.map(quality => (
                <option key={quality.value} value={quality.value}>{quality.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="text-sm text-gray-600 p-3 bg-gray-50 rounded border">
          Selected: <strong>{chordNote} {chordQuality}</strong>
        </div>
        <p className="text-xs text-gray-500">
          Listen carefully and select the chord you hear
        </p>
      </div>
    </div>
  )
}

