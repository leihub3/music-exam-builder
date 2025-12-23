'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Play, FileMusic } from 'lucide-react'
import { NotationEditor } from '@/components/notation/NotationEditor'
import { MusicXMLViewer } from '@/components/notation/MusicXMLViewer'
import { api } from '@/lib/api'
import JSZip from 'jszip'
import type { Question } from '@music-exam-builder/shared/types'

interface ListenAndCompleteAnswerProps {
  question: Question
  value: any
  onChange: (value: any) => void
}

export function ListenAndCompleteAnswer({ question, value, onChange }: ListenAndCompleteAnswerProps) {
  const [incompleteScoreXML, setIncompleteScoreXML] = useState<string | null>(null)
  const [loadingScore, setLoadingScore] = useState(false)
  const [parsedNotes, setParsedNotes] = useState<any[]>([])
  const [parsedMetadata, setParsedMetadata] = useState<{ 
    clef: string, 
    keySignature: string, 
    timeSignature: string, 
    measureCount: number 
  } | null>(null)

  // Get listen and complete data - can be from typeData or from backend structure
  const audioData = (() => {
    // Try backend structure first (listen_and_complete object)
    if ((question as any).listen_and_complete) {
      const lac = Array.isArray((question as any).listen_and_complete)
        ? (question as any).listen_and_complete[0]
        : (question as any).listen_and_complete;
      return {
        audioFilePath: lac.audio_file_path,
        audioUrl: lac.audio_file_path ? (() => {
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
          if (supabaseUrl) {
            return `${supabaseUrl}/storage/v1/object/public/audio-files/${lac.audio_file_path}`;
          }
          return null;
        })() : null,
        incompleteScorePath: lac.incomplete_score_path,
        incompleteScoreUrl: lac.incomplete_score_path ? (() => {
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
          if (supabaseUrl) {
            return `${supabaseUrl}/storage/v1/object/public/notation-files/${lac.incomplete_score_path}`;
          }
          return null;
        })() : null,
        incompleteScoreMusicXML: lac.incomplete_score_music_xml || null,
        completeScorePath: lac.complete_score_path,
        blankPositions: lac.blank_positions
      };
    }
    // Fallback to typeData
    return (question.typeData as any) || {};
  })();

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

  // Load incomplete score MusicXML
  useEffect(() => {
    const loadIncompleteScore = async () => {
      // If using editor-based XML, use that
      if (audioData.incompleteScoreMusicXML) {
        setIncompleteScoreXML(audioData.incompleteScoreMusicXML)
        const parsed = parseMusicXMLToNotes(audioData.incompleteScoreMusicXML)
        setParsedNotes(parsed.notes)
        setParsedMetadata({
          clef: parsed.clef,
          keySignature: parsed.keySignature,
          timeSignature: parsed.timeSignature,
          measureCount: parsed.measureCount
        })
        setLoadingScore(false)
        return
      }

      // Otherwise load from uploaded file
      if (!audioData.incompleteScorePath && !audioData.incompleteScoreUrl) {
        setIncompleteScoreXML(null)
        return
      }

      setLoadingScore(true)
      try {
        let url = audioData.incompleteScoreUrl
        if (!url && audioData.incompleteScorePath) {
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
          if (supabaseUrl) {
            url = `${supabaseUrl}/storage/v1/object/public/notation-files/${audioData.incompleteScorePath}`
          }
        }

        if (!url) {
          setLoadingScore(false)
          return
        }

        const response = await fetch(url)
        if (!response.ok) {
          throw new Error(`Failed to load file: ${response.statusText}`)
        }

        const contentType = response.headers.get('content-type') || ''
        const fileName = audioData.incompleteScorePath || url
        
        // Check if it's an image
        const isImage = contentType.startsWith('image/') || 
                       fileName.toLowerCase().match(/\.(png|jpg|jpeg|gif|webp)(\?|$)/i)
        
        if (isImage) {
          // Images not supported for editor - skip
          setLoadingScore(false)
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

        setIncompleteScoreXML(xmlContent)
        const parsed = parseMusicXMLToNotes(xmlContent)
        setParsedNotes(parsed.notes)
        setParsedMetadata({
          clef: parsed.clef,
          keySignature: parsed.keySignature,
          timeSignature: parsed.timeSignature,
          measureCount: parsed.measureCount
        })
      } catch (error: any) {
        console.error('Error loading incomplete score:', error)
        setIncompleteScoreXML(null)
      } finally {
        setLoadingScore(false)
      }
    }

    loadIncompleteScore()
  }, [audioData.incompleteScorePath, audioData.incompleteScoreUrl, audioData.incompleteScoreMusicXML])

  return (
    <div className="space-y-6">
      {/* Audio Player */}
      {audioData.audioFilePath && (
        <div className="border rounded-lg p-6 bg-gray-50">
          <div className="flex items-center justify-center mb-4">
            <Play className="h-8 w-8 text-blue-600" />
          </div>
          <audio
            controls
            className="w-full"
            src={audioData.audioUrl || `/api/storage/audio/${audioData.audioFilePath}`}
          >
            Your browser does not support the audio element.
          </audio>
          <p className="text-sm text-gray-600 text-center mt-2">
            Listen carefully and complete the incomplete score below
          </p>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <strong>Instructions:</strong> Listen to the audio above and complete the incomplete score below by filling in the blanks. Use the notation editor to add the missing notes.
        </p>
      </div>

      {/* Loading State */}
      {loadingScore && (
        <div className="border rounded-lg p-8 text-center">
          <p className="text-gray-600">Loading incomplete score...</p>
        </div>
      )}

      {/* Notation Editor with incomplete score pre-loaded */}
      {!loadingScore && incompleteScoreXML && (
        <div className="border rounded-lg p-4">
          <NotationEditor
            key={`editor-${incompleteScoreXML.substring(0, 50)}`} // Force re-render when score changes
            initialNotes={parsedNotes}
            clef={parsedMetadata?.clef as 'treble' | 'bass' | 'alto' | 'tenor' || 'treble'}
            initialKeySignature={parsedMetadata?.keySignature}
            initialTimeSignature={parsedMetadata?.timeSignature}
            initialMeasureCount={parsedMetadata?.measureCount}
            onChange={(notes, musicXML) => {
              // Only update if we have valid content
              const hasNotes = notes && notes.length > 0
              const hasMusicXML = musicXML && musicXML.trim().length > 0
              
              if (hasNotes || hasMusicXML) {
                onChange({
                  ...value,
                  musicXML: musicXML || null,
                  completedScore: musicXML || null,
                  notes: notes || []
                })
              } else {
                // Clear answer if both are empty
                onChange(null)
              }
            }}
          />
          {value?.completedScore && (
            <div className="mt-4">
              <div className="p-3 bg-green-50 border border-green-200 rounded text-sm text-green-800">
                ✓ Score completed and saved
              </div>
            </div>
          )}
        </div>
      )}

      {/* Fallback: Show preview if score exists but can't be edited */}
      {!loadingScore && !incompleteScoreXML && audioData.incompleteScorePath && (
        <div className="border rounded-lg p-4 bg-yellow-50">
          <p className="text-sm text-yellow-800">
            Incomplete score is available but cannot be loaded in the editor. Please contact your instructor.
          </p>
        </div>
      )}

      {/* No score warning */}
      {!loadingScore && !incompleteScoreXML && !audioData.incompleteScorePath && (
        <div className="border rounded-lg p-4 bg-gray-50">
          <p className="text-sm text-gray-600">
            No incomplete score provided. Please listen to the audio and complete the melody.
          </p>
          <div className="mt-4 border rounded-lg p-4">
            <NotationEditor
              onChange={(notes, musicXML) => {
                // Only update if we have valid content
                const hasNotes = notes && notes.length > 0
                const hasMusicXML = musicXML && musicXML.trim().length > 0
                
                if (hasNotes || hasMusicXML) {
                  onChange({
                    ...value,
                    musicXML: musicXML || null,
                    completedScore: musicXML || null,
                    notes: notes || []
                  })
                } else {
                  // Clear answer if both are empty
                  onChange(null)
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
