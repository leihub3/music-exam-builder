'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, Music, X, Plus, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'

interface ListenAndRepeatEditorProps {
  value: any
  onChange: (value: any) => void
}

const SOLFEGE_NOTES = ['do', 're', 'mi', 'fa', 'sol', 'la', 'si']
const NOTE_NAMES = ['C', 'D', 'E', 'F', 'G', 'A', 'B']

export function ListenAndRepeatEditor({ value, onChange }: ListenAndRepeatEditorProps) {
  const [uploading, setUploading] = useState(false)
  const [audioFile, setAudioFile] = useState<File | null>(null)

  const noteFormat = value?.noteFormat || 'solfege'
  const expectedNotes = value?.expectedNotes || ['']

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setAudioFile(file)
    setUploading(true)

    try {
      const response = await api.uploadAudio(file)
      onChange({
        ...value,
        audioFilePath: response.data.path,
        audioUrl: response.data.url
      })
    } catch (err) {
      console.error('Error uploading audio:', err)
      alert('Failed to upload audio file')
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveFile = () => {
    setAudioFile(null)
    onChange({
      ...value,
      audioFilePath: undefined,
      audioUrl: undefined
    })
  }

  const handleAddNote = () => {
    onChange({
      ...value,
      expectedNotes: [...expectedNotes, '']
    })
  }

  const handleRemoveNote = (index: number) => {
    const newNotes = expectedNotes.filter((_: any, i: number) => i !== index)
    onChange({
      ...value,
      expectedNotes: newNotes.length > 0 ? newNotes : ['']
    })
  }

  const handleNoteChange = (index: number, note: string) => {
    const newNotes = [...expectedNotes]
    newNotes[index] = note
    onChange({
      ...value,
      expectedNotes: newNotes
    })
  }

  return (
    <div className="space-y-4">
      {/* Audio Upload */}
      <div className="space-y-2">
        <Label>Audio File *</Label>
        {!value?.audioFilePath ? (
          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            <Music className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 mb-2">Upload an audio file</p>
            <input
              type="file"
              accept="audio/*"
              onChange={handleFileChange}
              className="hidden"
              id="audio-upload"
              disabled={uploading}
            />
            <label htmlFor="audio-upload">
              <Button type="button" variant="outline" disabled={uploading} asChild>
                <span>
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? 'Uploading...' : 'Choose Audio File'}
                </span>
              </Button>
            </label>
            <p className="text-xs text-gray-500 mt-2">MP3, WAV, OGG (max 50MB)</p>
          </div>
        ) : (
          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Music className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="font-medium">Audio file uploaded</p>
                  {value.audioUrl && (
                    <audio controls className="mt-2" src={value.audioUrl}>
                      Your browser does not support the audio element.
                    </audio>
                  )}
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRemoveFile}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Note Format */}
      <div className="space-y-2">
        <Label htmlFor="noteFormat">Note Format</Label>
        <select
          id="noteFormat"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={noteFormat}
          onChange={(e) => {
            onChange({ 
              ...value, 
              noteFormat: e.target.value,
              expectedNotes: [''] // Reset notes when format changes
            })
          }}
        >
          <option value="solfege">Solfege (do, re, mi)</option>
          <option value="note_names">Note Names (C, D, E)</option>
          <option value="both">Both (accept either format)</option>
        </select>
      </div>

      {/* Expected Notes Sequence */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Expected Notes Sequence *</Label>
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
          {expectedNotes.map((note: string, index: number) => (
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
              {expectedNotes.length > 1 && (
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
          Select the expected sequence of notes in the order they appear in the audio
        </p>
      </div>

      {/* Tolerance */}
      <div className="space-y-2">
        <Label htmlFor="tolerance">Tolerance</Label>
        <select
          id="tolerance"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={value?.tolerance || 'strict'}
          onChange={(e) => onChange({ ...value, tolerance: e.target.value })}
        >
          <option value="strict">Strict (exact match required)</option>
          <option value="flexible">Flexible (allow minor variations)</option>
        </select>
        <p className="text-xs text-gray-500">
          How strictly the answer must match the expected sequence
        </p>
      </div>
    </div>
  )
}

