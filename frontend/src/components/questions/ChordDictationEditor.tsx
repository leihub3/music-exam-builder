'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Play, Music, Plus, Trash2, CheckCircle2 } from 'lucide-react'
import { musicAudioGenerator } from '@/lib/music-theory/audioGenerator'
import { CHORD_QUALITIES, NOTES, OCTAVES, CHORD_VOICINGS, CHORD_TYPES } from '@/lib/music-theory/constants'
import type { ChordDictationQuestionData, ChordDictationItem } from '@music-exam-builder/shared/types'

interface ChordDictationEditorProps {
  value: Record<string, unknown>
  onChange: (value: Record<string, unknown>) => void
}

export function ChordDictationEditor({ value, onChange }: ChordDictationEditorProps) {
  const [playingIndex, setPlayingIndex] = useState<number | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string>('0')

  // Extract data from value
  const valueData = value as unknown as ChordDictationQuestionData
  const chords: ChordDictationItem[] = valueData?.chords || [
    {
      correctChord: 'C major',
      chordVoicing: 'root',
      chordType: 'triad',
      octave: 4,
      orderIndex: 0
    }
  ]
  const examplePlayLimit = valueData?.examplePlayLimit ?? 5
  const tempo = valueData?.tempo ?? 120
  const duration = valueData?.duration ?? 2.0
  const instrument = valueData?.instrument || 'sine'

  // Ensure chords have orderIndex
  useEffect(() => {
    const normalizedChords = chords.map((chord, index) => ({
      ...chord,
      orderIndex: chord.orderIndex ?? index
    }))
    if (JSON.stringify(normalizedChords) !== JSON.stringify(chords)) {
      onChange({ ...value, chords: normalizedChords })
    }
  }, [chords.length])

  const handlePreview = async (index: number) => {
    const chord = chords[index]
    if (!chord?.correctChord) {
      alert('Please enter a chord first')
      return
    }

    setPlayingIndex(index)
    setPreviewError(null)

    try {
      await musicAudioGenerator.generateChord({
        chordName: chord.correctChord,
        octave: chord.octave ?? 4,
        tempo,
        duration,
        instrument: instrument as 'piano' | 'sine' | 'synth'
      })
    } catch (error) {
      console.error('Error previewing chord:', error)
      setPreviewError(error instanceof Error ? error.message : 'Failed to play chord')
      alert('Failed to play chord. Please check the chord name is valid.')
    } finally {
      setPlayingIndex(null)
    }
  }

  const handleAddChord = () => {
    const newChord: ChordDictationItem = {
      correctChord: 'C major',
      chordVoicing: 'root',
      chordType: 'triad',
      octave: 4,
      orderIndex: chords.length
    }
    const newChords = [...chords, newChord]
    onChange({ ...value, chords: newChords })
    // Switch to the new tab
    setActiveTab(String(newChords.length - 1))
  }

  const handleRemoveChord = (index: number) => {
    if (chords.length <= 1) {
      alert('At least one chord is required')
      return
    }
    const updated = chords.filter((_, i) => i !== index).map((chord, i) => ({
      ...chord,
      orderIndex: i
    }))
    onChange({ ...value, chords: updated })
    
    // Adjust active tab if needed
    const removedIndex = parseInt(activeTab, 10)
    if (removedIndex === index) {
      setActiveTab(String(Math.max(0, index - 1)))
    } else if (removedIndex > index) {
      setActiveTab(String(removedIndex - 1))
    }
  }

  const handleChordChange = (index: number, field: keyof ChordDictationItem, newValue: unknown) => {
    const updated = chords.map((chord, i) => 
      i === index ? { ...chord, [field]: newValue } : chord
    )
    onChange({ ...value, chords: updated })
  }

  const handleChordNoteQualityChange = (index: number, note: string, quality: string) => {
    const fullChord = quality ? `${note} ${quality}` : note
    handleChordChange(index, 'correctChord', fullChord)
  }

  // Helper to get chord summary for tab label and overview
  const getChordSummary = (chord: ChordDictationItem) => {
    if (!chord.correctChord) return 'New'
    return chord.correctChord
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Music className="h-6 w-6 text-blue-600" />
            <div>
              <h3 className="font-semibold">Chord Dictation Builder</h3>
              <p className="text-sm text-gray-600">
                Add multiple chords. Audio will be generated automatically when students take the exam.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddChord}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Chord
          </Button>
        </div>
      </div>

      {/* Chords Overview Table */}
      {chords.length > 1 && (
        <div className="border rounded-lg p-4 bg-gray-50">
          <Label className="text-sm font-medium mb-3 block">Chords Overview</Label>
          <div className="grid grid-cols-6 gap-2 text-xs">
            <div className="font-medium">#</div>
            <div className="font-medium">Chord</div>
            <div className="font-medium">Voicing</div>
            <div className="font-medium">Type</div>
            <div className="font-medium">Octave</div>
            <div className="font-medium">Status</div>
            {chords.map((chord, index) => {
              const isComplete = !!chord.correctChord
              const chordParts = chord.correctChord ? chord.correctChord.split(' ') : []
              const chordNote = chordParts[0] || ''
              const chordQuality = chordParts.slice(1).join(' ') || ''
              const voicingLabel = chord.chordVoicing === 'root' ? 'Root' :
                chord.chordVoicing === 'first_inversion' ? '1st Inv' :
                chord.chordVoicing === 'second_inversion' ? '2nd Inv' : 'Open'
              const typeLabel = chord.chordType === 'triad' ? 'Triad' :
                chord.chordType === 'seventh' ? '7th' : 'Extended'
              
              return (
                <React.Fragment key={index}>
                  <div className="text-gray-600">{index + 1}</div>
                  <div className={isComplete ? 'text-gray-900' : 'text-gray-400'}>
                    {chord.correctChord || 'Not set'}
                  </div>
                  <div className="text-gray-600">{voicingLabel}</div>
                  <div className="text-gray-600">{typeLabel}</div>
                  <div className="text-gray-600">{chord.octave ?? 4}</div>
                  <div>
                    {isComplete ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <span className="text-gray-400">Incomplete</span>
                    )}
                  </div>
                </React.Fragment>
              )
            })}
          </div>
        </div>
      )}

      {/* Tabs for Chords */}
      {chords.length > 0 && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className={`w-full ${chords.length === 1 ? 'grid grid-cols-1' : 'grid'}`} style={chords.length > 1 ? { gridTemplateColumns: `repeat(${chords.length}, minmax(0, 1fr))` } : undefined}>
            {chords.map((chord, index) => (
              <TabsTrigger 
                key={index} 
                value={String(index)}
                className="relative"
              >
                <span className="flex items-center space-x-1">
                  <span>Chord {index + 1}</span>
                  {chord.correctChord && (
                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                  )}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          {chords.map((chord, index) => {
            // Parse chord if it exists (e.g., "C major" -> note: "C", quality: "major")
            const chordParts = chord.correctChord ? chord.correctChord.split(' ') : []
            const chordNote = chordParts[0] || 'C'
            const chordQuality = chordParts.slice(1).join(' ') || 'major'

            return (
              <TabsContent key={index} value={String(index)} className="mt-4">
                <div className="border rounded-lg p-6 space-y-4 bg-white">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <Label className="text-base font-medium">Chord {index + 1}</Label>
                      {chord.correctChord && (
                        <p className="text-xs text-gray-500 mt-1">
                          {getChordSummary(chord)}
                        </p>
                      )}
                    </div>
                    {chords.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveChord(index)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    )}
                  </div>

                  {/* Chord Selection */}
                  <div className="space-y-3">
                    <Label className="text-sm">Correct Chord * (Required)</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`chordNote-${index}`} className="text-xs">Root Note</Label>
                        <select
                          id={`chordNote-${index}`}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={chordNote}
                          onChange={(e) => handleChordNoteQualityChange(index, e.target.value, chordQuality)}
                        >
                          {NOTES.map(note => (
                            <option key={note} value={note}>{note}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`chordQuality-${index}`} className="text-xs">Quality</Label>
                        <select
                          id={`chordQuality-${index}`}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={chordQuality}
                          onChange={(e) => handleChordNoteQualityChange(index, chordNote, e.target.value)}
                        >
                          {CHORD_QUALITIES.map(quality => (
                            <option key={quality.value} value={quality.value}>{quality.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      Selected: <strong>{chord.correctChord || 'None'}</strong>
                    </div>
                  </div>

                  {/* Chord Type */}
                  <div className="space-y-2">
                    <Label htmlFor={`chordType-${index}`} className="text-sm">Chord Type</Label>
                    <select
                      id={`chordType-${index}`}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={chord.chordType || 'triad'}
                      onChange={(e) => handleChordChange(index, 'chordType', e.target.value)}
                    >
                      {CHORD_TYPES.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Chord Voicing */}
                  <div className="space-y-2">
                    <Label htmlFor={`chordVoicing-${index}`} className="text-sm">Chord Voicing</Label>
                    <select
                      id={`chordVoicing-${index}`}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={chord.chordVoicing || 'root'}
                      onChange={(e) => handleChordChange(index, 'chordVoicing', e.target.value)}
                    >
                      {CHORD_VOICINGS.map(voicing => (
                        <option key={voicing.value} value={voicing.value}>{voicing.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Octave */}
                  <div className="space-y-2">
                    <Label htmlFor={`octave-${index}`} className="text-sm">Octave</Label>
                    <select
                      id={`octave-${index}`}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={chord.octave ?? 4}
                      onChange={(e) => handleChordChange(index, 'octave', parseInt(e.target.value, 10))}
                    >
                      {OCTAVES.map(oct => (
                        <option key={oct} value={oct}>{oct}</option>
                      ))}
                    </select>
                  </div>

                  {/* Preview Button */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handlePreview(index)}
                    disabled={playingIndex === index || !chord.correctChord}
                    className="w-full"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    {playingIndex === index ? 'Playing...' : 'Preview Chord'}
                  </Button>
                </div>
              </TabsContent>
            )
          })}
        </Tabs>
      )}

      {/* Shared Settings */}
      <div className="space-y-4 border-t pt-4">
        <h4 className="font-medium text-sm">Shared Settings (Applied to All Chords)</h4>
        
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
        <Label htmlFor="examplePlayLimit">Example Play Limit * (Per Chord)</Label>
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
          Number of times students can play each chord example (1-20). Recommended: 3-5.
        </p>
      </div>

      {previewError && (
        <div className="border-t pt-4">
          <p className="text-sm text-red-600">{previewError}</p>
        </div>
      )}
    </div>
  )
}
