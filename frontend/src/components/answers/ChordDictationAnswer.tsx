'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Play, Music } from 'lucide-react'
import { musicAudioGenerator } from '@/lib/music-theory/audioGenerator'
import { CHORD_QUALITIES, NOTES } from '@/lib/music-theory/constants'
import type { Question, QuestionBackendResponse, ChordDictationQuestionData, ChordDictationItem } from '@music-exam-builder/shared/types'

interface ChordDictationAnswerProps {
  question: Question
  value?: {
    answers?: Array<{ chordIndex: number; selectedChord: string }>
  }
  onChange: (value: { answers: Array<{ chordIndex: number; selectedChord: string }> }) => void
}

export function ChordDictationAnswer({ question, value, onChange }: ChordDictationAnswerProps) {
  const [playingIndex, setPlayingIndex] = useState<number | null>(null)
  const [playCounts, setPlayCounts] = useState<Record<number, number>>({})
  const [error, setError] = useState<string | null>(null)

  // Get Chord Dictation data - handle both typeData and backend structure
  const questionBackend = question as QuestionBackendResponse
  let chords: ChordDictationItem[] = []
  let examplePlayLimit = 5
  let tempo = 120
  let duration = 2.0
  let instrument = 'sine'

  if (questionBackend.chord_dictation) {
    const chDataRaw = questionBackend.chord_dictation
    const data = Array.isArray(chDataRaw) ? chDataRaw[0] : chDataRaw
    examplePlayLimit = data?.example_play_limit ?? 5
    tempo = data?.tempo ?? 120
    duration = data?.duration ?? 2.0
    instrument = data?.instrument || 'sine'
  }

  // Load chord items
  if (questionBackend.chord_dictation_items) {
    const items = Array.isArray(questionBackend.chord_dictation_items)
      ? questionBackend.chord_dictation_items
      : [questionBackend.chord_dictation_items]
    
    chords = items
      .filter((item: any) => item && item.correct_chord)
      .map((item: any) => ({
        correctChord: item.correct_chord || '',
        chordVoicing: item.chord_voicing || 'root',
        chordType: item.chord_type || 'triad',
        octave: item.octave ?? 4,
        orderIndex: item.order_index ?? 0
      }))
      .sort((a, b) => a.orderIndex - b.orderIndex)
  }

  // Fallback to typeData if no items
  if (chords.length === 0 && question.typeData) {
    const typeData = question.typeData as ChordDictationQuestionData
    chords = typeData.chords || []
    examplePlayLimit = typeData.examplePlayLimit ?? 5
    tempo = typeData.tempo ?? 120
    duration = typeData.duration ?? 2.0
    instrument = typeData.instrument || 'sine'
  }

  // Initialize answers if needed
  const answers = value?.answers || chords.map((_, index) => ({ chordIndex: index, selectedChord: '' }))

  const handlePlayExample = async (index: number) => {
    const chord = chords[index]
    if (!chord) return

    const playCount = playCounts[index] || 0
    if (playCount >= examplePlayLimit) {
      return
    }

    setPlayingIndex(index)
    setError(null)

    try {
      await musicAudioGenerator.generateChord({
        chordName: chord.correctChord,
        octave: chord.octave ?? 4,
        tempo,
        duration,
        instrument: instrument as 'piano' | 'sine' | 'synth'
      })

      setPlayCounts(prev => ({ ...prev, [index]: playCount + 1 }))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to play chord'
      console.error('Error playing chord:', err)
      setError(errorMessage)
      alert('Failed to play chord. Please check your browser audio permissions.')
    } finally {
      setPlayingIndex(null)
    }
  }

  const handleChordChange = (chordIndex: number, note: string, quality: string) => {
    const fullChord = `${note} ${quality}`
    const updatedAnswers = answers.map(answer =>
      answer.chordIndex === chordIndex
        ? { ...answer, selectedChord: fullChord }
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
          <h3 className="font-semibold">Chord Dictation</h3>
        </div>
        <p className="text-sm text-gray-700">
          Listen to each chord and identify it. You can play each example multiple times.
        </p>
        <p className="text-xs text-gray-600 mt-2">
          {chords.length} chord{chords.length !== 1 ? 's' : ''} to identify
        </p>
      </div>

      {/* Chords List */}
      <div className="space-y-6">
        {chords.map((chord, index) => {
          const playCount = playCounts[index] || 0
          const canPlay = playCount < examplePlayLimit
          const playsRemaining = Math.max(0, examplePlayLimit - playCount)
          const answer = answers.find(a => a.chordIndex === index)
          const selectedChord = answer?.selectedChord || ''
          
          // Parse selected chord
          const chordParts = selectedChord ? selectedChord.split(' ') : []
          const chordNote = chordParts[0] || 'C'
          const chordQuality = chordParts.slice(1).join(' ') || 'major'

          return (
            <div key={index} className="border rounded-lg p-6 bg-gray-50 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-base font-medium">Chord {index + 1}</Label>
                <div className="text-sm text-gray-600">
                  {playsRemaining} / {examplePlayLimit} plays remaining
                </div>
              </div>

              {/* Play Example Section */}
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm text-gray-700 mb-2">Listen to the chord</p>
                  {!canPlay && (
                    <p className="text-sm text-red-600">
                      Maximum plays reached for this chord
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
              <div className="space-y-3">
                <Label>What chord do you hear? *</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`chordNote-${index}`} className="text-sm">Root Note</Label>
                    <select
                      id={`chordNote-${index}`}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={chordNote}
                      onChange={(e) => handleChordChange(index, e.target.value, chordQuality)}
                      required
                    >
                      {NOTES.map(note => (
                        <option key={note} value={note}>{note}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`chordQuality-${index}`} className="text-sm">Quality</Label>
                    <select
                      id={`chordQuality-${index}`}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={chordQuality}
                      onChange={(e) => handleChordChange(index, chordNote, e.target.value)}
                      required
                    >
                      {CHORD_QUALITIES.map(quality => (
                        <option key={quality.value} value={quality.value}>{quality.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="text-sm text-gray-600 p-3 bg-gray-50 rounded border">
                  Selected: <strong>{selectedChord || 'None'}</strong>
                </div>
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
