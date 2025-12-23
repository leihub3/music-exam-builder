'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2, CheckCircle, Upload, X, Music, FileMusic } from 'lucide-react'
import { api } from '@/lib/api'

interface MultipleChoiceEditorProps {
  value: any
  onChange: (value: any) => void
}

export function MultipleChoiceEditor({ value, onChange }: MultipleChoiceEditorProps) {
  const options = value?.options || ['', '', '', '']
  const correctOptionIndex = value?.correctOptionIndex ?? 0
  const [uploadingAudio, setUploadingAudio] = useState(false)
  const [uploadingNotation, setUploadingNotation] = useState<{ [index: number]: boolean }>({})
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const notationUploadRefs = useRef<{ [index: number]: HTMLDivElement | null }>({})

  // Initialize option notation file paths array if it doesn't exist
  useEffect(() => {
    if (!value?.optionNotationFilePaths && options.length > 0) {
      onChange({
        ...value,
        optionNotationFilePaths: new Array(options.length).fill(null)
      })
    }
  }, [options.length])

  const optionNotationFilePaths = value?.optionNotationFilePaths || new Array(options.length).fill(null)

  const handleOptionChange = (index: number, text: string) => {
    const newOptions = [...options]
    newOptions[index] = text
    
    // Update optionNotationFilePaths to match new options array length
    const newNotationPaths = [...optionNotationFilePaths]
    while (newNotationPaths.length < newOptions.length) {
      newNotationPaths.push(null)
    }
    while (newNotationPaths.length > newOptions.length) {
      newNotationPaths.pop()
    }
    
    onChange({ 
      ...value, 
      options: newOptions,
      optionNotationFilePaths: newNotationPaths
    })
  }

  const handleAddOption = () => {
    const newOptions = [...options, '']
    const newNotationPaths = [...optionNotationFilePaths, null]
    onChange({ 
      ...value, 
      options: newOptions,
      optionNotationFilePaths: newNotationPaths
    })
  }

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) {
      alert('Must have at least 2 options')
      return
    }
    const newOptions = options.filter((_: any, i: number) => i !== index)
    const newNotationPaths = optionNotationFilePaths.filter((_: any, i: number) => i !== index)
    const newCorrectIndex = correctOptionIndex >= index && correctOptionIndex > 0 
      ? correctOptionIndex - 1 
      : correctOptionIndex
    onChange({ 
      ...value,
      options: newOptions,
      optionNotationFilePaths: newNotationPaths,
      correctOptionIndex: newCorrectIndex
    })
  }

  const handleSetCorrect = (index: number) => {
    onChange({ ...value, correctOptionIndex: index })
  }

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

  const handleNotationFileUpload = async (file: File, optionIndex: number) => {
    setUploadingNotation({ ...uploadingNotation, [optionIndex]: true })

    try {
      const response = await api.uploadNotation(file)
      const newNotationPaths = [...optionNotationFilePaths]
      newNotationPaths[optionIndex] = response.data.path
      
      onChange({
        ...value,
        optionNotationFilePaths: newNotationPaths
      })
    } catch (err) {
      console.error('Error uploading notation file:', err)
      alert('Failed to upload notation file')
    } finally {
      setUploadingNotation({ ...uploadingNotation, [optionIndex]: false })
    }
  }

  // Handle clipboard paste for images (per option)
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      // Find image in clipboard
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        
        if (item.type.indexOf('image') !== -1) {
          // Find which option's upload area is focused or active
          for (let optionIndex = 0; optionIndex < options.length; optionIndex++) {
            const uploadArea = notationUploadRefs.current[optionIndex]
            if (uploadArea && document.activeElement === uploadArea && !optionNotationFilePaths[optionIndex]) {
              e.preventDefault()
              const blob = item.getAsFile()
              if (blob) {
                const file = new File([blob], `pasted-image-option-${optionIndex}-${Date.now()}.png`, {
                  type: blob.type || 'image/png'
                })
                await handleNotationFileUpload(file, optionIndex)
              }
              break
            }
          }
          break
        }
      }
    }

    document.addEventListener('paste', handlePaste)
    
    return () => {
      document.removeEventListener('paste', handlePaste)
    }
  }, [optionNotationFilePaths, options.length])

  const handleNotationChange = async (e: React.ChangeEvent<HTMLInputElement>, optionIndex: number) => {
    const file = e.target.files?.[0]
    if (!file) return
    await handleNotationFileUpload(file, optionIndex)
  }

  const handleRemoveNotation = (optionIndex: number) => {
    const newNotationPaths = [...optionNotationFilePaths]
    newNotationPaths[optionIndex] = null
    
    onChange({
      ...value,
      optionNotationFilePaths: newNotationPaths
    })
  }

  return (
    <div className="space-y-6">
      {/* Audio File Upload (Required for Ear Training) */}
      <div className="space-y-2">
        <Label>Audio File * (Required - for Ear Training)</Label>
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

      {/* Answer Options with Notation Files */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Label>Answer Options * (Each option requires a notation file for Ear Training)</Label>
          <Button type="button" size="sm" variant="outline" onClick={handleAddOption}>
            <Plus className="h-4 w-4 mr-1" />
            Add Option
          </Button>
        </div>

        <div className="space-y-6">
          {options.map((option: string, index: number) => (
            <div key={index} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center space-x-2">
                <Button
                  type="button"
                  size="sm"
                  variant={correctOptionIndex === index ? 'default' : 'outline'}
                  onClick={() => handleSetCorrect(index)}
                  title="Mark as correct answer"
                >
                  <CheckCircle className="h-4 w-4" />
                </Button>
                <Input
                  placeholder={`Option ${index + 1}`}
                  value={option}
                  onChange={(e) => handleOptionChange(index, e.target.value)}
                  required
                  className="flex-1"
                />
                {options.length > 2 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleRemoveOption(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Notation File Upload for this Option */}
              <div className="space-y-2 pl-9">
                <Label className="text-sm">
                  Notation File * {correctOptionIndex === index && <span className="text-green-600">(Correct Answer)</span>}
                </Label>
                {!optionNotationFilePaths[index] ? (
                  <div 
                    ref={(el) => { notationUploadRefs.current[index] = el }}
                    className="border-2 border-dashed rounded-lg p-4 text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    tabIndex={0}
                    onFocus={(e) => {
                      e.currentTarget.focus()
                    }}
                  >
                    <FileMusic className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-600 mb-2">Upload notation for this option</p>
                    <input
                      type="file"
                      accept=".xml,.musicxml,.mxl,.pdf,.png,.jpg,.jpeg,.gif,.webp"
                      onChange={(e) => handleNotationChange(e, index)}
                      className="hidden"
                      id={`notation-upload-${index}`}
                      disabled={uploadingNotation[index]}
                    />
                    <label htmlFor={`notation-upload-${index}`}>
                      <Button type="button" variant="outline" size="sm" disabled={uploadingNotation[index]} asChild>
                        <span>
                          <Upload className="h-3 w-3 mr-1" />
                          {uploadingNotation[index] ? 'Uploading...' : 'Choose File'}
                        </span>
                      </Button>
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      Or paste image (Ctrl+V / Cmd+V)
                    </p>
                  </div>
                ) : (
                  <div className="border rounded-lg p-3 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <FileMusic className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="text-sm font-medium">Notation uploaded</p>
                          <p className="text-xs text-gray-500">{optionNotationFilePaths[index]}</p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveNotation(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <p className="text-sm text-gray-600">
          Click the checkmark to set the correct answer. Currently: Option {correctOptionIndex + 1}
        </p>
      </div>
    </div>
  )
}
