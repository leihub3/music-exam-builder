'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, Music, X, FileText, Edit3, Maximize2 } from 'lucide-react'
import { api } from '@/lib/api'
import { MusicXMLViewer } from '@/components/notation/MusicXMLViewer'
import { NotationEditor } from '@/components/notation/NotationEditor'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import JSZip from 'jszip'

interface ListenAndCompleteEditorProps {
  value: any
  onChange: (value: any) => void
}

export function ListenAndCompleteEditor({ value, onChange }: ListenAndCompleteEditorProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadingNotation, setUploadingNotation] = useState(false)
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [notationXML, setNotationXML] = useState<string | null>(null)
  const [loadingNotationXML, setLoadingNotationXML] = useState(false)
  const [editorModalOpen, setEditorModalOpen] = useState(false)
  const [editorMusicXML, setEditorMusicXML] = useState<string | null>(null)
  const [parsedNotes, setParsedNotes] = useState<any[]>([])
  const [parsedMetadata, setParsedMetadata] = useState<{ 
    clef: string, 
    keySignature: string, 
    timeSignature: string, 
    measureCount: number 
  } | null>(null)
  const [unsavedMusicXML, setUnsavedMusicXML] = useState<string | null>(null)
  const [useEditorForNotation, setUseEditorForNotation] = useState<boolean>(
    value?.incompleteScoreMusicXML ? true : false
  )

  // Parse MusicXML to notes format for NotationEditor
  const parseMusicXMLToNotes = (musicXML: string): { 
    notes: any[], 
    clef: string, 
    keySignature: string, 
    timeSignature: string, 
    measureCount: number 
  } => {
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
      measures.forEach((measure, measureIndex) => {
        const measureNotes = measure.querySelectorAll('note')
        measureNotes.forEach((noteEl, noteIndex) => {
          const rest = noteEl.querySelector('rest')
          const pitchEl = noteEl.querySelector('pitch')
          const dotEl = noteEl.querySelector('dot')
          
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
          
          // Convert MusicXML duration type to VexFlow duration code
          const typeEl = noteEl.querySelector('type')
          const dot = dotEl !== null
          let duration = 'q' // default quarter
          
          if (typeEl) {
            const type = typeEl.textContent?.trim() || 'quarter'
            const durationMap: Record<string, string> = {
              'whole': 'w',
              'half': 'h',
              'quarter': 'q',
              'eighth': '8',
              '16th': '16',
              '32nd': '32',
              '64th': '64'
            }
            duration = durationMap[type.toLowerCase()] || 'q'
          }
          
          // Parse ties
          const tieStart = noteEl.querySelector('tie[type="start"]') || noteEl.querySelector('tied[type="start"]')
          const tieEnd = noteEl.querySelector('tie[type="stop"]') || noteEl.querySelector('tied[type="stop"]')
          
          // Parse slurs
          const slurStart = noteEl.querySelector('slur[type="start"]')
          const slurEnd = noteEl.querySelector('slur[type="stop"]')
          
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

      return { notes, clef, keySignature, timeSignature, measureCount: measures.length }
    } catch (error) {
      console.error('Error parsing MusicXML:', error)
      return { notes: [], clef: 'treble', keySignature: 'C', timeSignature: '4/4', measureCount: 1 }
    }
  }

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
        incompleteScoreUrl: response.data.url,
        incompleteScoreMusicXML: null // Clear editor-based XML when uploading file
      })
      setUseEditorForNotation(false)
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
      incompleteScoreUrl: undefined,
      incompleteScoreMusicXML: undefined
    })
    setNotationXML(null)
    setUseEditorForNotation(false)
  }

  // Load and display notation file preview
  useEffect(() => {
    const loadNotationFile = async () => {
      // If using editor-based XML, use that
      if (useEditorForNotation && value?.incompleteScoreMusicXML) {
        setNotationXML(value.incompleteScoreMusicXML)
        setLoadingNotationXML(false)
        return
      }

      // Otherwise load from uploaded file
      if (!value?.incompleteScorePath && !value?.incompleteScoreUrl) {
        setNotationXML(null)
        return
      }

      setLoadingNotationXML(true)
      try {
        let url = value.incompleteScoreUrl
        if (!url && value.incompleteScorePath) {
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
          if (supabaseUrl) {
            url = `${supabaseUrl}/storage/v1/object/public/notation-files/${value.incompleteScorePath}`
          }
        }

        if (!url) {
          setLoadingNotationXML(false)
          return
        }

        const response = await fetch(url)
        if (!response.ok) {
          throw new Error(`Failed to load file: ${response.statusText}`)
        }

        const contentType = response.headers.get('content-type') || ''
        const fileName = value.incompleteScorePath || url
        
        // Check if it's an image
        const isImage = contentType.startsWith('image/') || 
                       fileName.toLowerCase().match(/\.(png|jpg|jpeg|gif|webp)(\?|$)/i)
        
        if (isImage) {
          setNotationXML(url)
          setLoadingNotationXML(false)
          return
        }
        
        // Check if it's a ZIP file (MXL)
        const isZip = fileName.toLowerCase().endsWith('.mxl') || 
                     contentType.includes('application/zip') ||
                     contentType.includes('application/x-zip-compressed')

        let xmlContent: string
        
        if (isZip) {
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
          xmlContent = await xmlFile.async('text')
        } else {
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
  }, [value?.incompleteScorePath, value?.incompleteScoreUrl, useEditorForNotation, value?.incompleteScoreMusicXML])

  // When editor modal opens, parse MusicXML and load into editor
  useEffect(() => {
    if (editorModalOpen) {
      const musicXMLToLoad = value?.incompleteScoreMusicXML || notationXML
      if (musicXMLToLoad && typeof musicXMLToLoad === 'string' && !musicXMLToLoad.startsWith('http')) {
        const parsed = parseMusicXMLToNotes(musicXMLToLoad)
        setParsedNotes(parsed.notes)
        setParsedMetadata({
          clef: parsed.clef,
          keySignature: parsed.keySignature,
          timeSignature: parsed.timeSignature,
          measureCount: parsed.measureCount
        })
        setEditorMusicXML(musicXMLToLoad)
      } else {
        // Start with empty editor
        setParsedNotes([])
        setParsedMetadata({
          clef: 'treble',
          keySignature: 'C',
          timeSignature: '4/4',
          measureCount: 1
        })
        setEditorMusicXML(null)
      }
      setUnsavedMusicXML(null)
    }
  }, [editorModalOpen, notationXML, value?.incompleteScoreMusicXML])

  const hasUnsavedChanges = () => {
    const savedMusicXML = value?.incompleteScoreMusicXML || notationXML
    return editorMusicXML && editorMusicXML !== savedMusicXML
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

      {/* Incomplete Score - Upload or Edit */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Incomplete Score (Optional)</Label>
          {notationXML && typeof notationXML === 'string' && !notationXML.startsWith('http') && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditorModalOpen(true)}
            >
              <Edit3 className="h-4 w-4 mr-2" />
              Edit Score
            </Button>
          )}
        </div>
        <p className="text-sm text-gray-600 mb-2">
          Upload a notation file or create one using the editor. Students will see this incomplete score and fill in the blanks.
        </p>

        {!notationXML && !value?.incompleteScorePath ? (
          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            <div className="flex flex-col items-center space-y-4">
              <div className="flex space-x-4">
                <div className="flex flex-col items-center">
                  <FileText className="h-12 w-12 text-gray-400 mb-2" />
                  <input
                    type="file"
                    accept=".pdf,.xml,.musicxml,.mxl"
                    onChange={handleNotationChange}
                    className="hidden"
                    id="notation-upload"
                    disabled={uploadingNotation}
                  />
                  <label htmlFor="notation-upload">
                    <Button type="button" variant="outline" disabled={uploadingNotation} asChild>
                      <span>
                        <Upload className="h-4 w-4 mr-2" />
                        {uploadingNotation ? 'Uploading...' : 'Upload File'}
                      </span>
                    </Button>
                  </label>
                </div>
                <div className="flex flex-col items-center">
                  <Edit3 className="h-12 w-12 text-gray-400 mb-2" />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditorModalOpen(true)}
                  >
                    <Edit3 className="h-4 w-4 mr-2" />
                    Create with Editor
                  </Button>
                </div>
              </div>
              <p className="text-xs text-gray-500">PDF, MusicXML, or create new (max 10MB)</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <FileText className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="font-medium">
                      {useEditorForNotation ? 'Score created with editor' : 'Score file uploaded'}
                    </p>
                    {value?.incompleteScorePath && (
                      <p className="text-sm text-gray-600">{value.incompleteScorePath}</p>
                    )}
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

              {/* Display notation preview */}
              {loadingNotationXML ? (
                <div className="border rounded p-4 bg-white text-center">
                  <p className="text-sm text-gray-600">Loading preview...</p>
                </div>
              ) : notationXML ? (
                <div className="mt-4">
                  {typeof notationXML === 'string' && notationXML.startsWith('http') ? (
                    // Image file
                    <div className="border rounded p-4 bg-white">
                      <img src={notationXML} alt="Score preview" className="max-w-full h-auto" />
                    </div>
                  ) : (
                    // MusicXML file
                    <div className="border rounded p-4 bg-white">
                      <MusicXMLViewer 
                        musicXML={notationXML} 
                        width={800} 
                        height={300}
                      />
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* Complete Score Reference (Optional - for auto-evaluation) */}
      <div className="space-y-2">
        <Label>Complete Score Reference (Optional)</Label>
        <p className="text-sm text-gray-600 mb-2">
          Optionally provide the complete score for automatic evaluation. This should be the full score with all blanks filled in correctly.
        </p>
        
        {!value?.completeScorePath && !value?.completeScoreMusicXML ? (
          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            <div className="flex flex-col items-center space-y-4">
              <div className="flex space-x-4">
                <div className="flex flex-col items-center">
                  <FileText className="h-12 w-12 text-gray-400 mb-2" />
                  <input
                    type="file"
                    accept=".xml,.musicxml,.mxl"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      setUploadingNotation(true)
                      try {
                        const response = await api.uploadNotation(file)
                        onChange({
                          ...value,
                          completeScorePath: response.data.path,
                          completeScoreUrl: response.data.url
                        })
                      } catch (err) {
                        console.error('Error uploading complete score:', err)
                        alert('Failed to upload complete score')
                      } finally {
                        setUploadingNotation(false)
                      }
                    }}
                    className="hidden"
                    id="complete-score-upload"
                    disabled={uploadingNotation}
                  />
                  <label htmlFor="complete-score-upload">
                    <Button type="button" variant="outline" disabled={uploadingNotation} asChild>
                      <span>
                        <Upload className="h-4 w-4 mr-2" />
                        {uploadingNotation ? 'Uploading...' : 'Upload File'}
                      </span>
                    </Button>
                  </label>
                </div>
                <div className="flex flex-col items-center">
                  <Edit3 className="h-12 w-12 text-gray-400 mb-2" />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      // Open editor modal for complete score
                      // This would reuse the editor modal pattern
                      // For now, we'll just show a message
                      alert('Complete score editor coming soon. For now, please upload a file.')
                    }}
                  >
                    <Edit3 className="h-4 w-4 mr-2" />
                    Create with Editor
                  </Button>
                </div>
              </div>
              <p className="text-xs text-gray-500">MusicXML only (max 10MB)</p>
            </div>
          </div>
        ) : (
          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FileText className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="font-medium">Complete score reference provided</p>
                  {value.completeScorePath && (
                    <p className="text-sm text-gray-600">{value.completeScorePath}</p>
                  )}
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onChange({
                    ...value,
                    completeScorePath: undefined,
                    completeScoreUrl: undefined,
                    completeScoreMusicXML: undefined
                  })
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
        <p className="text-xs text-gray-500">
          The complete score will be used for automatic evaluation. If not provided, questions will require manual grading.
        </p>
      </div>

      {/* Blank Positions (Optional) */}
      <div className="space-y-2">
        <Label htmlFor="blankPositions">Blank Positions (Optional)</Label>
        <Input
          id="blankPositions"
          placeholder="e.g., 1, 3, 5 (comma-separated note positions)"
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
          Specify which note positions are blanks (1-based indexing). Used for precise evaluation. Leave empty for automatic detection.
        </p>
      </div>

      {/* Notation Editor Modal */}
      <Dialog open={editorModalOpen} onOpenChange={(open) => {
        if (!open && hasUnsavedChanges()) {
          if (!confirm('You have unsaved changes. Close anyway?')) {
            return
          }
        }
        setEditorModalOpen(open)
      }}>
        <DialogContent className="max-w-[90vw] w-[90vw] h-[95vh] max-h-[95vh] p-0 overflow-hidden flex flex-col">
          <DialogHeader className="px-6 py-4 border-b shrink-0">
            <DialogTitle className="text-xl">Music Score Editor - Incomplete Score</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto p-6 bg-gray-50">
            {editorModalOpen && (
              <NotationEditor
                key={`editor-${(value?.incompleteScoreMusicXML || notationXML) ? 'loaded' : 'new'}-${parsedNotes.length}`}
                initialNotes={parsedNotes}
                clef={parsedMetadata?.clef as 'treble' | 'bass' | 'alto' | 'tenor' || 'treble'}
                initialKeySignature={parsedMetadata?.keySignature}
                initialTimeSignature={parsedMetadata?.timeSignature}
                initialMeasureCount={parsedMetadata?.measureCount}
                onChange={(notes, musicXML) => {
                  if (musicXML) {
                    setEditorMusicXML(musicXML)
                    const savedMusicXML = value?.incompleteScoreMusicXML || notationXML
                    if (musicXML !== savedMusicXML) {
                      setUnsavedMusicXML(musicXML)
                    } else {
                      setUnsavedMusicXML(null)
                    }
                  }
                }}
              />
            )}
          </div>
          <div className="px-6 py-4 border-t bg-white shrink-0 flex items-center justify-between">
            {hasUnsavedChanges() ? (
              <div className="text-sm text-orange-600 font-medium flex items-center gap-2">
                <span className="animate-pulse">⚠️</span>
                <span>You have unsaved changes</span>
              </div>
            ) : editorMusicXML ? (
              <div className="text-sm text-green-600 font-medium flex items-center gap-2">
                <span>✓</span>
                <span>All changes saved</span>
              </div>
            ) : null}
            <div className="flex gap-2 ml-auto">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (hasUnsavedChanges()) {
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
                  
                  setUploadingNotation(true)
                  try {
                    // Convert MusicXML string to a Blob and then to File
                    const blob = new Blob([editorMusicXML], { type: 'application/xml' })
                    const file = new File([blob], 'incomplete-score.musicxml', { type: 'application/xml' })
                    
                    const response = await api.uploadNotation(file)
                    onChange({
                      ...value,
                      incompleteScorePath: response.data.path,
                      incompleteScoreUrl: response.data.url,
                      incompleteScoreMusicXML: editorMusicXML
                    })
                    setUseEditorForNotation(true)
                    setUnsavedMusicXML(null)
                    // Keep modal open after saving
                  } catch (err) {
                    console.error('Error saving incomplete score:', err)
                    alert('Failed to save incomplete score')
                  } finally {
                    setUploadingNotation(false)
                  }
                }}
                disabled={!editorMusicXML || !hasUnsavedChanges() || uploadingNotation}
                className="bg-green-600 hover:bg-green-700"
              >
                {uploadingNotation ? 'Saving...' : '💾 Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
