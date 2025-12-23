'use client'

import { useState, useEffect } from 'react'
import { Play } from 'lucide-react'
import { MusicXMLViewer } from '@/components/notation/MusicXMLViewer'
import { api } from '@/lib/api'
import JSZip from 'jszip'
import type { Question } from '@music-exam-builder/shared/types'

interface TrueFalseAnswerProps {
  question: Question
  value: any
  onChange: (value: any) => void
}

export function TrueFalseAnswer({ question, value, onChange }: TrueFalseAnswerProps) {
  const [notationXML, setNotationXML] = useState<string | null>(null)
  const [notationIsImage, setNotationIsImage] = useState(false)
  const [notationImageUrl, setNotationImageUrl] = useState<string | null>(null)
  const [loadingNotation, setLoadingNotation] = useState(false)
  const [notationFilePath, setNotationFilePath] = useState<string | null>(null)
  const [notationIsPDF, setNotationIsPDF] = useState(false)

  // Get True/False data - handle both typeData and backend structure
  const tfData = (() => {
    if ((question as any).true_false) {
      const data = Array.isArray((question as any).true_false)
        ? (question as any).true_false[0]
        : (question as any).true_false
      return {
        audioFilePath: data.audio_file_path,
        notationFilePath: data.notation_file_path,
        audioUrl: data.audio_file_path ? (() => {
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
          if (supabaseUrl) {
            return `${supabaseUrl}/storage/v1/object/public/audio-files/${data.audio_file_path}`
          }
          return null
        })() : null,
        notationUrl: data.notation_file_path ? (() => {
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
          if (supabaseUrl) {
            return `${supabaseUrl}/storage/v1/object/public/notation-files/${data.notation_file_path}`
          }
          return null
        })() : null,
      }
    }
    return (question.typeData as any) || {}
  })()

  // Load notation file
  useEffect(() => {
    const loadNotation = async () => {
      const filePath = tfData.notationFilePath
      if (!filePath) {
        setLoadingNotation(false)
        return
      }

      setNotationFilePath(filePath)
      setLoadingNotation(true)

      try {
        let url = tfData.notationUrl
        if (!url && tfData.notationFilePath) {
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
          if (supabaseUrl) {
            url = `${supabaseUrl}/storage/v1/object/public/notation-files/${tfData.notationFilePath}`
          }
        }

        if (!url) {
          setLoadingNotation(false)
          return
        }

        // Check file extension
        const fileExt = filePath.toLowerCase().split('.').pop() || ''
        const isPDF = fileExt === 'pdf'
        const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(fileExt)
        const isMXL = fileExt === 'mxl'

        setNotationIsPDF(isPDF)

        if (isPDF) {
          setLoadingNotation(false)
          return // PDF will be handled by embed tag
        }

        if (isImage) {
          setNotationIsImage(true)
          setNotationImageUrl(url)
          setLoadingNotation(false)
          return
        }

        // For MusicXML/MXL files
        const response = await fetch(url)
        if (!response.ok) {
          throw new Error(`Failed to load file: ${response.statusText}`)
        }

        const contentType = response.headers.get('content-type') || ''

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
          setNotationXML(xml)
        } else {
          const text = await response.text()
          if (text.trim().startsWith('%PDF')) {
            setNotationIsPDF(true)
          } else {
            setNotationXML(text)
          }
        }

        setNotationIsImage(false)
      } catch (error: any) {
        console.error('Error loading notation file:', error)
        setNotationXML(null)
      } finally {
        setLoadingNotation(false)
      }
    }

    loadNotation()
  }, [tfData.notationFilePath, tfData.notationUrl])

  return (
    <div className="space-y-6">
      {/* Audio Player */}
      {tfData.audioFilePath && (
        <div className="border rounded-lg p-6 bg-gray-50">
          <div className="flex items-center justify-center mb-4">
            <Play className="h-8 w-8 text-blue-600" />
          </div>
          <audio
            controls
            className="w-full"
            src={tfData.audioUrl || (() => {
              const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
              if (supabaseUrl && tfData.audioFilePath) {
                return `${supabaseUrl}/storage/v1/object/public/audio-files/${tfData.audioFilePath}`
              }
              return ''
            })()}
          >
            Your browser does not support the audio element.
          </audio>
          <p className="text-sm text-gray-600 text-center mt-2">
            Listen carefully and compare with the score below
          </p>
        </div>
      )}

      {/* Notation Display */}
      {notationFilePath && (
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-3 text-gray-900">Score:</h3>
          
          {loadingNotation ? (
            <div className="border rounded bg-white p-8 text-center">
              <p className="text-sm text-gray-600">Loading score...</p>
            </div>
          ) : notationIsPDF ? (
            <div className="border rounded bg-white p-4">
              <embed
                src={tfData.notationUrl || `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/notation-files/${tfData.notationFilePath}`}
                type="application/pdf"
                width="100%"
                height="500px"
              />
            </div>
          ) : notationIsImage && notationImageUrl ? (
            <div className="border rounded bg-white p-4">
              <img
                src={notationImageUrl}
                alt="Score"
                className="w-full h-auto"
              />
            </div>
          ) : notationXML ? (
            <div className="border rounded bg-white p-4">
              <MusicXMLViewer
                musicXML={notationXML}
                width={800}
                height={300}
                className="w-full"
              />
            </div>
          ) : (
            <div className="p-4 bg-gray-50 rounded border">
              <p className="text-sm text-gray-600">Unable to load notation file</p>
            </div>
          )}
        </div>
      )}

      {/* True/False Selection */}
      <div className="space-y-3">
        <p className="font-medium text-gray-900">Is the displayed score correct?</p>
        <label className={`flex items-center space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
          value?.value === true ? 'border-blue-600 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        }`}>
          <input
            type="radio"
            name="answer"
            checked={value?.value === true}
            onChange={() => onChange({ value: true })}
            className="w-5 h-5"
          />
          <span className="text-lg font-medium">True</span>
        </label>
        
        <label className={`flex items-center space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
          value?.value === false ? 'border-blue-600 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        }`}>
          <input
            type="radio"
            name="answer"
            checked={value?.value === false}
            onChange={() => onChange({ value: false })}
            className="w-5 h-5"
          />
          <span className="text-lg font-medium">False</span>
        </label>
      </div>
    </div>
  )
}
