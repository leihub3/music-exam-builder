'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Play, Upload, FileMusic, X, Music } from 'lucide-react'
import { NotationEditor } from '@/components/notation/NotationEditor'
import { api } from '@/lib/api'
import { playConcertA } from '@/lib/utils/concertA'
import type { Question, QuestionBackendResponse, ListenAndWriteQuestionData } from '@music-exam-builder/shared/types'

interface ListenAndWriteAnswerProps {
  question: Question
  value?: {
    musicXML?: string
    notes?: unknown[]
    file?: File
  }
  onChange: (value: { musicXML?: string; notes?: unknown[]; file?: File }) => void
}

export function ListenAndWriteAnswer({ question, value, onChange }: ListenAndWriteAnswerProps) {
  const [submissionMethod, setSubmissionMethod] = useState<'editor' | 'upload'>('editor')
  const [concertAPlayCount, setConcertAPlayCount] = useState(0)
  const [playingConcertA, setPlayingConcertA] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  // Get Listen and Write data - handle both typeData and backend structure
  const lawData = (() => {
    const questionBackend = question as QuestionBackendResponse
    if (questionBackend.listen_and_write) {
      const lawRaw = questionBackend.listen_and_write
      const data = Array.isArray(lawRaw)
        ? lawRaw[0]
        : lawRaw
      return {
        audioFilePath: data.audio_file_path,
        concertAPlayLimit: data.concert_a_play_limit ?? 3,
        audioUrl: data.audio_file_path ? (() => {
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
          if (supabaseUrl) {
            return `${supabaseUrl}/storage/v1/object/public/audio-files/${data.audio_file_path}`
          }
          return null
        })() : null,
      }
    }
    return (question.typeData as ListenAndWriteQuestionData) || {}
  })()

  const audioFilePath = lawData.audioFilePath || (question.typeData as ListenAndWriteQuestionData)?.audioFilePath
  const concertAPlayLimit = lawData.concertAPlayLimit ?? (question.typeData as ListenAndWriteQuestionData)?.concertAPlayLimit ?? 3

  // Initialize submission method from value
  useEffect(() => {
    if (value?.file) {
      setSubmissionMethod('upload')
      setFile(value.file as File)
    } else if (value?.musicXML || value?.notes) {
      setSubmissionMethod('editor')
    }
  }, [])

  const handleConcertAPlay = async () => {
    if (concertAPlayCount >= concertAPlayLimit) {
      return
    }

    setPlayingConcertA(true)
    try {
      await playConcertA(2) // 2 second tone
      setConcertAPlayCount(prev => prev + 1)
    } catch (error) {
      console.error('Error playing Concert A:', error)
      alert('Failed to play Concert A. Please try again.')
    } finally {
      setPlayingConcertA(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    onChange({ file: selectedFile, musicXML: undefined, notes: undefined })
  }

  const handleRemoveFile = () => {
    setFile(null)
    onChange({ file: undefined, musicXML: undefined, notes: undefined })
  }

  const handleEditorChange = (notes: unknown[], musicXML: string) => {
    onChange({ musicXML, notes, file: undefined })
  }

  const canPlayConcertA = concertAPlayCount < concertAPlayLimit
  const playsRemaining = Math.max(0, concertAPlayLimit - concertAPlayCount)

  return (
    <div className="space-y-6">
      {/* Audio Player */}
      {audioFilePath && (
        <div className="border rounded-lg p-6 bg-gray-50">
          <div className="flex items-center justify-center mb-4">
            <Music className="h-8 w-8 text-blue-600" />
          </div>
          <audio
            ref={audioRef}
            controls
            className="w-full"
            src={lawData.audioUrl || api.getAudioUrl(audioFilePath)}
          >
            Your browser does not support the audio element.
          </audio>
          <p className="text-sm text-gray-600 text-center mt-2">
            Listen carefully and transcribe what you hear
          </p>
        </div>
      )}

      {/* Concert A Reference Tone */}
      <div className="border rounded-lg p-6 bg-blue-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full">
              <Music className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Concert A (440 Hz)</p>
              <p className="text-sm text-gray-600">
                {playsRemaining} / {concertAPlayLimit} plays remaining
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant={canPlayConcertA ? "default" : "outline"}
            disabled={!canPlayConcertA || playingConcertA}
            onClick={handleConcertAPlay}
          >
            <Play className="h-4 w-4 mr-2" />
            {playingConcertA ? 'Playing...' : canPlayConcertA ? 'Play Concert A' : 'Limit Reached'}
          </Button>
        </div>
        {!canPlayConcertA && (
          <p className="text-sm text-red-600 mt-2 text-center">
            You have reached the maximum number of Concert A plays for this question.
          </p>
        )}
      </div>

      {/* Submission Method Toggle */}
      <div className="space-y-3">
        <Label>Submission Method *</Label>
        <div className="flex space-x-4">
          <label className={`flex items-center space-x-2 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
            submissionMethod === 'editor' 
              ? 'border-blue-600 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}>
            <input
              type="radio"
              name="submissionMethod"
              checked={submissionMethod === 'editor'}
              onChange={() => setSubmissionMethod('editor')}
              className="w-5 h-5"
            />
            <span className="font-medium">Use Notation Editor</span>
          </label>
          <label className={`flex items-center space-x-2 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
            submissionMethod === 'upload' 
              ? 'border-blue-600 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}>
            <input
              type="radio"
              name="submissionMethod"
              checked={submissionMethod === 'upload'}
              onChange={() => setSubmissionMethod('upload')}
              className="w-5 h-5"
            />
            <span className="font-medium">Upload MusicXML File</span>
          </label>
        </div>
      </div>

      {/* Editor or Upload Section */}
      {submissionMethod === 'editor' ? (
        <div className="border rounded-lg p-4">
          <Label className="mb-3 block">Your Transcription:</Label>
          <NotationEditor
            initialNotes={value?.notes as any[] || []}
            onChange={handleEditorChange}
          />
          {value?.musicXML && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-800">
              ✓ Transcription saved as MusicXML
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <Label>Upload Your MusicXML File:</Label>
          {!file ? (
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <FileMusic className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-600 mb-3">Upload your transcribed score</p>
              <input
                type="file"
                accept=".xml,.musicxml,.mxl"
                onChange={handleFileChange}
                className="hidden"
                id="listen-write-upload"
              />
              <label htmlFor="listen-write-upload">
                <Button type="button" variant="outline" asChild>
                  <span>
                    <Upload className="h-4 w-4 mr-2" />
                    Choose MusicXML File
                  </span>
                </Button>
              </label>
              <p className="text-xs text-gray-500 mt-2">MusicXML (.xml, .musicxml, .mxl)</p>
            </div>
          ) : (
            <div className="border rounded-lg p-4 bg-blue-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FileMusic className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-gray-600">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
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
      )}
    </div>
  )
}
