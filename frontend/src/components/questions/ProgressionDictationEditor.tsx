'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Play, Music, Plus, X } from 'lucide-react'
import { musicAudioGenerator } from '@/lib/music-theory/audioGenerator'
import { ROMAN_NUMERALS, KEYS, TIME_SIGNATURES, RHYTHM_PATTERNS } from '@/lib/music-theory/constants'
import { RhythmSymbolDisplay } from '@/components/notation/RhythmSymbolDisplay'
import type { ProgressionChord, ProgressionDictationQuestionData } from '@music-exam-builder/shared/types'

interface ProgressionDictationEditorProps {
  value: Record<string, unknown>
  onChange: (value: Record<string, unknown>) => void
}

export function ProgressionDictationEditor({ value, onChange }: ProgressionDictationEditorProps) {
  const [playing, setPlaying] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)

  // Parse value with backward compatibility for old format
  const parseProgression = (): ProgressionChord[] => {
    const prog = (value as ProgressionDictationQuestionData)?.correctProgression
    if (!prog) return [{ chord: 'I', rhythm: 'quarter' }]
    
    // Check if old format (string[])
    if (Array.isArray(prog) && typeof prog[0] === 'string') {
      return (prog as string[]).map(chord => ({ chord, rhythm: 'quarter' }))
    }
    
    // New format (ProgressionChord[])
    return prog as ProgressionChord[]
  }

  const correctProgression = parseProgression()
  const progressionKey = (value as ProgressionDictationQuestionData)?.progressionKey || 'C major'
  const progressionNotation = (value as ProgressionDictationQuestionData)?.progressionNotation || 'roman'
  const timeSignature = (value as ProgressionDictationQuestionData)?.timeSignature || '4/4'
  const metronomeEnabled = (value as ProgressionDictationQuestionData)?.metronomeEnabled ?? true
  const examplePlayLimit = (value as ProgressionDictationQuestionData)?.examplePlayLimit ?? 3
  const tempo = (value as ProgressionDictationQuestionData)?.tempo ?? 120
  const instrument = (value as ProgressionDictationQuestionData)?.instrument || 'sine'

  // Validate rhythm pattern fits in time signature
  const validateRhythmPattern = (progression: ProgressionChord[], timeSig: string): { valid: boolean; message?: string } => {
    const [beatsPerMeasure] = timeSig.split('/').map(Number)
    const totalBeats = progression.reduce((sum, item) => {
      const rhythmOption = RHYTHM_PATTERNS.find(r => r.value === item.rhythm)
      return sum + (rhythmOption?.beats || 1)
    }, 0)
    
    const measures = Math.ceil(totalBeats / beatsPerMeasure)
    const expectedBeats = measures * beatsPerMeasure
    
    if (totalBeats > expectedBeats) {
      return { valid: false, message: `Rhythm pattern exceeds ${measures} measure(s) (${totalBeats} beats > ${expectedBeats} beats)` }
    }
    
    return { valid: true }
  }

  const handleAddChord = () => {
    const newProgression = [...correctProgression, { chord: 'I', rhythm: 'quarter' }]
    onChange({ ...value, correctProgression: newProgression })
  }

  const handleRemoveChord = (index: number) => {
    if (correctProgression.length > 1) {
      const newProgression = correctProgression.filter((_, i) => i !== index)
      onChange({ ...value, correctProgression: newProgression })
    }
  }

  const handleChordChange = (index: number, newChord: string) => {
    const newProgression = [...correctProgression]
    newProgression[index] = { ...newProgression[index], chord: newChord }
    onChange({ ...value, correctProgression: newProgression })
  }

  const handleRhythmChange = (index: number, newRhythm: ProgressionChord['rhythm']) => {
    const newProgression = [...correctProgression]
    newProgression[index] = { ...newProgression[index], rhythm: newRhythm }
    
    // Validate after change
    const validation = validateRhythmPattern(newProgression, timeSignature)
    if (!validation.valid) {
      alert(`Warning: ${validation.message}`)
    }
    
    onChange({ ...value, correctProgression: newProgression })
  }

  const handlePreview = async () => {
    if (!correctProgression || correctProgression.length === 0) {
      alert('Please add at least one chord to the progression')
      return
    }

    // Validate rhythm pattern
    const validation = validateRhythmPattern(correctProgression, timeSignature)
    if (!validation.valid) {
      alert(`Invalid rhythm pattern: ${validation.message}`)
      return
    }

    setPlaying(true)
    setPreviewError(null)

    try {
      await musicAudioGenerator.generateProgression({
        progression: correctProgression,
        key: progressionKey,
        tempo,
        timeSignature,
        metronomeEnabled,
        instrument: instrument as 'piano' | 'sine' | 'synth'
      })
    } catch (error) {
      console.error('Error previewing progression:', error)
      setPreviewError(error instanceof Error ? error.message : 'Failed to play progression')
      alert('Failed to play progression. Please check the progression and key are valid.')
    } finally {
      setPlaying(false)
    }
  }

  // Display progression summary with rhythm symbols
  const progressionSummary = correctProgression.map((item, index) => (
    <span key={index} className="inline-flex items-center gap-1">
      <span className="font-medium">{item.chord}</span>
      <RhythmSymbolDisplay rhythm={item.rhythm} size={20} />
      {index < correctProgression.length - 1 && <span className="mx-1">→</span>}
    </span>
  ))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b pb-4">
        <div className="flex items-center space-x-3">
          <Music className="h-6 w-6 text-blue-600" />
          <div>
            <h3 className="font-semibold">Progression Dictation Builder</h3>
            <p className="text-sm text-gray-600">
              Configure the chord progression with rhythm patterns. Audio will be generated automatically when students take the exam.
            </p>
          </div>
        </div>
      </div>

      {/* Key Selection */}
      <div className="space-y-2">
        <Label htmlFor="progressionKey">Key * (Required)</Label>
        <select
          id="progressionKey"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={progressionKey}
          onChange={(e) => onChange({ ...value, progressionKey: e.target.value })}
          required
        >
          {KEYS.map(key => (
            <option key={key} value={key}>{key}</option>
          ))}
        </select>
      </div>

      {/* Time Signature */}
      <div className="space-y-2">
        <Label htmlFor="timeSignature">Time Signature * (Required)</Label>
        <select
          id="timeSignature"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={timeSignature}
          onChange={(e) => {
            const newTimeSig = e.target.value
            const validation = validateRhythmPattern(correctProgression, newTimeSig)
            if (!validation.valid) {
              alert(`Warning: Current rhythm pattern may not fit in ${newTimeSig}: ${validation.message}`)
            }
            onChange({ ...value, timeSignature: newTimeSig })
          }}
          required
        >
          {TIME_SIGNATURES.map(ts => (
            <option key={ts.value} value={ts.value}>{ts.label}</option>
          ))}
        </select>
        <p className="text-xs text-gray-500">
          Metronome will play {timeSignature} with proper accents before the progression starts.
        </p>
      </div>

      {/* Metronome Toggle */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="metronomeEnabled"
            checked={metronomeEnabled}
            onChange={(e) => onChange({ ...value, metronomeEnabled: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300"
          />
          <Label htmlFor="metronomeEnabled" className="cursor-pointer">
            Enable Metronome (plays one measure before progression)
          </Label>
        </div>
        <p className="text-xs text-gray-500 ml-6">
          Students will hear a metronome click pattern in {timeSignature} before the progression starts.
        </p>
      </div>

      {/* Progression Notation Type */}
      <div className="space-y-2">
        <Label htmlFor="progressionNotation">Notation Type</Label>
        <select
          id="progressionNotation"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={progressionNotation}
          onChange={(e) => onChange({ ...value, progressionNotation: e.target.value })}
          disabled
        >
          <option value="roman">Roman Numerals (I, V, vi, IV) - Only supported format</option>
        </select>
        <p className="text-xs text-gray-500">
          Currently only Roman numeral notation is supported.
        </p>
      </div>

      {/* Chord Progression Builder */}
      <div className="space-y-3 border-t pt-4">
        <div className="flex items-center justify-between">
          <Label>Chord Progression * (Required)</Label>
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
          Add chords with rhythm patterns. Students will hear and identify this progression measure by measure.
        </p>

        <div className="space-y-3">
          {correctProgression.map((item, index) => (
            <div key={index} className="flex items-center space-x-2 p-3 border rounded-lg bg-gray-50">
              <span className="text-sm text-gray-600 w-8 font-medium">#{index + 1}</span>
              
              {/* Chord Selection */}
              <div className="flex-1">
                <Label htmlFor={`chord-${index}`} className="text-xs text-gray-500">Chord</Label>
                <select
                  id={`chord-${index}`}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={item.chord}
                  onChange={(e) => handleChordChange(index, e.target.value)}
                >
                  {ROMAN_NUMERALS.map(roman => (
                    <option key={roman.value} value={roman.value}>{roman.label}</option>
                  ))}
                </select>
              </div>

              {/* Rhythm Selection */}
              <div className="flex-1">
                <Label htmlFor={`rhythm-${index}`} className="text-xs text-gray-500">Rhythm</Label>
                <div className="flex items-center space-x-2">
                  <select
                    id={`rhythm-${index}`}
                    className="flex h-10 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={item.rhythm}
                    onChange={(e) => handleRhythmChange(index, e.target.value as ProgressionChord['rhythm'])}
                  >
                    {RHYTHM_PATTERNS.map(rhythm => (
                      <option key={rhythm.value} value={rhythm.value}>{rhythm.label}</option>
                    ))}
                  </select>
                  <div className="pt-6">
                    <RhythmSymbolDisplay rhythm={item.rhythm} size={24} />
                  </div>
                </div>
              </div>

              {/* Remove Button */}
              {correctProgression.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveChord(index)}
                  className="mt-6"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>

        {/* Progression Summary */}
        <div className="text-sm text-gray-700 p-3 bg-blue-50 rounded border border-blue-200">
          <strong>Progression Preview:</strong>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            {progressionSummary}
            <span className="text-gray-500">in {progressionKey}</span>
            <span className="text-gray-400">({timeSignature})</span>
          </div>
        </div>
      </div>

      {/* Advanced Options */}
      <div className="space-y-4 border-t pt-4">
        <h4 className="font-medium text-sm">Advanced Options</h4>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="tempo">Tempo (BPM)</Label>
            <Input
              id="tempo"
              type="number"
              min="60"
              max="200"
              value={tempo}
              onChange={(e) => onChange({ ...value, tempo: parseInt(e.target.value, 10) || 120 })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="instrument">Instrument Sound</Label>
            <select
              id="instrument"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={instrument}
              onChange={(e) => onChange({ ...value, instrument: e.target.value })}
            >
              <option value="sine">Sine Wave</option>
              <option value="synth">Synth</option>
              <option value="piano">Piano (Synth)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Example Play Limit */}
      <div className="space-y-2 border-t pt-4">
        <Label htmlFor="examplePlayLimit">Example Play Limit * (Required)</Label>
        <Input
          id="examplePlayLimit"
          type="number"
          min="1"
          max="20"
          value={examplePlayLimit}
          onChange={(e) => onChange({ ...value, examplePlayLimit: parseInt(e.target.value, 10) || 3 })}
          required
        />
        <p className="text-xs text-gray-500">
          Number of times students can play the progression example (1-20). Recommended: 2-3 (progressions are longer).
        </p>
      </div>

      {/* Preview Button */}
      <div className="border-t pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={handlePreview}
          disabled={playing || !correctProgression || correctProgression.length === 0}
          className="w-full"
        >
          <Play className="h-4 w-4 mr-2" />
          {playing ? 'Playing...' : 'Preview Progression'}
        </Button>
        {previewError && (
          <p className="text-sm text-red-600 mt-2">{previewError}</p>
        )}
        <p className="text-xs text-gray-500 mt-2 text-center">
          Preview how the progression will sound to students (includes metronome if enabled)
        </p>
      </div>
    </div>
  )
}
