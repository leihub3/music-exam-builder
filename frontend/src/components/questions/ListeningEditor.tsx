'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, Music, X } from 'lucide-react'
import { api } from '@/lib/api'

interface ListeningEditorProps {
  value: any
  onChange: (value: any) => void
}

export function ListeningEditor({ value, onChange }: ListeningEditorProps) {
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

      {/* Question Type */}
      <div className="space-y-2">
        <Label htmlFor="questionType">Question Type (Optional)</Label>
        <select
          id="questionType"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={value?.questionType || ''}
          onChange={(e) => onChange({ ...value, questionType: e.target.value })}
        >
          <option value="">Select type...</option>
          <option value="interval">Interval Recognition</option>
          <option value="chord">Chord Recognition</option>
          <option value="rhythm">Rhythm Recognition</option>
          <option value="melody">Melody Recognition</option>
        </select>
      </div>

      {/* Correct Answer */}
      <div className="space-y-2">
        <Label htmlFor="correctAnswer">Correct Answer *</Label>
        <Input
          id="correctAnswer"
          placeholder="e.g., Perfect Fifth, Major Triad, etc."
          value={value?.correctAnswer || ''}
          onChange={(e) => onChange({ ...value, correctAnswer: e.target.value })}
          required
        />
      </div>

      {/* Optional Multiple Choice Options */}
      <div className="space-y-2">
        <Label>Multiple Choice Options (Optional)</Label>
        <p className="text-sm text-gray-600">
          Leave empty for open-ended question, or provide options for multiple choice
        </p>
        <Input
          placeholder="Option 1"
          value={value?.options?.[0] || ''}
          onChange={(e) => {
            const options = value?.options || []
            options[0] = e.target.value
            onChange({ ...value, options })
          }}
        />
        <Input
          placeholder="Option 2"
          value={value?.options?.[1] || ''}
          onChange={(e) => {
            const options = value?.options || []
            options[1] = e.target.value
            onChange({ ...value, options })
          }}
        />
      </div>
    </div>
  )
}

