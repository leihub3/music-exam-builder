'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Play, Music, Plus, X } from 'lucide-react'
import { musicAudioGenerator } from '@/lib/music-theory/audioGenerator'
import { ROMAN_NUMERALS, KEYS, PROGRESSION_NOTATIONS } from '@/lib/music-theory/constants'

interface ProgressionDictationEditorProps {
  value: Record<string, unknown>
  onChange: (value: Record<string, unknown>) => void
}

export function ProgressionDictationEditor({ value, onChange }: ProgressionDictationEditorProps) {
  const [playing, setPlaying] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)

  const correctProgression = (value as any)?.correctProgression || ['I']
  const progressionKey = (value as any)?.progressionKey || 'C major'
  const progressionNotation = (value as any)?.progressionNotation || 'roman'
  const examplePlayLimit = (value as any)?.examplePlayLimit ?? 3
  const tempo = (value as any)?.tempo ?? 120
  const chordDuration = (value as any)?.chordDuration ?? 2.0
  const instrument = (value as any)?.instrument || 'sine'

  const handleAddChord = () => {
    const newProgression = [...correctProgression, 'I']
    onChange({ ...value, correctProgression: newProgression })
  }

  const handleRemoveChord = (index: number) => {
    if (correctProgression.length > 1) {
      const newProgression = correctProgression.filter((_: string, i: number) => i !== index)
      onChange({ ...value, correctProgression: newProgression })
    }
  }

  const handleChordChange = (index: number, newChord: string) => {
    const newProgression = [...correctProgression]
    newProgression[index] = newChord
    onChange({ ...value, correctProgression: newProgression })
  }

  const handlePreview = async () => {
    if (!correctProgression || correctProgression.length === 0) {
      alert('Please add at least one chord to the progression')
      return
    }

    setPlaying(true)
    setPreviewError(null)

    try {
      await musicAudioGenerator.generateProgression({
        progression: correctProgression,
        key: progressionKey,
        tempo,
        chordDuration,
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b pb-4">
        <div className="flex items-center space-x-3">
          <Music className="h-6 w-6 text-blue-600" />
          <div>
            <h3 className="font-semibold">Progression Dictation Builder</h3>
            <p className="text-sm text-gray-600">
              Configure the chord progression. Audio will be generated automatically when students take the exam.
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

      {/* Progression Notation Type */}
      <div className="space-y-2">
        <Label htmlFor="progressionNotation">Notation Type</Label>
        <select
          id="progressionNotation"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={progressionNotation}
          onChange={(e) => onChange({ ...value, progressionNotation: e.target.value })}
        >
          {PROGRESSION_NOTATIONS.map(notation => (
            <option key={notation.value} value={notation.value}>{notation.label}</option>
          ))}
        </select>
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
          Add chords in sequence. Students will hear and identify this progression.
        </p>

        <div className="space-y-3">
          {(correctProgression as string[]).map((chord, index) => (
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
              {(correctProgression as string[]).length > 1 && (
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
          <strong>Progression:</strong> {correctProgression.join(' → ')} in {progressionKey}
        </div>
      </div>

      {/* Advanced Options */}
      <div className="space-y-4 border-t pt-4">
        <h4 className="font-medium text-sm">Advanced Options (Optional)</h4>
        
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
            <Label htmlFor="chordDuration">Chord Duration (seconds)</Label>
            <Input
              id="chordDuration"
              type="number"
              min="0.5"
              max="5"
              step="0.1"
              value={chordDuration}
              onChange={(e) => onChange({ ...value, chordDuration: parseFloat(e.target.value) || 2.0 })}
            />
          </div>
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
          Preview how the progression will sound to students
        </p>
      </div>
    </div>
  )
}

