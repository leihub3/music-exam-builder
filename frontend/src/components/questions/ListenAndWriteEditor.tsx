'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, Music, X, FileMusic } from 'lucide-react'
import { api } from '@/lib/api'
import { NotationEditor } from '@/components/notation/NotationEditor'
import { MusicXMLViewer } from '@/components/notation/MusicXMLViewer'

interface ListenAndWriteEditorProps {
  value: Record<string, unknown>
  onChange: (value: Record<string, unknown>) => void
}

export function ListenAndWriteEditor({ value, onChange }: ListenAndWriteEditorProps) {
  const [uploadingAudio, setUploadingAudio] = useState(false)
  const [uploadingReference, setUploadingReference] = useState(false)
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [referenceFile, setReferenceFile] = useState<File | null>(null)
  const [showEditor, setShowEditor] = useState(false)

  const referenceScoreMethod = (value as any)?.referenceScoreMethod || null
  const referenceScorePath = (value as any)?.referenceScorePath
  const referenceScoreMusicXML = (value as any)?.referenceScoreMusicXML
  const hasReferenceScore = !!(referenceScorePath || referenceScoreMusicXML)

  const handleAudioChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setAudioFile(file)
    setUploadingAudio(true)

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
      setUploadingAudio(false)
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

  const handleReferenceFileUpload = async (file: File) => {
    setReferenceFile(file)
    setUploadingReference(true)

    try {
      const response = await api.uploadNotation(file)
      onChange({
        ...value,
        referenceScorePath: response.data.path,
        referenceScoreMethod: 'upload',
        referenceScoreMusicXML: undefined // Clear editor-based reference if file uploaded
      })
    } catch (err) {
      console.error('Error uploading reference file:', err)
      alert('Failed to upload reference score file')
    } finally {
      setUploadingReference(false)
    }
  }

  const handleReferenceFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    await handleReferenceFileUpload(file)
  }

  const handleRemoveReferenceFile = () => {
    setReferenceFile(null)
    onChange({
      ...value,
      referenceScorePath: undefined,
      referenceScoreMethod: null
    })
  }

  const handleEditorClose = (musicXML: string) => {
    if (musicXML) {
      onChange({
        ...value,
        referenceScoreMusicXML: musicXML,
        referenceScoreMethod: 'editor',
        referenceScorePath: undefined // Clear file-based reference if editor used
      })
    }
    setShowEditor(false)
  }

  const handleRemoveReferenceEditor = () => {
    onChange({
      ...value,
      referenceScoreMusicXML: undefined,
      referenceScoreMethod: null
    })
  }

  return (
    <div className="space-y-6">
      {/* Audio File Upload */}
      <div className="space-y-2">
        <Label>Audio File * (Required)</Label>
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
              disabled={uploadingAudio}
            />
            <label htmlFor="audio-upload">
              <Button type="button" variant="outline" disabled={uploadingAudio} asChild>
                <span>
                  <Upload className="h-4 w-4 mr-2" />
                  {uploadingAudio ? 'Uploading...' : 'Choose Audio File'}
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
                  <p className="text-xs text-gray-500">{(value as any).audioFilePath}</p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemoveAudio}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            {(value as any).audioUrl && (
              <audio controls className="w-full mt-3" src={(value as any).audioUrl}>
                Your browser does not support the audio element.
              </audio>
            )}
          </div>
        )}
      </div>

      {/* Concert A Play Limit */}
      <div className="space-y-2">
        <Label htmlFor="concertAPlayLimit">Concert A Play Limit * (Required)</Label>
        <Input
          id="concertAPlayLimit"
          type="number"
          min="0"
          max="20"
          value={(value as any)?.concertAPlayLimit ?? 3}
          onChange={(e) => {
            const limit = parseInt(e.target.value, 10)
            if (!isNaN(limit) && limit >= 0 && limit <= 20) {
              onChange({ ...value, concertAPlayLimit: limit })
            }
          }}
          required
        />
        <p className="text-xs text-gray-500">
          Number of times students can play the Concert A reference tone (0-20). Default: 3
        </p>
      </div>

      {/* Reference Score Section */}
      <div className="space-y-3">
        <Label>Reference Score (Optional - for auto-grading)</Label>
        <p className="text-xs text-gray-600">
          Provide a reference score for automatic evaluation. If not provided, you must enter a correct answer for manual grading.
        </p>

        {!hasReferenceScore ? (
          <div className="space-y-3">
            <div className="flex space-x-4">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="referenceMethod"
                  checked={referenceScoreMethod === 'upload'}
                  onChange={() => onChange({ ...value, referenceScoreMethod: 'upload' })}
                />
                <span>Upload MusicXML File</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="referenceMethod"
                  checked={referenceScoreMethod === 'editor'}
                  onChange={() => onChange({ ...value, referenceScoreMethod: 'editor' })}
                />
                <span>Create with Notation Editor</span>
              </label>
            </div>

            {referenceScoreMethod === 'upload' && (
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <FileMusic className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-2">Upload reference score</p>
                <input
                  type="file"
                  accept=".xml,.musicxml,.mxl"
                  onChange={handleReferenceFileChange}
                  className="hidden"
                  id="reference-upload"
                  disabled={uploadingReference}
                />
                <label htmlFor="reference-upload">
                  <Button type="button" variant="outline" disabled={uploadingReference} asChild>
                    <span>
                      <Upload className="h-4 w-4 mr-2" />
                      {uploadingReference ? 'Uploading...' : 'Choose MusicXML File'}
                    </span>
                  </Button>
                </label>
                <p className="text-xs text-gray-500 mt-2">MusicXML (.xml, .musicxml, .mxl)</p>
              </div>
            )}

            {referenceScoreMethod === 'editor' && (
              <div className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <p className="text-sm font-medium">Notation Editor</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowEditor(true)}
                  >
                    Open Editor
                  </Button>
                </div>
                {showEditor && (
                  <div className="border-t pt-4 mt-4">
                    <NotationEditor
                      onChange={(notes, musicXML) => {
                        if (musicXML) {
                          handleEditorClose(musicXML)
                        }
                      }}
                    />
                    <div className="mt-4 flex justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowEditor(false)}
                      >
                        Close Editor
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FileMusic className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="font-medium">Reference score provided</p>
                  {referenceScorePath && (
                    <p className="text-xs text-gray-500">{referenceScorePath}</p>
                  )}
                  {referenceScoreMusicXML && (
                    <p className="text-xs text-gray-500">Created with editor</p>
                  )}
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={referenceScorePath ? handleRemoveReferenceFile : handleRemoveReferenceEditor}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            {referenceScoreMusicXML && (
              <div className="border rounded bg-white p-3">
                <MusicXMLViewer
                  musicXML={referenceScoreMusicXML}
                  width={800}
                  height={200}
                  className="w-full"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Answer Format */}
      <div className="space-y-2">
        <Label htmlFor="answerFormat">Answer Format</Label>
        <select
          id="answerFormat"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={(value as any)?.answerFormat || 'notes'}
          onChange={(e) => onChange({ ...value, answerFormat: e.target.value })}
        >
          <option value="notes">Note Names (do, re, mi, fa, sol, la, si)</option>
          <option value="text">Free Text</option>
        </select>
      </div>

      {/* Correct Answer */}
      <div className="space-y-2">
        <Label htmlFor="correctAnswer">
          Correct Answer {hasReferenceScore ? '(Optional - fallback for manual grading)' : '* (Required)'}
        </Label>
        <Input
          id="correctAnswer"
          placeholder={(value as any)?.answerFormat === 'notes' ? 'e.g., do re mi fa sol' : 'Enter correct answer'}
          value={(value as any)?.correctAnswer || ''}
          onChange={(e) => onChange({ ...value, correctAnswer: e.target.value })}
          required={!hasReferenceScore}
        />
        <p className="text-xs text-gray-500">
          {hasReferenceScore 
            ? 'Optional: Provide a text answer for manual grading fallback. Automatic evaluation will use the reference score.'
            : (value as any)?.answerFormat === 'notes' 
              ? 'Enter the sequence of notes separated by spaces (do, re, mi, fa, sol, la, si)'
              : 'Enter the correct written answer'}
        </p>
      </div>
    </div>
  )
}
