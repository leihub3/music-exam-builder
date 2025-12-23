'use client'

import { useState, useEffect } from 'react'
import { Play } from 'lucide-react'
import { MusicXMLViewer } from '@/components/notation/MusicXMLViewer'
import { api } from '@/lib/api'
import JSZip from 'jszip'
import type { Question, QuestionBackendResponse, MultipleChoiceQuestionData } from '@music-exam-builder/shared/types'

interface AnswerValue {
  selectedIndex?: number;
  selectedOption?: string;
}

interface MultipleChoiceAnswerProps {
  question: Question
  value?: AnswerValue
  onChange: (value: AnswerValue) => void
}

interface OptionNotationData {
  xml: string | null
  isImage: boolean
  imageUrl: string | null
  isPDF: boolean
  isLoading: boolean
  filePath: string | null
}

export function MultipleChoiceAnswer({ question, value, onChange }: MultipleChoiceAnswerProps) {
  const [optionNotations, setOptionNotations] = useState<{ [index: number]: OptionNotationData }>({})

  // Get Multiple Choice data - handle both typeData and backend structure
  const questionBackend = question as QuestionBackendResponse
  const mcData = (() => {
    if (questionBackend.multiple_choice) {
      const mcDataRaw = questionBackend.multiple_choice
      const data = Array.isArray(mcDataRaw)
        ? mcDataRaw[0]
        : mcDataRaw
      return {
        options: Array.isArray(data.options) ? data.options : (data.options || []),
        audioFilePath: data.audio_file_path,
        optionNotationFilePaths: data.option_notation_file_paths || [],
        audioUrl: data.audio_file_path ? (() => {
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
          if (supabaseUrl) {
            return `${supabaseUrl}/storage/v1/object/public/audio-files/${data.audio_file_path}`
          }
          return null
        })() : null,
      }
    }
    return (question.typeData as MultipleChoiceQuestionData) || {}
  })()

  const options = mcData.options || (question.typeData as MultipleChoiceQuestionData)?.options || []
  const optionNotationFilePaths = mcData.optionNotationFilePaths || (question.typeData as MultipleChoiceQuestionData)?.optionNotationFilePaths || []

  // Load notation files for each option
  useEffect(() => {
    const loadNotationForOption = async (optionIndex: number, filePath: string) => {
      if (!filePath) return

      // Initialize loading state
      setOptionNotations(prev => ({
        ...prev,
        [optionIndex]: {
          xml: null,
          isImage: false,
          imageUrl: null,
          isPDF: false,
          isLoading: true,
          filePath: filePath
        }
      }))

      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        if (!supabaseUrl) {
          throw new Error('Supabase URL not configured')
        }

        const url = `${supabaseUrl}/storage/v1/object/public/notation-files/${filePath}`
        
        // Check file extension
        const fileExt = filePath.toLowerCase().split('.').pop() || ''
        const isPDF = fileExt === 'pdf'
        const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(fileExt)
        const isMXL = fileExt === 'mxl'

        if (isPDF) {
          setOptionNotations(prev => ({
            ...prev,
            [optionIndex]: {
              xml: null,
              isImage: false,
              imageUrl: null,
              isPDF: true,
              isLoading: false,
              filePath: filePath
            }
          }))
          return
        }

        if (isImage) {
          setOptionNotations(prev => ({
            ...prev,
            [optionIndex]: {
              xml: null,
              isImage: true,
              imageUrl: url,
              isPDF: false,
              isLoading: false,
              filePath: filePath
            }
          }))
          return
        }

        // For MusicXML/MXL files
        const response = await fetch(url)
        if (!response.ok) {
          throw new Error(`Failed to load file: ${response.statusText}`)
        }

        if (isMXL) {
          const arrayBuffer = await response.arrayBuffer()
          const zip = await JSZip.loadAsync(arrayBuffer)
          let xmlFile = zip.file('META-INF/container.xml')
          if (xmlFile) {
            const containerContent = await xmlFile.async('text')
            const parser = new DOMParser()
            const containerDoc = parser.parseFromString(containerContent, 'text/xml')
            const rootFileEl = containerDoc.querySelector('rootfile[media-type="application/vnd.recordare.musicxml+xml"]')
            if (rootFileEl) {
              const xmlPath = rootFileEl.getAttribute('full-path') || 'score.xml'
              xmlFile = zip.file(xmlPath)
            }
          }
          if (!xmlFile) {
            xmlFile = zip.file('score.xml') || zip.file('music.xml') ||
                     Object.keys(zip.files).find(f => f.endsWith('.xml') && zip.file(f))
                     ? zip.file(Object.keys(zip.files).find(f => f.endsWith('.xml'))!)
                     : null
          }
          if (!xmlFile) {
            throw new Error('No XML file found in MXL archive')
          }
          const xml = await xmlFile.async('text')
          
          setOptionNotations(prev => ({
            ...prev,
            [optionIndex]: {
              xml: xml,
              isImage: false,
              imageUrl: null,
              isPDF: false,
              isLoading: false,
              filePath: filePath
            }
          }))
        } else {
          const text = await response.text()
          if (text.trim().startsWith('%PDF')) {
            setOptionNotations(prev => ({
              ...prev,
              [optionIndex]: {
                xml: null,
                isImage: false,
                imageUrl: null,
                isPDF: true,
                isLoading: false,
                filePath: filePath
              }
            }))
          } else {
            setOptionNotations(prev => ({
              ...prev,
              [optionIndex]: {
                xml: text,
                isImage: false,
                imageUrl: null,
                isPDF: false,
                isLoading: false,
                filePath: filePath
              }
            }))
          }
        }
      } catch (error: unknown) {
        console.error(`Error loading notation for option ${optionIndex}:`, error)
        setOptionNotations(prev => ({
          ...prev,
          [optionIndex]: {
            xml: null,
            isImage: false,
            imageUrl: null,
            isPDF: false,
            isLoading: false,
            filePath: filePath
          }
        }))
      }
    }

    // Load notation for each option that has a file path
    optionNotationFilePaths.forEach((filePath: string | null, index: number) => {
      if (filePath) {
        loadNotationForOption(index, filePath)
      }
    })
  }, [optionNotationFilePaths])

  return (
    <div className="space-y-6">
      {/* Audio Player */}
      {mcData.audioFilePath && (
        <div className="border rounded-lg p-6 bg-gray-50">
          <div className="flex items-center justify-center mb-4">
            <Play className="h-8 w-8 text-blue-600" />
          </div>
          <audio
            controls
            className="w-full"
            src={mcData.audioUrl || api.getAudioUrl(mcData.audioFilePath)}
          >
            Your browser does not support the audio element.
          </audio>
          <p className="text-sm text-gray-600 text-center mt-2">
            Listen carefully and select the option that matches the audio
          </p>
        </div>
      )}

      {/* Multiple Choice Options with Notation */}
      <div className="space-y-4">
        {options.map((option: string, index: number) => {
          const notation = optionNotations[index]
          const notationFilePath = optionNotationFilePaths[index]
          
          return (
            <div key={index}>
              <label
                className={`flex flex-col space-y-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  value?.selectedIndex === index 
                    ? 'border-blue-600 bg-blue-50' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <input
                    type="radio"
                    name="answer"
                    checked={value?.selectedIndex === index}
                    onChange={() => onChange({ selectedIndex: index, selectedOption: option })}
                    className="w-5 h-5 mt-0.5"
                  />
                  <div className="flex-1">
                    <span className="text-lg font-medium block mb-2">{option || `Option ${index + 1}`}</span>
                    
                    {/* Notation Display for this Option */}
                    {notationFilePath && (
                      <div className="border rounded bg-white p-3 mt-2">
                        {notation?.isLoading ? (
                          <div className="p-4 text-center">
                            <p className="text-sm text-gray-600">Loading score...</p>
                          </div>
                        ) : notation?.isPDF ? (
                          <embed
                            src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/notation-files/${notationFilePath}`}
                            type="application/pdf"
                            width="100%"
                            height="400px"
                          />
                        ) : notation?.isImage && notation?.imageUrl ? (
                          <img
                            src={notation.imageUrl}
                            alt={`Score for option ${index + 1}`}
                            className="w-full h-auto"
                          />
                        ) : notation?.xml ? (
                          <MusicXMLViewer
                            musicXML={notation.xml}
                            width={800}
                            height={250}
                            className="w-full"
                          />
                        ) : (
                          <div className="p-4 bg-gray-50 rounded border">
                            <p className="text-sm text-gray-600">Unable to load notation file</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </label>
            </div>
          )
        })}
      </div>
    </div>
  )
}
