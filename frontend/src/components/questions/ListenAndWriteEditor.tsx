'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, Music, X } from 'lucide-react'
import { api } from '@/lib/api'

interface ListenAndWriteEditorProps {
  value: any
  onChange: (value: any) => void
}

export function ListenAndWriteEditor({ value, onChange }: ListenAndWriteEditorProps) {
  const [uploading, setUploading] = useState(false)
  const [audioFile, setAudioFile] = useState<File | null>(null)

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

      {/* Answer Format */}
      <div className="space-y-2">
        <Label htmlFor="answerFormat">Answer Format</Label>
        <select
          id="answerFormat"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={value?.answerFormat || 'notes'}
          onChange={(e) => onChange({ ...value, answerFormat: e.target.value })}
        >
          <option value="notes">Note Names (do, re, mi, fa, sol, la, si)</option>
          <option value="text">Free Text</option>
        </select>
      </div>

      {/* Correct Answer */}
      <div className="space-y-2">
        <Label htmlFor="correctAnswer">Correct Answer *</Label>
        <Input
          id="correctAnswer"
          placeholder={value?.answerFormat === 'notes' ? 'e.g., do re mi fa sol' : 'Enter correct answer'}
          value={value?.correctAnswer || ''}
          onChange={(e) => onChange({ ...value, correctAnswer: e.target.value })}
          required
        />
        <p className="text-xs text-gray-500">
          {value?.answerFormat === 'notes' 
            ? 'Enter the sequence of notes separated by spaces (do, re, mi, fa, sol, la, si)'
            : 'Enter the correct written answer'}
        </p>
      </div>
    </div>
  )
}

