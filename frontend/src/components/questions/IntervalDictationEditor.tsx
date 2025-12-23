'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Play, Music, Plus, Trash2, CheckCircle2 } from 'lucide-react'
import { musicAudioGenerator } from '@/lib/music-theory/audioGenerator'
import { INTERVALS, INTERVAL_DIRECTIONS, NOTES, OCTAVES } from '@/lib/music-theory/constants'
import type { IntervalDictationQuestionData, IntervalDictationItem } from '@music-exam-builder/shared/types'

interface IntervalDictationEditorProps {
  value: Record<string, unknown>
  onChange: (value: Record<string, unknown>) => void
}

export function IntervalDictationEditor({ value, onChange }: IntervalDictationEditorProps) {
  const [playingIndex, setPlayingIndex] = useState<number | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string>('0')

  // Extract data from value
  const valueData = value as unknown as IntervalDictationQuestionData
  const intervals: IntervalDictationItem[] = valueData?.intervals || [
    {
      rootNote: 'C4',
      correctInterval: '',
      intervalDirection: 'ascending',
      orderIndex: 0
    }
  ]
  const examplePlayLimit = valueData?.examplePlayLimit ?? 5
  const tempo = valueData?.tempo ?? 120
  const noteDuration = valueData?.noteDuration ?? 1.0
  const instrument = valueData?.instrument || 'sine'

  // Ensure intervals have orderIndex
  useEffect(() => {
    const normalizedIntervals = intervals.map((interval, index) => ({
      ...interval,
      orderIndex: interval.orderIndex ?? index
    }))
    if (JSON.stringify(normalizedIntervals) !== JSON.stringify(intervals)) {
      onChange({ ...value, intervals: normalizedIntervals })
    }
  }, [intervals.length])

  const handlePreview = async (index: number) => {
    const interval = intervals[index]
    if (!interval?.correctInterval) {
      alert('Please select an interval first')
      return
    }

    setPlayingIndex(index)
    setPreviewError(null)

    try {
      await musicAudioGenerator.generateInterval({
        rootNote: interval.rootNote || 'C4',
        interval: interval.correctInterval,
        direction: (interval.intervalDirection || 'ascending') as 'ascending' | 'descending' | 'harmonic',
        tempo,
        noteDuration,
        instrument: instrument as 'piano' | 'sine' | 'synth'
      })
    } catch (error) {
      console.error('Error previewing interval:', error)
      setPreviewError(error instanceof Error ? error.message : 'Failed to play interval')
      alert('Failed to play interval. Please check your browser audio permissions.')
    } finally {
      setPlayingIndex(null)
    }
  }

  const handleAddInterval = () => {
    const newInterval: IntervalDictationItem = {
      rootNote: 'C4',
      correctInterval: '',
      intervalDirection: 'ascending',
      orderIndex: intervals.length
    }
    const newIntervals = [...intervals, newInterval]
    onChange({ ...value, intervals: newIntervals })
    // Switch to the new tab
    setActiveTab(String(newIntervals.length - 1))
  }

  const handleRemoveInterval = (index: number) => {
    if (intervals.length <= 1) {
      alert('At least one interval is required')
      return
    }
    const updated = intervals.filter((_, i) => i !== index).map((interval, i) => ({
      ...interval,
      orderIndex: i
    }))
    onChange({ ...value, intervals: updated })
    
    // Adjust active tab if needed
    const removedIndex = parseInt(activeTab, 10)
    if (removedIndex === index) {
      // If we removed the active tab, switch to the previous one or first one
      setActiveTab(String(Math.max(0, index - 1)))
    } else if (removedIndex > index) {
      // If we removed a tab before the active one, adjust the index
      setActiveTab(String(removedIndex - 1))
    }
  }

  const handleIntervalChange = (index: number, field: keyof IntervalDictationItem, newValue: unknown) => {
    const updated = intervals.map((interval, i) => 
      i === index ? { ...interval, [field]: newValue } : interval
    )
    onChange({ ...value, intervals: updated })
  }

  const handleRootNoteChange = (index: number, note: string, octave: number) => {
    handleIntervalChange(index, 'rootNote', `${note}${octave}`)
  }

  // Helper to get interval summary for tab label
  const getIntervalSummary = (interval: IntervalDictationItem) => {
    if (!interval.correctInterval) return 'New'
    const intervalLabel = INTERVALS.find(i => i.value === interval.correctInterval)?.label || interval.correctInterval
    const direction = interval.intervalDirection === 'ascending' ? '↑' : interval.intervalDirection === 'descending' ? '↓' : '='
    return `${intervalLabel} ${direction}`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Music className="h-6 w-6 text-blue-600" />
            <div>
              <h3 className="font-semibold">Interval Dictation Builder</h3>
              <p className="text-sm text-gray-600">
                Add multiple intervals. Audio will be generated automatically when students take the exam.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddInterval}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Interval
          </Button>
        </div>
      </div>

      {/* Intervals Overview Table */}
      {intervals.length > 1 && (
        <div className="border rounded-lg p-4 bg-gray-50">
          <Label className="text-sm font-medium mb-3 block">Intervals Overview</Label>
          <div className="grid grid-cols-5 gap-2 text-xs">
            <div className="font-medium">#</div>
            <div className="font-medium">Interval</div>
            <div className="font-medium">Root Note</div>
            <div className="font-medium">Direction</div>
            <div className="font-medium">Status</div>
            {intervals.map((interval, index) => {
              const intervalLabel = interval.correctInterval 
                ? INTERVALS.find(i => i.value === interval.correctInterval)?.label || interval.correctInterval
                : 'Not set'
              const isComplete = !!interval.correctInterval
              return (
                <React.Fragment key={index}>
                  <div className="text-gray-600">{index + 1}</div>
                  <div className={isComplete ? 'text-gray-900' : 'text-gray-400'}>{intervalLabel}</div>
                  <div className="text-gray-600">{interval.rootNote || 'C4'}</div>
                  <div className="text-gray-600">
                    {interval.intervalDirection === 'ascending' ? '↑ Asc' : 
                     interval.intervalDirection === 'descending' ? '↓ Desc' : 
                     '= Harm'}
                  </div>
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

      {/* Tabs for Intervals */}
      {intervals.length > 0 && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className={`w-full ${intervals.length === 1 ? 'grid grid-cols-1' : 'grid'}`} style={intervals.length > 1 ? { gridTemplateColumns: `repeat(${intervals.length}, minmax(0, 1fr))` } : undefined}>
            {intervals.map((interval, index) => (
              <TabsTrigger 
                key={index} 
                value={String(index)}
                className="relative"
              >
                <span className="flex items-center space-x-1">
                  <span>Interval {index + 1}</span>
                  {interval.correctInterval && (
                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                  )}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

        {intervals.map((interval, index) => {
          const rootNoteMatch = (interval.rootNote || 'C4').match(/^([A-G]#?)(\d+)$/)
          const rootNoteBase = rootNoteMatch ? rootNoteMatch[1] : 'C'
          const rootOctave = rootNoteMatch ? parseInt(rootNoteMatch[2], 10) : 4

          return (
            <TabsContent key={index} value={String(index)} className="mt-4">
              <div className="border rounded-lg p-6 space-y-4 bg-white">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <Label className="text-base font-medium">Interval {index + 1}</Label>
                    {interval.correctInterval && (
                      <p className="text-xs text-gray-500 mt-1">
                        {getIntervalSummary(interval)}
                      </p>
                    )}
                  </div>
                  {intervals.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveInterval(index)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  )}
                </div>

              {/* Root Note (Optional) */}
              <div className="space-y-2">
                <Label className="text-sm">Root Note (Optional)</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor={`rootNoteBase-${index}`} className="text-xs">Note</Label>
                    <select
                      id={`rootNoteBase-${index}`}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={rootNoteBase}
                      onChange={(e) => handleRootNoteChange(index, e.target.value, rootOctave)}
                    >
                      {NOTES.map(note => (
                        <option key={note} value={note}>{note}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`rootOctave-${index}`} className="text-xs">Octave</Label>
                    <select
                      id={`rootOctave-${index}`}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={rootOctave}
                      onChange={(e) => handleRootNoteChange(index, rootNoteBase, parseInt(e.target.value, 10))}
                    >
                      {OCTAVES.map(oct => (
                        <option key={oct} value={oct}>{oct}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const randomNote = NOTES[Math.floor(Math.random() * NOTES.length)]
                    const randomOctave = OCTAVES[Math.floor(Math.random() * OCTAVES.length)]
                    handleRootNoteChange(index, randomNote, randomOctave)
                  }}
                >
                  Randomize
                </Button>
              </div>

              {/* Interval Selection */}
              <div className="space-y-2">
                <Label htmlFor={`correctInterval-${index}`} className="text-sm">Correct Interval *</Label>
                <select
                  id={`correctInterval-${index}`}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={interval.correctInterval || ''}
                  onChange={(e) => handleIntervalChange(index, 'correctInterval', e.target.value)}
                  required
                >
                  <option value="">Select interval...</option>
                  {INTERVALS.map(int => (
                    <option key={int.value} value={int.value}>
                      {int.label} ({int.semitones} semitones)
                    </option>
                  ))}
                </select>
              </div>

              {/* Interval Direction */}
              <div className="space-y-2">
                <Label htmlFor={`intervalDirection-${index}`} className="text-sm">Interval Direction</Label>
                <select
                  id={`intervalDirection-${index}`}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={interval.intervalDirection || 'ascending'}
                  onChange={(e) => handleIntervalChange(index, 'intervalDirection', e.target.value)}
                >
                  {INTERVAL_DIRECTIONS.map(dir => (
                    <option key={dir.value} value={dir.value}>{dir.label}</option>
                  ))}
                </select>
              </div>

                {/* Preview Button */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handlePreview(index)}
                  disabled={playingIndex === index || !interval.correctInterval}
                  className="w-full"
                >
                  <Play className="h-4 w-4 mr-2" />
                  {playingIndex === index ? 'Playing...' : 'Preview Interval'}
                </Button>
              </div>
            </TabsContent>
          )
        })}
        </Tabs>
      )}

      {/* Shared Settings */}
      <div className="space-y-4 border-t pt-4">
        <h4 className="font-medium text-sm">Shared Settings (Applied to All Intervals)</h4>
        
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
            <Label htmlFor="noteDuration">Note Duration (seconds)</Label>
            <Input
              id="noteDuration"
              type="number"
              min="0.5"
              max="5"
              step="0.1"
              value={noteDuration}
              onChange={(e) => onChange({ ...value, noteDuration: parseFloat(e.target.value) || 1.0 })}
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
        <Label htmlFor="examplePlayLimit">Example Play Limit * (Per Interval)</Label>
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
          Number of times students can play each interval example (1-20). Recommended: 3-5.
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

