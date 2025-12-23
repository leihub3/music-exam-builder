'use client'

import { useEffect, useState, useRef } from 'react'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Upload, X, Music, FileMusic } from 'lucide-react'
import { api } from '@/lib/api'

interface TrueFalseEditorProps {
  value: any
  onChange: (value: any) => void
}

export function TrueFalseEditor({ value, onChange }: TrueFalseEditorProps) {
  const [uploadingAudio, setUploadingAudio] = useState(false)
  const [uploadingNotation, setUploadingNotation] = useState(false)
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [notationFile, setNotationFile] = useState<File | null>(null)
  const notationUploadRef = useRef<HTMLDivElement>(null)

  // Ensure correctAnswer is always set
  useEffect(() => {
    if (value?.correctAnswer === undefined) {
      onChange({ ...value, correctAnswer: true })
    }
  }, [])

  const correctAnswer = value?.correctAnswer ?? true

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

  const handleNotationFileUpload = async (file: File) => {
    setNotationFile(file)
    setUploadingNotation(true)

    try {
      const response = await api.uploadNotation(file)
      onChange({
        ...value,
        notationFilePath: response.data.path,
        notationUrl: response.data.url
      })
    } catch (err) {
      console.error('Error uploading notation file:', err)
      alert('Failed to upload notation file')
    } finally {
      setUploadingNotation(false)
    }
  }

  // Handle clipboard paste for images
  useEffect(() => {
    // Skip if notation file already exists
    if (value?.notationFilePath) return

    const handlePaste = async (e: ClipboardEvent) => {
      // Only handle if notation upload area exists and no file is currently set
      if (!notationUploadRef.current || value?.notationFilePath) return

      const items = e.clipboardData?.items
      if (!items) return

      // Find image in clipboard
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        
        if (item.type.indexOf('image') !== -1) {
          e.preventDefault()
          const blob = item.getAsFile()
          if (blob) {
            // Convert blob to File with a proper name
            const file = new File([blob], `pasted-image-${Date.now()}.png`, {
              type: blob.type || 'image/png'
            })
            // Upload the file directly (can't use handleNotationFileUpload due to closure)
            setNotationFile(file)
            setUploadingNotation(true)

            try {
              const response = await api.uploadNotation(file)
              onChange({
                ...value,
                notationFilePath: response.data.path,
                notationUrl: response.data.url
              })
            } catch (err) {
              console.error('Error uploading notation file:', err)
              alert('Failed to upload notation file')
            } finally {
              setUploadingNotation(false)
            }
          }
          break
        }
      }
    }

    // Add paste listener to document
    document.addEventListener('paste', handlePaste)
    
    return () => {
      document.removeEventListener('paste', handlePaste)
    }
  }, [value?.notationFilePath, value, onChange])

  const handleNotationChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    await handleNotationFileUpload(file)
  }

  const handleRemoveNotation = () => {
    setNotationFile(null)
    onChange({
      ...value,
      notationFilePath: undefined,
      notationUrl: undefined
    })
  }

  return (
    <div className="space-y-6">
      {/* Audio File Upload (for Ear Training) */}
      <div className="space-y-2">
        <Label>Audio File (Optional - for Ear Training)</Label>
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
                  <p className="text-xs text-gray-500">{value.audioFilePath}</p>
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
            {value.audioUrl && (
              <audio controls className="w-full mt-3" src={value.audioUrl}>
                Your browser does not support the audio element.
              </audio>
            )}
          </div>
        )}
      </div>

      {/* Notation File Upload (MusicXML, PDF, or Image) */}
      <div className="space-y-2">
        <Label>
          Notation File {value?.audioFilePath ? '* (Required)' : '(Optional - for Ear Training)'}
        </Label>
        <p className="text-xs text-gray-500 mb-2">
          Upload a score to display (MusicXML, PDF, or image) or paste from clipboard (Ctrl+V / Cmd+V)
          {value?.audioFilePath && (
            <span className="text-red-600 font-medium"> Required when audio file is provided</span>
          )}
        </p>
        {!value?.notationFilePath ? (
          <div 
            ref={notationUploadRef}
            className="border-2 border-dashed rounded-lg p-6 text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            tabIndex={0}
            onFocus={(e) => {
              // Make div focusable for paste events
              e.currentTarget.focus()
            }}
          >
            <FileMusic className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 mb-2">Upload a notation file or paste an image</p>
            <input
              type="file"
              accept=".xml,.musicxml,.mxl,.pdf,.png,.jpg,.jpeg,.gif,.webp"
              onChange={handleNotationChange}
              className="hidden"
              id="notation-upload"
              disabled={uploadingNotation}
            />
            <label htmlFor="notation-upload">
              <Button type="button" variant="outline" disabled={uploadingNotation} asChild>
                <span>
                  <Upload className="h-4 w-4 mr-2" />
                  {uploadingNotation ? 'Uploading...' : 'Choose Notation File'}
                </span>
              </Button>
            </label>
            <p className="text-xs text-gray-500 mt-2">
              MusicXML (.xml, .musicxml, .mxl), PDF (.pdf), or Image (.png, .jpg, .jpeg, .gif, .webp)
            </p>
            <p className="text-xs text-blue-600 mt-1 font-medium">
              💡 Tip: Paste an image from clipboard (Ctrl+V / Cmd+V)
            </p>
          </div>
        ) : (
          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FileMusic className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="font-medium">Notation file uploaded</p>
                  <p className="text-xs text-gray-500">{value.notationFilePath}</p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemoveNotation}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Correct Answer Selection */}
      <div className="space-y-4">
        <Label>Correct Answer *</Label>
        <div className="space-y-2">
          <label className="flex items-center space-x-3 p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="correctAnswer"
              checked={correctAnswer === true}
              onChange={() => onChange({ ...value, correctAnswer: true })}
            />
            <span className="font-medium">True</span>
          </label>
          <label className="flex items-center space-x-3 p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="correctAnswer"
              checked={correctAnswer === false}
              onChange={() => onChange({ ...value, correctAnswer: false })}
            />
            <span className="font-medium">False</span>
          </label>
        </div>
      </div>
    </div>
  )
}
