'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Upload, FileMusic, X, Edit3 } from 'lucide-react'
import { NotationEditor } from '@/components/notation/NotationEditor'
import { MusicXMLViewer } from '@/components/notation/MusicXMLViewer'
import { api } from '@/lib/api'
import JSZip from 'jszip'
import { COMMON_INSTRUMENTS } from '@music-exam-builder/shared/types'
import type { Question } from '@music-exam-builder/shared/types'

interface TranspositionAnswerProps {
  question: Question
  value: any
  onChange: (value: any) => void
}

export function TranspositionAnswer({ question, value, onChange }: TranspositionAnswerProps) {
  const [file, setFile] = useState<File | null>(value?.file || null)
  const [useEditor, setUseEditor] = useState(value?.musicXML ? true : false)
  const [musicXML, setMusicXML] = useState<string | null>(value?.musicXML || null)
  // Evaluation removed - only teachers can evaluate
  const [originalScoreXML, setOriginalScoreXML] = useState<string | null>(null)
  const [originalScoreIsImage, setOriginalScoreIsImage] = useState(false)
  const [loadingOriginalScore, setLoadingOriginalScore] = useState(false)
  
  // Get transposition data - can be from typeData or from backend structure
  const transpositionData = (() => {
    // Try backend structure first (transposition object)
    if ((question as any).transposition) {
      const trans = Array.isArray((question as any).transposition)
        ? (question as any).transposition[0]
        : (question as any).transposition;
      return {
        sourceInstrument: trans.source_instrument,
        targetInstrument: trans.target_instrument,
        notationFilePath: trans.notation_file_path,
        referenceAnswerPath: trans.reference_answer_path
      };
    }
    // Fallback to typeData
    return (question.typeData as any) || {};
  })();

  // Construct notation file URL
  const getNotationUrl = () => {
    if (transpositionData.notationUrl) return transpositionData.notationUrl;
    if (transpositionData.notationFilePath) {
      // Construct Supabase storage public URL
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (supabaseUrl && transpositionData.notationFilePath) {
        // Supabase public URL format: https://[project].supabase.co/storage/v1/object/public/[bucket]/[path]
        return `${supabaseUrl}/storage/v1/object/public/notation-files/${transpositionData.notationFilePath}`;
      }
    }
    return null;
  };

  const notationUrl = getNotationUrl();

  // Load original score MusicXML for display
  useEffect(() => {
    const loadOriginalScore = async () => {
      if (!transpositionData.notationFilePath || originalScoreXML) {
        console.log('Skipping load - no path or already loaded:', {
          hasPath: !!transpositionData.notationFilePath,
          hasXML: !!originalScoreXML
        })
        return
      }
      
      // Skip if it's a PDF (shouldn't happen with new validation, but handle gracefully)
      if (transpositionData.notationFilePath.toLowerCase().endsWith('.pdf')) {
        console.log('Skipping PDF file')
        setLoadingOriginalScore(false)
        return
      }

      console.log('Loading original score from:', transpositionData.notationFilePath)
      setLoadingOriginalScore(true)
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        if (!supabaseUrl) {
          console.error('No Supabase URL configured')
          setLoadingOriginalScore(false)
          return
        }

        const url = `${supabaseUrl}/storage/v1/object/public/notation-files/${transpositionData.notationFilePath}`
        console.log('Fetching from URL:', url)
        const response = await fetch(url)
        
        console.log('Response status:', response.status, response.statusText)
        
        if (response.ok) {
          const contentType = response.headers.get('content-type') || ''
          const fileName = transpositionData.notationFilePath.toLowerCase()
          console.log('Content-Type:', contentType)
          console.log('File name:', fileName)
          
          // Check if it's an image file
          const isImageFile = contentType.startsWith('image/') || 
                             fileName.match(/\.(png|jpg|jpeg|gif|webp)(\?|$)/i) !== null
          
          if (isImageFile) {
            // For images, store the URL directly
            console.log('File is an image, storing URL directly')
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
            const imageUrl = `${supabaseUrl}/storage/v1/object/public/notation-files/${transpositionData.notationFilePath}`
            setOriginalScoreXML(imageUrl)
            setOriginalScoreIsImage(true)
            setLoadingOriginalScore(false)
            return
          }
          
          // Check if file extension suggests MXL (compressed)
          const isMxlExtension = fileName.endsWith('.mxl')
          
          // Read as array buffer first to check if it's actually a ZIP
          const arrayBuffer = await response.arrayBuffer()
          
          // Check if it's a ZIP file by checking the magic bytes (PK = 0x50 0x4B)
          const bytes = new Uint8Array(arrayBuffer)
          const isZipFile = bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4B
          
          let fileContent: string
          
          if (isZipFile) {
            console.log('File is ZIP/MXL format, extracting...')
            try {
              const zip = await JSZip.loadAsync(arrayBuffer)
              console.log('MXL file loaded, extracting XML...')
              
              // First check for container.xml to find the main file
              let scoreFile: JSZip.JSZipObject | null = null
              if (zip.files['META-INF/container.xml']) {
                const containerXML = await zip.files['META-INF/container.xml'].async('string')
                const parser = new DOMParser()
                const containerDoc = parser.parseFromString(containerXML, 'text/xml')
                const rootFileEl = containerDoc.querySelector('rootfile')
                if (rootFileEl) {
                  const fullPath = rootFileEl.getAttribute('full-path')
                  if (fullPath && zip.files[fullPath]) {
                    scoreFile = zip.files[fullPath]
                    console.log('Found score file from container:', fullPath)
                  }
                }
              }
              
              // If no container.xml, try common names
              if (!scoreFile) {
                if (zip.files['score.xml']) {
                  scoreFile = zip.files['score.xml']
                  console.log('Found score.xml directly')
                } else {
                  // Find first .xml file
                  for (const filename in zip.files) {
                    if (filename.endsWith('.xml') && !filename.includes('META-INF')) {
                      scoreFile = zip.files[filename]
                      console.log('Found XML file:', filename)
                      break
                    }
                  }
                }
              }
              
              if (scoreFile) {
                fileContent = await scoreFile.async('string')
                console.log('Extracted MusicXML from MXL, length:', fileContent.length)
              } else {
                throw new Error('No score.xml found in MXL file')
              }
            } catch (zipError) {
              console.error('Error extracting MXL:', zipError)
              // If extraction fails, try to decode as UTF-8 text
              const decoder = new TextDecoder('utf-8')
              fileContent = decoder.decode(arrayBuffer)
              console.log('Fallback: decoded as UTF-8, length:', fileContent.length)
            }
          } else {
            // Not a ZIP file, decode as UTF-8 text
            console.log('File is plain XML, decoding as text')
            const decoder = new TextDecoder('utf-8')
            fileContent = decoder.decode(arrayBuffer)
            console.log('Text file loaded, length:', fileContent.length)
            console.log('First 200 chars:', fileContent.substring(0, 200))
          }
          
          // Check if it's actually MusicXML (not PDF)
          if (fileContent.trim().startsWith('%PDF')) {
            console.error('File is PDF, not MusicXML')
            setLoadingOriginalScore(false)
            return
          }
          
          console.log('Setting original score XML, length:', fileContent.length)
          setOriginalScoreXML(fileContent)
          setOriginalScoreIsImage(false)
        } else {
          console.error('Failed to fetch file:', response.status, response.statusText)
          const errorText = await response.text()
          console.error('Error response:', errorText)
        }
      } catch (error) {
        console.error('Error loading original score:', error)
      } finally {
        setLoadingOriginalScore(false)
        console.log('Finished loading, loading state set to false')
      }
    }

    loadOriginalScore()
  }, [transpositionData.notationFilePath])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      onChange({ ...value, file: selectedFile, fileName: selectedFile.name })
    }
  }

  const handleRemoveFile = () => {
    setFile(null)
    onChange({ ...value, file: null, fileName: null })
  }


  return (
    <div className="space-y-6">
      {/* Display Transposition Instructions and Original Score */}
      <div className="border rounded-lg p-6 bg-gray-50 space-y-4">
        {/* Transposition Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-lg mb-3 text-gray-900">Transposition Instructions:</h3>
          <div className="grid grid-cols-2 gap-4 text-base">
            <div>
              <p className="text-sm text-gray-600 mb-1">From (Original Instrument):</p>
              <p className="font-semibold text-gray-900">{transpositionData.sourceInstrument || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">To (Target Instrument):</p>
              <p className="font-semibold text-gray-900">{transpositionData.targetInstrument || 'N/A'}</p>
            </div>
          </div>
          <p className="text-sm text-gray-700 mt-3 pt-3 border-t border-blue-200">
            <strong>Task:</strong> Transpose the score below from <strong>{transpositionData.sourceInstrument || 'the source instrument'}</strong> to <strong>{transpositionData.targetInstrument || 'the target instrument'}</strong>.
          </p>
        </div>

        {/* Original Score Display */}
        {transpositionData.notationFilePath && (
          <div>
            <h3 className="font-semibold text-lg mb-3 text-gray-900">Original Score:</h3>
            
            {loadingOriginalScore ? (
              <div className="border rounded bg-white p-8 text-center">
                <p className="text-sm text-gray-600">Loading score...</p>
              </div>
            ) : originalScoreXML ? (
              <div className="border rounded bg-white p-4">
                <MusicXMLViewer 
                  musicXML={originalScoreXML} 
                  width={800}
                  height={300}
                  className="w-full"
                  isImage={originalScoreIsImage}
                />
              </div>
            ) : (
              <div className="p-4 bg-white rounded border">
                <p className="text-sm text-gray-600">Notation file: {transpositionData.notationFilePath}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {transpositionData.notationFilePath.toLowerCase().endsWith('.pdf') 
                    ? 'PDF files are not supported. Please contact the teacher to upload a MusicXML file.'
                    : 'Loading score...'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Transposition Input */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold">Your Transposition:</h3>
          <div className="flex space-x-2">
            <Button
              type="button"
              variant={useEditor ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setUseEditor(true)
                setFile(null)
                onChange({ ...value, file: null, fileName: null, musicXML: musicXML })
              }}
            >
              <Edit3 className="h-4 w-4 mr-1" />
              Use Editor
            </Button>
            <Button
              type="button"
              variant={!useEditor ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setUseEditor(false)
                setMusicXML(null)
                onChange({ ...value, musicXML: null })
              }}
            >
              <Upload className="h-4 w-4 mr-1" />
              Upload File
            </Button>
          </div>
        </div>

        {useEditor ? (
          <div className="border rounded-lg p-4">
            <NotationEditor
              clef={transpositionData.targetInstrument?.includes('Bass') || 
                    transpositionData.targetInstrument?.includes('Cello') ||
                    transpositionData.targetInstrument?.includes('Trombone')
                    ? 'bass' : 'treble'}
              onChange={(notes, xml) => {
                setMusicXML(xml || null)
                onChange({
                  ...value,
                  musicXML: xml || null,
                  notes: notes,
                  fileName: xml ? 'transposition.musicxml' : null
                })
              }}
            />
            {musicXML && (
              <div className="mt-4">
                <div className="p-3 bg-green-50 border border-green-200 rounded text-sm text-green-800">
                  ✓ Partitura guardada como MusicXML
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-600">
              Upload your transposed score (PDF or MusicXML)
            </p>

            {!file ? (
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <FileMusic className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-600 mb-3">Upload your transposed score</p>
                <input
                  type="file"
                  accept=".pdf,.xml,.musicxml,.mxl"
                  onChange={handleFileChange}
                  className="hidden"
                  id="transposition-upload"
                />
                <label htmlFor="transposition-upload">
                  <Button type="button" variant="outline" asChild>
                    <span>
                      <Upload className="h-4 w-4 mr-2" />
                      Choose File
                    </span>
                  </Button>
                </label>
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
          </>
        )}
      </div>

    </div>
  )
}

