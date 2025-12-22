'use client'

import { useState, useRef } from 'react'
import { Play, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Question } from '@music-exam-builder/shared/types'

interface ListenAndRepeatAnswerProps {
  question: Question
  value: any
  onChange: (value: any) => void
}

const SOLFEGE_NOTES = ['do', 're', 'mi', 'fa', 'sol', 'la', 'si']
const NOTE_NAMES = ['C', 'D', 'E', 'F', 'G', 'A', 'B']

export function ListenAndRepeatAnswer({ question, value, onChange }: ListenAndRepeatAnswerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const audioData = (question.typeData as any) || {}
  const noteFormat = audioData.noteFormat || 'solfege'
  
  const answerNotes = value?.notes || ['']

  const handleAddNote = () => {
    onChange({
      ...value,
      notes: [...answerNotes, '']
    })
  }

  const handleRemoveNote = (index: number) => {
    const newNotes = answerNotes.filter((_: any, i: number) => i !== index)
    onChange({
      ...value,
      notes: newNotes.length > 0 ? newNotes : ['']
    })
  }

  const handleNoteChange = (index: number, note: string) => {
    const newNotes = [...answerNotes]
    newNotes[index] = note
    onChange({
      ...value,
      notes: newNotes,
      answer: newNotes.filter(n => n).join(' ')
    })
  }

  return (
    <div className="space-y-6">
      {/* Audio Player */}
      {audioData.audioFilePath && (
        <div className="border rounded-lg p-6 bg-gray-50">
          <div className="flex items-center justify-center mb-4">
            <Play className="h-8 w-8 text-blue-600" />
          </div>
          <audio
            ref={audioRef}
            controls
            className="w-full"
            src={audioData.audioUrl || `/api/storage/audio/${audioData.audioFilePath}`}
          >
            Your browser does not support the audio element.
          </audio>
          <p className="text-sm text-gray-600 text-center mt-2">
            Listen carefully and repeat the sequence of notes you hear
          </p>
        </div>
      )}

      {/* Note Sequence Input */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Your Answer (sequence of notes):</label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddNote}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Note
          </Button>
        </div>
        <div className="space-y-2">
          {answerNotes.map((note: string, index: number) => (
            <div key={index} className="flex items-center space-x-2">
              <select
                className="flex h-10 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={note}
                onChange={(e) => handleNoteChange(index, e.target.value)}
              >
                <option value="">Select note...</option>
                {(noteFormat === 'solfege' || noteFormat === 'both') && (
                  <>
                    {SOLFEGE_NOTES.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </>
                )}
                {(noteFormat === 'note_names' || noteFormat === 'both') && (
                  <>
                    {NOTE_NAMES.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </>
                )}
              </select>
              {answerNotes.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleRemoveNote(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500">
          Select the notes in the order you heard them
        </p>
      </div>
    </div>
  )
}

