'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Play, Music } from 'lucide-react'
import { musicAudioGenerator } from '@/lib/music-theory/audioGenerator'
import { CHORD_QUALITIES, NOTES, OCTAVES, CHORD_VOICINGS, CHORD_TYPES } from '@/lib/music-theory/constants'

interface ChordDictationEditorProps {
  value: Record<string, unknown>
  onChange: (value: Record<string, unknown>) => void
}

export function ChordDictationEditor({ value, onChange }: ChordDictationEditorProps) {
  const [playing, setPlaying] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)

  const correctChord = (value as any)?.correctChord || ''
  const chordVoicing = (value as any)?.chordVoicing || 'root'
  const chordType = (value as any)?.chordType || 'triad'
  const octave = (value as any)?.octave ?? 4
  const examplePlayLimit = (value as any)?.examplePlayLimit ?? 5
  const tempo = (value as any)?.tempo ?? 120
  const duration = (value as any)?.duration ?? 2.0
  const instrument = (value as any)?.instrument || 'sine'

  // Parse chord if it exists (e.g., "C major" -> note: "C", quality: "major")
  const chordParts = correctChord ? correctChord.split(' ') : []
  const chordNote = chordParts[0] || 'C'
  const chordQuality = chordParts.slice(1).join(' ') || 'major'

  const handlePreview = async () => {
    if (!correctChord) {
      alert('Please enter a chord first')
      return
    }

    setPlaying(true)
    setPreviewError(null)

    try {
      await musicAudioGenerator.generateChord({
        chordName: correctChord,
        octave,
        tempo,
        duration,
        instrument: instrument as 'piano' | 'sine' | 'synth'
      })
    } catch (error) {
      console.error('Error previewing chord:', error)
      setPreviewError(error instanceof Error ? error.message : 'Failed to play chord')
      alert('Failed to play chord. Please check the chord name is valid.')
    } finally {
      setPlaying(false)
    }
  }

  const handleChordChange = (note: string, quality: string) => {
    const fullChord = quality ? `${note} ${quality}` : note
    onChange({ ...value, correctChord: fullChord })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b pb-4">
        <div className="flex items-center space-x-3">
          <Music className="h-6 w-6 text-blue-600" />
          <div>
            <h3 className="font-semibold">Chord Dictation Builder</h3>
            <p className="text-sm text-gray-600">
              Configure the chord. Audio will be generated automatically when students take the exam.
            </p>
          </div>
        </div>
      </div>

      {/* Chord Selection */}
      <div className="space-y-3">
        <Label>Correct Chord * (Required)</Label>
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
        <div className="text-sm text-gray-600">
          Selected: <strong>{correctChord || 'None'}</strong>
        </div>
      </div>

      {/* Chord Type */}
      <div className="space-y-2">
        <Label htmlFor="chordType">Chord Type</Label>
        <select
          id="chordType"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={chordType}
          onChange={(e) => onChange({ ...value, chordType: e.target.value })}
        >
          {CHORD_TYPES.map(type => (
            <option key={type.value} value={type.value}>{type.label}</option>
          ))}
        </select>
      </div>

      {/* Chord Voicing */}
      <div className="space-y-2">
        <Label htmlFor="chordVoicing">Chord Voicing</Label>
        <select
          id="chordVoicing"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={chordVoicing}
          onChange={(e) => onChange({ ...value, chordVoicing: e.target.value })}
        >
          {CHORD_VOICINGS.map(voicing => (
            <option key={voicing.value} value={voicing.value}>{voicing.label}</option>
          ))}
        </select>
        <p className="text-xs text-gray-500">
          Note: Voicing affects the chord sound but current implementation plays root position
        </p>
      </div>

      {/* Advanced Options */}
      <div className="space-y-4 border-t pt-4">
        <h4 className="font-medium text-sm">Advanced Options (Optional)</h4>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="octave">Octave</Label>
            <select
              id="octave"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={octave}
              onChange={(e) => onChange({ ...value, octave: parseInt(e.target.value, 10) })}
            >
              {OCTAVES.map(oct => (
                <option key={oct} value={oct}>{oct}</option>
              ))}
            </select>
          </div>
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
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="duration">Duration (seconds)</Label>
            <Input
              id="duration"
              type="number"
              min="0.5"
              max="5"
              step="0.1"
              value={duration}
              onChange={(e) => onChange({ ...value, duration: parseFloat(e.target.value) || 2.0 })}
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
          onChange={(e) => onChange({ ...value, examplePlayLimit: parseInt(e.target.value, 10) || 5 })}
          required
        />
        <p className="text-xs text-gray-500">
          Number of times students can play the chord example (1-20). Recommended: 3-5.
        </p>
      </div>

      {/* Preview Button */}
      <div className="border-t pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={handlePreview}
          disabled={playing || !correctChord}
          className="w-full"
        >
          <Play className="h-4 w-4 mr-2" />
          {playing ? 'Playing...' : 'Preview Chord'}
        </Button>
        {previewError && (
          <p className="text-sm text-red-600 mt-2">{previewError}</p>
        )}
        <p className="text-xs text-gray-500 mt-2 text-center">
          Preview how the chord will sound to students
        </p>
      </div>
    </div>
  )
}

