'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, Music, X, FileText } from 'lucide-react'
import { api } from '@/lib/api'

interface ListenAndCompleteEditorProps {
  value: any
  onChange: (value: any) => void
}

export function ListenAndCompleteEditor({ value, onChange }: ListenAndCompleteEditorProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadingNotation, setUploadingNotation] = useState(false)
  const [audioFile, setAudioFile] = useState<File | null>(null)

  const handleAudioChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleNotationChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingNotation(true)

    try {
      const response = await api.uploadNotation(file)
      onChange({
        ...value,
        incompleteScorePath: response.data.path,
        incompleteScoreUrl: response.data.url
      })
    } catch (err) {
      console.error('Error uploading notation:', err)
      alert('Failed to upload notation file')
    } finally {
      setUploadingNotation(false)
    }
  }

  const handleRemoveAudio = () => {
    setAudioFile(null)
    onChange({
      ...value,
      audioFilePath: undefined,
      audioUrl: undefined
    })
  }

  const handleRemoveNotation = () => {
    onChange({
      ...value,
      incompleteScorePath: undefined,
      incompleteScoreUrl: undefined
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
              onChange={handleAudioChange}
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
                onClick={handleRemoveAudio}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Optional Notation File Upload */}
      <div className="space-y-2">
        <Label>Incomplete Score (Optional)</Label>
        <p className="text-sm text-gray-600 mb-2">
          Upload a notation file (PDF or MusicXML) with blanks for students to complete
        </p>
        {!value?.incompleteScorePath ? (
          <div className="border-2 border-dashed rounded-lg p-4 text-center">
            <input
              type="file"
              accept=".pdf,.musicxml,.xml"
              onChange={handleNotationChange}
              className="hidden"
              id="notation-upload"
              disabled={uploadingNotation}
            />
            <label htmlFor="notation-upload">
              <Button type="button" variant="outline" disabled={uploadingNotation} asChild>
                <span>
                  <FileText className="h-4 w-4 mr-2" />
                  {uploadingNotation ? 'Uploading...' : 'Choose Notation File'}
                </span>
              </Button>
            </label>
            <p className="text-xs text-gray-500 mt-2">PDF, MusicXML (max 10MB)</p>
          </div>
        ) : (
          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FileText className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="font-medium">Notation file uploaded</p>
                  <p className="text-sm text-gray-600">Incomplete score is ready</p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRemoveNotation}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Correct Answer */}
      <div className="space-y-2">
        <Label htmlFor="correctAnswer">Correct Answer *</Label>
        <Input
          id="correctAnswer"
          placeholder="Enter what should fill the blanks (e.g., do re mi or specific notes)"
          value={typeof value?.correctAnswer === 'string' ? value.correctAnswer : (value?.correctAnswer || []).join(', ')}
          onChange={(e) => {
            // Store as string for single answer, or split by comma for multiple
            const answer = e.target.value
            onChange({ ...value, correctAnswer: answer })
          }}
          required
        />
        <p className="text-xs text-gray-500">
          Enter the correct answer(s) that should fill in the blanks. For multiple blanks, separate with commas.
        </p>
      </div>

      {/* Blank Positions (Optional) */}
      <div className="space-y-2">
        <Label htmlFor="blankPositions">Blank Positions (Optional)</Label>
        <Input
          id="blankPositions"
          placeholder="e.g., 1, 3, 5 (comma-separated positions)"
          value={value?.blankPositions ? value.blankPositions.join(', ') : ''}
          onChange={(e) => {
            const positions = e.target.value
              .split(',')
              .map(p => parseInt(p.trim()))
              .filter(p => !isNaN(p))
            onChange({ ...value, blankPositions: positions.length > 0 ? positions : undefined })
          }}
        />
        <p className="text-xs text-gray-500">
          Specify which positions in the sequence are blanks (1-based indexing). Leave empty if not applicable.
        </p>
      </div>
    </div>
  )
}

