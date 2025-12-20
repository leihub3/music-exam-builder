'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Upload, FileMusic, X, Edit3, Maximize2 } from 'lucide-react'
import { api } from '@/lib/api'
import { COMMON_INSTRUMENTS } from '@music-exam-builder/shared/types'
import { MusicXMLViewer } from '@/components/notation/MusicXMLViewer'
import { NotationEditor } from '@/components/notation/NotationEditor'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import JSZip from 'jszip'

interface TranspositionEditorProps {
  value: any
  onChange: (value: any) => void
}

export function TranspositionEditor({ value, onChange }: TranspositionEditorProps) {
  const [uploading, setUploading] = useState(false)
  const [notationXML, setNotationXML] = useState<string | null>(null)
  const [loadingNotationXML, setLoadingNotationXML] = useState(false)
  const [referenceXML, setReferenceXML] = useState<string | null>(null)
  const [loadingReferenceXML, setLoadingReferenceXML] = useState(false)
  const [useEditorForReference, setUseEditorForReference] = useState<boolean>(value?.referenceAnswerMusicXML ? true : false)
  const [referenceAnswerMusicXML, setReferenceAnswerMusicXML] = useState<string | null>(value?.referenceAnswerMusicXML || null)
  const [unsavedReferenceMusicXML, setUnsavedReferenceMusicXML] = useState<string | null>(null)
  const [uploadingReferenceXML, setUploadingReferenceXML] = useState(false)
  const [editorModalOpen, setEditorModalOpen] = useState(false)
  const [editorMusicXML, setEditorMusicXML] = useState<string | null>(null) // Current content in editor
  const [parsedNotes, setParsedNotes] = useState<any[]>([]) // Parsed notes from MusicXML
  const [parsedMetadata, setParsedMetadata] = useState<{ clef: string, keySignature: string, timeSignature: string, measureCount: number } | null>(null)

  // Parse MusicXML to notes format for NotationEditor
  const parseMusicXMLToNotes = (musicXML: string): { notes: any[], clef: string, keySignature: string, timeSignature: string, measureCount: number } => {
    try {
      const parser = new DOMParser()
      const xmlDoc = parser.parseFromString(musicXML, 'text/xml')
      
      const parserError = xmlDoc.querySelector('parsererror')
      if (parserError) {
        console.error('Error parsing MusicXML:', parserError.textContent)
        return { notes: [], clef: 'treble', keySignature: 'C', timeSignature: '4/4', measureCount: 1 }
      }

      const part = xmlDoc.querySelector('part') || xmlDoc.querySelector('score-partwise part') || xmlDoc
      const measures = Array.from(part.querySelectorAll('measure'))
      
      if (measures.length === 0) {
        return { notes: [], clef: 'treble', keySignature: 'C', timeSignature: '4/4', measureCount: 1 }
      }

      // Parse attributes from first measure
      const firstMeasure = measures[0]
      const attributes = firstMeasure.querySelector('attributes')
      let clef = 'treble'
      let keySignature = 'C'
      let timeSignature = '4/4'

      if (attributes) {
        const clefEl = attributes.querySelector('clef')
        if (clefEl) {
          const sign = clefEl.querySelector('sign')?.textContent || 'G'
          const line = clefEl.querySelector('line')?.textContent || '2'
          if (sign === 'G') clef = 'treble'
          else if (sign === 'F') clef = 'bass'
          else if (sign === 'C' && line === '3') clef = 'alto'
          else if (sign === 'C' && line === '4') clef = 'tenor'
        }

        const keyEl = attributes.querySelector('key')
        if (keyEl) {
          const fifths = parseInt(keyEl.querySelector('fifths')?.textContent || '0')
          const keyMap: Record<string, string> = {
            '0': 'C', '1': 'G', '2': 'D', '3': 'A', '4': 'E', '5': 'B', '6': 'F#', '7': 'C#',
            '-1': 'F', '-2': 'Bb', '-3': 'Eb', '-4': 'Ab', '-5': 'Db', '-6': 'Gb', '-7': 'Cb'
          }
          keySignature = keyMap[fifths.toString()] || 'C'
        }

        const timeEl = attributes.querySelector('time')
        if (timeEl) {
          const beats = timeEl.querySelector('beats')?.textContent || '4'
          const beatType = timeEl.querySelector('beat-type')?.textContent || '4'
          timeSignature = `${beats}/${beatType}`
        }
      }

      // Parse notes from all measures
      const notes: any[] = []
      console.log('Parsing', measures.length, 'measures')
      measures.forEach((measure, measureIndex) => {
        const measureNotes = measure.querySelectorAll('note')
        console.log(`Measure ${measureIndex}: ${measureNotes.length} notes`)
        measureNotes.forEach((noteEl, noteIndex) => {
          const rest = noteEl.querySelector('rest')
          const pitchEl = noteEl.querySelector('pitch')
          
          let pitch = 'rest'
          let accidental: '#' | 'b' | 'n' | null = null
          
          if (!rest && pitchEl) {
            const step = pitchEl.querySelector('step')?.textContent || 'C'
            const octave = pitchEl.querySelector('octave')?.textContent || '4'
            const alterEl = pitchEl.querySelector('alter')
            if (alterEl) {
              const alter = parseInt(alterEl.textContent || '0')
              if (alter === 1) accidental = '#'
              else if (alter === -1) accidental = 'b'
              else if (alter === 0) accidental = 'n'
            }
            pitch = `${step}/${octave}`
          }

          const durationEl = noteEl.querySelector('duration')
          const typeEl = noteEl.querySelector('type')
          const dotEl = noteEl.querySelector('dot')
          let duration = 'q' // default quarter
          const dot = dotEl !== null // Check if dot element exists
          
          if (typeEl) {
            const type = typeEl.textContent || 'quarter'
            const durationMap: Record<string, string> = {
              'whole': 'w', 'half': 'h', 'quarter': 'q', 'eighth': '8', '16th': '16'
            }
            duration = durationMap[type] || 'q'
          }

          // Parse articulations
          let articulation: 'staccato' | 'accent' | 'tenuto' | 'staccatissimo' | 'marcato' | null = null
          const notationsEl = noteEl.querySelector('notations')
          if (notationsEl) {
            const articulationsEl = notationsEl.querySelector('articulations')
            if (articulationsEl) {
              if (articulationsEl.querySelector('staccato')) articulation = 'staccato'
              else if (articulationsEl.querySelector('accent')) articulation = 'accent'
              else if (articulationsEl.querySelector('tenuto')) articulation = 'tenuto'
              else if (articulationsEl.querySelector('staccatissimo')) articulation = 'staccatissimo'
              else if (articulationsEl.querySelector('strong-accent')) articulation = 'marcato'
            }
          }

          // Parse ties
          const tieStart = noteEl.querySelector('tie[type="start"]') || noteEl.querySelector('tied[type="start"]')
          const tieEnd = noteEl.querySelector('tie[type="stop"]') || noteEl.querySelector('tied[type="stop"]')

          // Parse slurs
          const slurStart = noteEl.querySelector('slur[type="start"]')
          const slurEnd = noteEl.querySelector('slur[type="stop"]')

          notes.push({
            id: `note-${measureIndex}-${noteIndex}-${Date.now()}`,
            pitch,
            duration,
            accidental,
            dot,
            stave: 0,
            x: notes.length,
            measure: measureIndex,
            isRest: !!rest,
            articulation,
            tieStart: !!tieStart,
            tieEnd: !!tieEnd,
            tieId: (tieStart || tieEnd) ? `tie-${measureIndex}-${noteIndex}` : undefined,
            slurStart: !!slurStart,
            slurEnd: !!slurEnd,
            slurId: (slurStart || slurEnd) ? `slur-${measureIndex}-${noteIndex}` : undefined,
          })
        })
      })

      return { 
        notes, 
        clef: clef as 'treble' | 'bass' | 'alto' | 'tenor',
        keySignature,
        timeSignature,
        measureCount: measures.length
      }
    } catch (error) {
      console.error('Error parsing MusicXML:', error)
      return { notes: [], clef: 'treble', keySignature: 'C', timeSignature: '4/4', measureCount: 1 }
    }
  }

  const handleFileUpload = async (file: File) => {
    // Validate file type - accept MusicXML files and images
    const fileName = file.name.toLowerCase()
    const isValidMusicXML = fileName.endsWith('.xml') || 
                           fileName.endsWith('.musicxml') || 
                           fileName.endsWith('.mxl') ||
                           file.type === 'application/xml' ||
                           file.type === 'text/xml' ||
                           file.type === 'application/vnd.recordare.musicxml+xml' ||
                           file.type === 'application/vnd.recordare.musicxml'

    // Also allow image files (for pasted images)
    const isImage = file.type.startsWith('image/') || 
                    fileName.endsWith('.png') || 
                    fileName.endsWith('.jpg') || 
                    fileName.endsWith('.jpeg') || 
                    fileName.endsWith('.gif') || 
                    fileName.endsWith('.webp')

    if (!isValidMusicXML && !isImage) {
      alert('Please upload a MusicXML file (.xml, .musicxml, or .mxl) or an image file. PDF files are not supported for transposition questions.')
      return
    }

    setUploading(true)

    try {
      const response = await api.uploadNotation(file)
      onChange({
        ...value,
        notationFilePath: response.data.path,
        notationUrl: response.data.url
      })
    } catch (err) {
      console.error('Error uploading file:', err)
      alert('Failed to upload file')
    } finally {
      setUploading(false)
    }
  }

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    await handleFileUpload(file)
    e.target.value = '' // Reset input
  }

  // Handle paste event for images
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      // Only handle paste if we're in the upload area and no file is uploaded yet
      if (value?.notationFilePath || uploading) return

      const items = e.clipboardData?.items
      if (!items) return

      // Look for image in clipboard
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        
        // Check if it's an image
        if (item.type.indexOf('image') !== -1) {
          e.preventDefault()
          
          const blob = item.getAsFile()
          if (!blob) continue

          // Convert blob to File with a name
          const fileExtension = blob.type.split('/')[1] || 'png'
          const fileName = `pasted-image-${Date.now()}.${fileExtension}`
          const file = new File([blob], fileName, { type: blob.type })

          await handleFileUpload(file)
          break
        }
      }
    }

    // Add paste event listener to document
    document.addEventListener('paste', handlePaste)
    
    return () => {
      document.removeEventListener('paste', handlePaste)
    }
  }, [value?.notationFilePath, uploading])

  const handleRemoveFile = () => {
    onChange({
      ...value,
      notationFilePath: undefined,
      notationUrl: undefined
    })
  }

  const instruments = Object.keys(COMMON_INSTRUMENTS)

  // Load and display notation file preview
  useEffect(() => {
    const loadNotationFile = async () => {
      if (!value?.notationFilePath && !value?.notationUrl) {
        setNotationXML(null)
        return
      }

      setLoadingNotationXML(true)
      try {
        let url = value.notationUrl
        if (!url && value.notationFilePath) {
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
          if (supabaseUrl) {
            url = `${supabaseUrl}/storage/v1/object/public/notation-files/${value.notationFilePath}`
          }
        }

        if (!url) {
          setLoadingNotationXML(false)
          return
        }

        console.log('Loading notation file from:', url)
        const response = await fetch(url)
        
        if (!response.ok) {
          throw new Error(`Failed to load file: ${response.statusText}`)
        }

        const contentType = response.headers.get('content-type') || ''
        const fileName = value.notationFilePath || url
        
        // Check if it's an image
        const isImage = contentType.startsWith('image/') || 
                       fileName.toLowerCase().match(/\.(png|jpg|jpeg|gif|webp)(\?|$)/i)
        
        if (isImage) {
          // For images, just store the URL
          setNotationXML(url)
          setLoadingNotationXML(false)
          return
        }
        
        // Check if it's a ZIP file (MXL) by extension or content type
        const isZip = fileName.toLowerCase().endsWith('.mxl') || 
                     contentType.includes('application/zip') ||
                     contentType.includes('application/x-zip-compressed')

        let xmlContent: string
        
        if (isZip) {
          // Handle MXL (compressed MusicXML)
          const arrayBuffer = await response.arrayBuffer()
          const zip = await JSZip.loadAsync(arrayBuffer)
          
          // Look for META-INF/container.xml to find the main XML file
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
          
          // If no container.xml, look for common XML file names
          if (!xmlFile) {
            xmlFile = zip.file('score.xml') || zip.file('music.xml') || 
                     Object.keys(zip.files).find(f => f.endsWith('.xml') && zip.file(f))
                     ? zip.file(Object.keys(zip.files).find(f => f.endsWith('.xml'))!)
                     : null
          }
          
          if (!xmlFile) {
            throw new Error('No XML file found in MXL archive')
          }
          
          xmlContent = await xmlFile.async('text')
        } else {
          // Handle plain XML
          xmlContent = await response.text()
        }

        setNotationXML(xmlContent)
      } catch (error: any) {
        console.error('Error loading notation file:', error)
        setNotationXML(null)
      } finally {
        setLoadingNotationXML(false)
      }
    }

    loadNotationFile()
  }, [value?.notationFilePath, value?.notationUrl])

  // Load and display reference answer file preview
  useEffect(() => {
    const loadReferenceFile = async () => {
      if (!value?.referenceAnswerPath && !value?.referenceAnswerUrl) {
        setReferenceXML(null)
        return
      }

      // Only preview MusicXML files, not PDFs
      const fileName = value.referenceAnswerPath || ''
      if (fileName.toLowerCase().endsWith('.pdf')) {
        setReferenceXML(null)
        return
      }

      setLoadingReferenceXML(true)
      try {
        let url = value.referenceAnswerUrl
        if (!url && value.referenceAnswerPath) {
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
          if (supabaseUrl) {
            url = `${supabaseUrl}/storage/v1/object/public/notation-files/${value.referenceAnswerPath}`
          }
        }

        if (!url) {
          setLoadingReferenceXML(false)
          return
        }

        console.log('Loading reference answer file from:', url)
        const response = await fetch(url)
        
        if (!response.ok) {
          throw new Error(`Failed to load file: ${response.statusText}`)
        }

        const contentType = response.headers.get('content-type') || ''
        
        // Check if it's an image
        const isImage = contentType.startsWith('image/') || 
                       fileName.toLowerCase().match(/\.(png|jpg|jpeg|gif|webp)(\?|$)/i)
        
        if (isImage) {
          // For images, just store the URL
          setReferenceXML(url)
          setLoadingReferenceXML(false)
          return
        }
        
        // Check if it's a ZIP file (MXL) by extension or content type
        const isZip = fileName.toLowerCase().endsWith('.mxl') || 
                     contentType.includes('application/zip') ||
                     contentType.includes('application/x-zip-compressed')

        let xmlContent: string
        
        if (isZip) {
          // Handle MXL (compressed MusicXML)
          const arrayBuffer = await response.arrayBuffer()
          const zip = await JSZip.loadAsync(arrayBuffer)
          
          // Look for META-INF/container.xml to find the main XML file
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
          
          // If no container.xml, look for common XML file names
          if (!xmlFile) {
            xmlFile = zip.file('score.xml') || zip.file('music.xml') || 
                     Object.keys(zip.files).find(f => f.endsWith('.xml') && zip.file(f))
                     ? zip.file(Object.keys(zip.files).find(f => f.endsWith('.xml'))!)
                     : null
          }
          
          if (!xmlFile) {
            throw new Error('No XML file found in MXL archive')
          }
          
          xmlContent = await xmlFile.async('text')
        } else {
          // Handle plain XML
          xmlContent = await response.text()
        }

        setReferenceXML(xmlContent)
      } catch (error: any) {
        console.error('Error loading reference answer file:', error)
        setReferenceXML(null)
      } finally {
        setLoadingReferenceXML(false)
      }
    }

    loadReferenceFile()
  }, [value?.referenceAnswerPath, value?.referenceAnswerUrl])

  // When referenceXML loads and modal is open, parse it and load into editor
  useEffect(() => {
    if (editorModalOpen && (referenceXML || referenceAnswerMusicXML || value?.referenceAnswerMusicXML)) {
      const musicXMLToLoad = referenceAnswerMusicXML || referenceXML || value?.referenceAnswerMusicXML
      if (musicXMLToLoad) {
        console.log('Loading MusicXML into editor (from useEffect):', musicXMLToLoad.substring(0, 200))
        const parsed = parseMusicXMLToNotes(musicXMLToLoad)
        console.log('Parsed notes:', parsed.notes.length, 'notes')
        console.log('Parsed metadata:', parsed)
        setParsedNotes(parsed.notes)
        setParsedMetadata({
          clef: parsed.clef,
          keySignature: parsed.keySignature,
          timeSignature: parsed.timeSignature,
          measureCount: parsed.measureCount
        })
        setEditorMusicXML(musicXMLToLoad)
      }
    }
  }, [editorModalOpen, referenceXML, referenceAnswerMusicXML, value?.referenceAnswerMusicXML])

  return (
    <div className="space-y-4">
      {/* Source Instrument */}
      <div className="space-y-2">
        <Label htmlFor="sourceInstrument">Source Instrument *</Label>
        <select
          id="sourceInstrument"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={value?.sourceInstrument || ''}
          onChange={(e) => onChange({ ...value, sourceInstrument: e.target.value })}
          required
        >
          <option value="">Select instrument...</option>
          {instruments.map((inst) => (
            <option key={inst} value={inst}>{inst}</option>
          ))}
        </select>
      </div>

      {/* Target Instrument */}
      <div className="space-y-2">
        <Label htmlFor="targetInstrument">Target Instrument *</Label>
        <select
          id="targetInstrument"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={value?.targetInstrument || ''}
          onChange={(e) => onChange({ ...value, targetInstrument: e.target.value })}
          required
        >
          <option value="">Select instrument...</option>
          {instruments.map((inst) => (
            <option key={inst} value={inst}>{inst}</option>
          ))}
        </select>
      </div>

      {/* Notation Upload */}
      <div className="space-y-2">
        <Label>Music Notation *</Label>
        {!value?.notationFilePath ? (
          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            <FileMusic className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 mb-2">Upload a music notation file</p>
            <input
              type="file"
              accept=".xml,.musicxml,.mxl,image/*,application/xml,text/xml,application/vnd.recordare.musicxml+xml,application/vnd.recordare.musicxml"
              onChange={handleFileInputChange}
              className="hidden"
              id="notation-upload"
              disabled={uploading}
            />
            <label htmlFor="notation-upload">
              <Button type="button" variant="outline" disabled={uploading} asChild>
                <span>
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? 'Uploading...' : 'Choose File'}
                </span>
              </Button>
            </label>
            <p className="text-xs text-gray-500 mt-2">MusicXML (.xml, .musicxml, .mxl) or Images (.png, .jpg, .jpeg, .gif, .webp) - max 10MB</p>
            <p className="text-xs text-blue-600 mt-1">💡 Tip: You can paste an image from your clipboard (Ctrl+V / Cmd+V)</p>
            <p className="text-xs text-amber-600 mt-1">⚠️ PDF files are not supported. Please use MusicXML format or images.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FileMusic className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="font-medium">Notation file uploaded</p>
                    <p className="text-sm text-gray-600">{value.notationFilePath}</p>
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
            
            {/* Preview of uploaded notation */}
            {loadingNotationXML ? (
              <div className="border rounded-lg p-4 bg-white text-center">
                <p className="text-sm text-gray-600">Loading preview...</p>
              </div>
            ) : notationXML ? (
              <div className="border rounded-lg p-4 bg-white">
                <Label className="mb-2 block text-sm font-medium">Notation Preview:</Label>
                <MusicXMLViewer 
                  musicXML={notationXML} 
                  width={800} 
                  height={200}
                  isImage={!notationXML.trim().startsWith('<') || notationXML.match(/\.(png|jpg|jpeg|gif|webp)(\?|$)/i) !== null}
                />
              </div>
            ) : (
              <div className="border rounded-lg p-4 bg-gray-50 text-center">
                <p className="text-sm text-gray-500">Preview not available</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Optional Reference Answer */}
      <div className="space-y-2">
        <Label>Reference Answer (Optional)</Label>
        <p className="text-sm text-gray-600 mb-2">
          Upload or create the correct transposition for grading reference
        </p>
        
        {/* Toggle between file upload and editor */}
        {!value?.referenceAnswerPath && !value?.referenceAnswerMusicXML && (
          <div className="flex space-x-2 mb-3">
            <Button
              type="button"
              variant={useEditorForReference ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setUseEditorForReference(true)
                setUnsavedReferenceMusicXML(null) // Clear unsaved changes when starting
              }}
            >
              <Edit3 className="h-4 w-4 mr-1" />
              Create with Editor
            </Button>
            <Button
              type="button"
              variant={!useEditorForReference ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setUseEditorForReference(false)
                setReferenceAnswerMusicXML(null)
              }}
            >
              <Upload className="h-4 w-4 mr-1" />
              Upload File
            </Button>
          </div>
        )}

        {!value?.referenceAnswerPath && !value?.referenceAnswerMusicXML ? (
          useEditorForReference ? (
            <div className="border rounded-lg p-4 bg-white">
              <Button
                type="button"
                onClick={() => setEditorModalOpen(true)}
                size="lg"
                className="w-full h-40 flex flex-col items-center justify-center gap-2"
              >
                <Maximize2 className="h-8 w-8" />
                <span className="text-lg">Open Score Editor</span>
                <span className="text-sm opacity-75">Create or edit the reference answer</span>
              </Button>
              <div className="mt-4 flex items-center justify-between">
                <div>
                  {unsavedReferenceMusicXML && (
                    <p className="text-sm text-amber-600">⚠️ You have unsaved changes</p>
                  )}
                </div>
                <Button
                  type="button"
                  onClick={async () => {
                    const musicXMLToSave = unsavedReferenceMusicXML
                    if (!musicXMLToSave) {
                      alert('No changes to save')
                      return
                    }
                    
                    setUploadingReferenceXML(true)
                    try {
                      // Convert MusicXML string to a Blob and then to File
                      const blob = new Blob([musicXMLToSave], { type: 'application/xml' })
                      const file = new File([blob], 'reference-answer.musicxml', { type: 'application/xml' })
                      
                      const response = await api.uploadNotation(file)
                      setReferenceAnswerMusicXML(musicXMLToSave)
                      setUnsavedReferenceMusicXML(null)
                      onChange({
                        ...value,
                        referenceAnswerPath: response.data.path,
                        referenceAnswerUrl: response.data.url,
                        referenceAnswerMusicXML: musicXMLToSave
                      })
                    } catch (err) {
                      console.error('Error uploading reference answer:', err)
                      alert('Failed to upload reference answer')
                    } finally {
                      setUploadingReferenceXML(false)
                    }
                  }}
                  disabled={!unsavedReferenceMusicXML || uploadingReferenceXML}
                >
                  {uploadingReferenceXML ? 'Saving...' : 'Save Reference Answer'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed rounded-lg p-4 text-center">
              <input
                type="file"
                accept=".pdf,.xml,.musicxml,.mxl"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return

                  try {
                    const response = await api.uploadNotation(file)
                    onChange({
                      ...value,
                      referenceAnswerPath: response.data.path,
                      referenceAnswerUrl: response.data.url
                    })
                  } catch (err) {
                    console.error('Error uploading reference answer:', err)
                    alert('Failed to upload reference answer')
                  }
                }}
                className="text-sm"
                id="reference-answer-upload"
              />
              <label htmlFor="reference-answer-upload">
                <Button type="button" variant="outline" asChild>
                  <span className="cursor-pointer">
                    <Upload className="h-4 w-4 mr-2" />
                    Choose Reference Answer File
                  </span>
                </Button>
              </label>
              <p className="text-xs text-gray-500 mt-2">PDF, MusicXML (max 10MB)</p>
            </div>
          )
        ) : (
          <div className="space-y-4">
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FileMusic className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="font-medium">Reference answer uploaded</p>
                    <p className="text-sm text-gray-600">{value.referenceAnswerPath}</p>
                  </div>
                </div>
              <div className="flex space-x-2">
                {value.referenceAnswerMusicXML && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setUseEditorForReference(true)
                      setReferenceAnswerMusicXML(value.referenceAnswerMusicXML)
                      setUnsavedReferenceMusicXML(null) // Clear unsaved changes when starting to edit
                    }}
                  >
                    <Edit3 className="h-4 w-4 mr-1" />
                    Edit with Editor
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onChange({
                      ...value,
                      referenceAnswerPath: undefined,
                      referenceAnswerUrl: undefined,
                      referenceAnswerMusicXML: undefined
                    })
                    setReferenceAnswerMusicXML(null)
                    setUseEditorForReference(false)
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
            
            {/* Show editor if editing, otherwise show preview */}
            {useEditorForReference && (value.referenceAnswerMusicXML || !value.referenceAnswerPath) ? (
              <div className="border rounded-lg p-4 bg-white">
                <Button
                  type="button"
                  onClick={() => setEditorModalOpen(true)}
                  size="lg"
                  className="w-full h-40 flex flex-col items-center justify-center gap-2"
                >
                  <Maximize2 className="h-8 w-8" />
                  <span className="text-lg">Open Score Editor</span>
                  <span className="text-sm opacity-75">Edit the reference answer</span>
                </Button>
                <div className="mt-4 flex items-center justify-between">
                  <div>
                    {unsavedReferenceMusicXML && (
                      <p className="text-sm text-amber-600">⚠️ You have unsaved changes</p>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setUnsavedReferenceMusicXML(null)
                        setUseEditorForReference(false)
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={async () => {
                        const musicXMLToSave = unsavedReferenceMusicXML || value.referenceAnswerMusicXML
                        if (!musicXMLToSave) {
                          alert('No changes to save')
                          return
                        }
                        
                        setUploadingReferenceXML(true)
                        try {
                          // Convert MusicXML string to a Blob and then to File
                          const blob = new Blob([musicXMLToSave], { type: 'application/xml' })
                          const file = new File([blob], 'reference-answer.musicxml', { type: 'application/xml' })
                          
                          const response = await api.uploadNotation(file)
                          setReferenceAnswerMusicXML(musicXMLToSave)
                          setUnsavedReferenceMusicXML(null)
                          onChange({
                            ...value,
                            referenceAnswerPath: response.data.path,
                            referenceAnswerUrl: response.data.url,
                            referenceAnswerMusicXML: musicXMLToSave
                          })
                          setUseEditorForReference(false) // Switch back to preview mode after save
                        } catch (err) {
                          console.error('Error uploading reference answer:', err)
                          alert('Failed to upload reference answer')
                        } finally {
                          setUploadingReferenceXML(false)
                        }
                      }}
                      disabled={!unsavedReferenceMusicXML && !value.referenceAnswerMusicXML || uploadingReferenceXML}
                    >
                      {uploadingReferenceXML ? 'Saving...' : 'Save Reference Answer'}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              /* Preview of uploaded reference answer (MusicXML only) */
              <>
                {value.referenceAnswerPath?.toLowerCase().endsWith('.pdf') ? (
                  <div className="border rounded-lg p-4 bg-gray-50 text-center">
                    <p className="text-sm text-gray-500">PDF preview not available (use MusicXML for preview)</p>
                  </div>
                ) : loadingReferenceXML ? (
                  <div className="border rounded-lg p-4 bg-white text-center">
                    <p className="text-sm text-gray-600">Loading preview...</p>
                  </div>
                ) : referenceAnswerMusicXML || referenceXML || value.referenceAnswerMusicXML ? (
                  <div className="border rounded-lg p-4 bg-white">
                    <Label className="mb-2 block text-sm font-medium">Reference Answer Preview:</Label>
                    <MusicXMLViewer 
                      musicXML={referenceAnswerMusicXML || referenceXML || value.referenceAnswerMusicXML || ''} 
                      width={800} 
                      height={200}
                      isImage={(() => {
                        const content = referenceAnswerMusicXML || referenceXML || value.referenceAnswerMusicXML || ''
                        return !content.trim().startsWith('<') || content.match(/\.(png|jpg|jpeg|gif|webp)(\?|$)/i) !== null
                      })()}
                    />
                  </div>
                ) : (
                  <div className="border rounded-lg p-4 bg-gray-50 text-center">
                    <p className="text-sm text-gray-500">Preview not available</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Full-Screen Editor Modal */}
      <Dialog open={editorModalOpen} onOpenChange={(open) => {
        if (!open) {
          // When closing, check for unsaved changes
          const savedMusicXML = referenceAnswerMusicXML || referenceXML || value?.referenceAnswerMusicXML
          if (editorMusicXML && editorMusicXML !== savedMusicXML) {
            if (!confirm('You have unsaved changes. Close anyway?')) {
              return
            }
          }
        } else {
          // When opening, load saved content into editor
          // Try multiple sources: saved from editor, loaded from URL, or from props
          const musicXMLToLoad = referenceAnswerMusicXML || referenceXML || value?.referenceAnswerMusicXML || null
          setEditorMusicXML(musicXMLToLoad)
          setUnsavedReferenceMusicXML(null)
          
          // Parse MusicXML to notes if available
          if (musicXMLToLoad) {
            console.log('Loading MusicXML into editor:', musicXMLToLoad.substring(0, 200))
            const parsed = parseMusicXMLToNotes(musicXMLToLoad)
            console.log('Parsed notes:', parsed.notes.length, 'notes')
            console.log('Parsed metadata:', parsed)
            setParsedNotes(parsed.notes)
            setParsedMetadata({
              clef: parsed.clef,
              keySignature: parsed.keySignature,
              timeSignature: parsed.timeSignature,
              measureCount: parsed.measureCount
            })
          } else {
            console.log('No MusicXML to load, starting with empty editor')
            setParsedNotes([])
            setParsedMetadata(null)
          }
        }
        setEditorModalOpen(open)
      }}>
        <DialogContent className="max-w-[90vw] w-[90vw] h-[95vh] max-h-[95vh] p-0 overflow-hidden flex flex-col">
          <DialogHeader className="px-6 py-4 border-b shrink-0">
            <DialogTitle className="text-xl">Music Score Editor - Reference Answer</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto p-6 bg-gray-50">
            {editorModalOpen && (
              <NotationEditor
                key={`editor-${(referenceAnswerMusicXML || referenceXML || value?.referenceAnswerMusicXML) ? 'loaded' : 'new'}-${parsedNotes.length}`} // Force re-render when content changes
                initialNotes={parsedNotes}
                clef={parsedMetadata?.clef as 'treble' | 'bass' | 'alto' | 'tenor' || 'treble'}
                initialKeySignature={parsedMetadata?.keySignature}
                initialTimeSignature={parsedMetadata?.timeSignature}
                initialMeasureCount={parsedMetadata?.measureCount}
                onChange={(notes, musicXML) => {
                  if (musicXML) {
                    setEditorMusicXML(musicXML)
                    // Mark as unsaved if different from saved version
                    const savedMusicXML = referenceAnswerMusicXML || referenceXML || value?.referenceAnswerMusicXML
                    if (musicXML !== savedMusicXML) {
                      setUnsavedReferenceMusicXML(musicXML)
                    } else {
                      setUnsavedReferenceMusicXML(null)
                    }
                  }
                }}
              />
            )}
          </div>
          <div className="px-6 py-4 border-t bg-white shrink-0 flex items-center justify-between">
            {(() => {
              const savedMusicXML = referenceAnswerMusicXML || referenceXML || value?.referenceAnswerMusicXML
              if (editorMusicXML && editorMusicXML !== savedMusicXML) {
                return (
                  <div className="text-sm text-orange-600 font-medium flex items-center gap-2">
                    <span className="animate-pulse">⚠️</span>
                    <span>You have unsaved changes</span>
                  </div>
                )
              }
              if (editorMusicXML && editorMusicXML === savedMusicXML) {
                return (
                  <div className="text-sm text-green-600 font-medium flex items-center gap-2">
                    <span>✓</span>
                    <span>All changes saved</span>
                  </div>
                )
              }
              return null
            })()}
            <div className="flex gap-2 ml-auto">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (editorMusicXML && editorMusicXML !== referenceAnswerMusicXML) {
                    if (!confirm('Discard unsaved changes and close?')) {
                      return
                    }
                  }
                  setEditorModalOpen(false)
                }}
              >
                <X className="h-4 w-4 mr-2" />
                Close
              </Button>
              <Button
                type="button"
                onClick={async () => {
                  if (!editorMusicXML) {
                    alert('No content to save')
                    return
                  }
                  
                  setUploadingReferenceXML(true)
                  try {
                    // Convert MusicXML string to a Blob and then to File
                    const blob = new Blob([editorMusicXML], { type: 'application/xml' })
                    const file = new File([blob], 'reference-answer.musicxml', { type: 'application/xml' })
                    
                    const response = await api.uploadNotation(file)
                    setReferenceAnswerMusicXML(editorMusicXML)
                    setReferenceXML(editorMusicXML) // Also update referenceXML so it's available next time
                    setUnsavedReferenceMusicXML(null)
                    onChange({
                      ...value,
                      notationFilePath: value?.notationFilePath || '', // Preserve existing notationFilePath
                      referenceAnswerPath: response.data.path,
                      referenceAnswerUrl: response.data.url,
                      referenceAnswerMusicXML: editorMusicXML
                    })
                    // Keep modal open after saving
                  } catch (err) {
                    console.error('Error uploading reference answer:', err)
                    alert('Failed to save reference answer')
                  } finally {
                    setUploadingReferenceXML(false)
                  }
                }}
                disabled={(() => {
                  const savedMusicXML = referenceAnswerMusicXML || referenceXML || value?.referenceAnswerMusicXML
                  return !editorMusicXML || (editorMusicXML === savedMusicXML) || uploadingReferenceXML
                })()}
                className="bg-green-600 hover:bg-green-700"
              >
                {uploadingReferenceXML ? 'Saving...' : '💾 Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

