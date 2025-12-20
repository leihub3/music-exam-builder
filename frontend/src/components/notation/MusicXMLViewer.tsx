'use client'

import { useEffect, useRef, useState } from 'react'
import Vex from 'vexflow'

const { Renderer, Stave, StaveNote, Voice, Formatter, Barline, Beam, Dot } = Vex.Flow
const Tie = (Vex.Flow as any).Tie // Tie may not be in types but exists at runtime

interface MusicXMLViewerProps {
  musicXML: string
  width?: number
  height?: number
  className?: string
  isImage?: boolean // If true, treat musicXML as image URL
}

/**
 * MusicXML Viewer Component
 * Renders MusicXML files using VexFlow
 */
export function MusicXMLViewer({ 
  musicXML, 
  width = 800, 
  height = 200,
  className = '',
  isImage = false
}: MusicXMLViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!musicXML) {
      console.log('MusicXMLViewer: Missing musicXML')
      setLoading(false)
      return
    }

    // Use a small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      if (!containerRef.current) {
        console.log('MusicXMLViewer: Container ref still not available after delay')
        setLoading(false)
        return
      }

      console.log('MusicXMLViewer: Starting render, XML length:', musicXML.length)
      setLoading(true)
      setError(null)

      try {
        // Clear previous render
        containerRef.current.innerHTML = ''
        console.log('MusicXMLViewer: Container cleared')
        
        // Log the original MusicXML for debugging
        console.log('MusicXMLViewer: Original MusicXML:', musicXML.substring(0, 2000)) // First 2000 chars
        if (musicXML.length > 2000) {
          console.log('MusicXMLViewer: ... (truncated, total length:', musicXML.length, ')')
        }
        
        // Log a section that contains slurs for debugging
        const slurSection = musicXML.match(/<measure[^>]*number="1"[^>]*>[\s\S]{0,2000}<\/measure>/)?.[0]
        if (slurSection) {
          console.log('MusicXMLViewer: Measure 1 XML (for slur debugging):', slurSection)
        }

        // Check if this is an image (either explicitly marked or detected by URL/extension)
        const isImageFile = isImage || 
                           musicXML.startsWith('data:image/') || 
                           musicXML.match(/\.(png|jpg|jpeg|gif|webp)(\?|$)/i) ||
                           (!musicXML.trim().startsWith('<') && musicXML.match(/^https?:\/\/.*\.(png|jpg|jpeg|gif|webp)/i))

        if (isImageFile) {
          // Handle as image
          console.log('MusicXMLViewer: Detected image, rendering as image')
          const img = document.createElement('img')
          img.src = musicXML
          img.style.maxWidth = '100%'
          img.style.height = 'auto'
          img.style.display = 'block'
          img.onerror = () => {
            setError('Failed to load image')
            setLoading(false)
          }
          img.onload = () => {
            setLoading(false)
          }
          containerRef.current.appendChild(img)
          return
        }

      // Parse MusicXML
      const parser = new DOMParser()
      const xmlDoc = parser.parseFromString(musicXML, 'text/xml')

      // Check for parsing errors
      const parserError = xmlDoc.querySelector('parsererror')
      if (parserError) {
        console.error('MusicXMLViewer: XML parsing error:', parserError.textContent)
        throw new Error('Invalid MusicXML format: ' + (parserError.textContent || 'Unknown error'))
      }

      console.log('MusicXMLViewer: XML parsed successfully')

      // Parse MusicXML structure properly: part -> measure -> note
      // First, try to find the first part
      const part = xmlDoc.querySelector('part') || xmlDoc.querySelector('score-partwise part') || xmlDoc
      
      // Log the root element to check for any version-specific differences
      const rootElement = xmlDoc.documentElement
      console.log('MusicXMLViewer: Root element:', rootElement.tagName, 'version:', rootElement.getAttribute('version'))
      
      // Get divisions and clef from attributes (usually in first measure)
      const firstMeasure = part.querySelector('measure')
      let divisions = 4
      let clef = 'treble'
      let keySignature = ''
      let transposeOctaves = 0 // Track octave transposition from <transpose> element
      
      if (firstMeasure) {
        const attributes = firstMeasure.querySelector('attributes')
        if (attributes) {
          const divisionsEl = attributes.querySelector('divisions')
          if (divisionsEl) {
            divisions = parseInt(divisionsEl.textContent || '4', 10)
          }
          
          const clefEl = attributes.querySelector('clef sign')
          if (clefEl) {
            const clefSign = clefEl.textContent?.toLowerCase() || 'g'
            clef = clefSign === 'f' ? 'bass' : 'treble'
          }
          
          // Parse transpose element (affects octave of notes)
          const transposeEl = attributes.querySelector('transpose')
          if (transposeEl) {
            const octaveChangeEl = transposeEl.querySelector('octave-change')
            if (octaveChangeEl) {
              transposeOctaves = parseInt(octaveChangeEl.textContent || '0', 10)
              console.log('MusicXMLViewer: Found transpose octave-change:', transposeOctaves)
            }
          }
          
          // Parse key signature
          const keyEl = attributes.querySelector('key fifths')
          if (keyEl) {
            const fifths = parseInt(keyEl.textContent || '0', 10)
            // Convert fifths to major key name (VexFlow uses key names, not accidentals)
            // fifths: 0=C, 1=G, 2=D, 3=A, 4=E, 5=B, 6=F#, 7=C#
            //        -1=F, -2=Bb, -3=Eb, -4=Ab, -5=Db, -6=Gb, -7=Cb
            const majorKeys: Record<number, string> = {
              0: 'C',
              1: 'G',
              2: 'D',
              3: 'A',
              4: 'E',
              5: 'B',
              6: 'F#',
              7: 'C#',
              [-1]: 'F',
              [-2]: 'Bb',
              [-3]: 'Eb',
              [-4]: 'Ab',
              [-5]: 'Db',
              [-6]: 'Gb',
              [-7]: 'Cb'
            }
            
            if (majorKeys[fifths] !== undefined) {
              keySignature = majorKeys[fifths]
            }
          }
        }
      }
      
      console.log('MusicXMLViewer: Transpose octaves:', transposeOctaves)
      
      // Check for staff transposition (less common, but possible)
      const staffEl = part.querySelector('staff')
      if (staffEl) {
        console.log('MusicXMLViewer: Found staff element:', staffEl.outerHTML)
      }
      
      // Check the score-part for transposition info
      const scorePartId = part.getAttribute('id')
      if (scorePartId) {
        const scorePartEl = xmlDoc.querySelector(`score-part[id="${scorePartId}"]`)
        if (scorePartEl) {
          const transposeEl = scorePartEl.querySelector('transpose')
          if (transposeEl) {
            const octaveChangeEl = transposeEl.querySelector('octave-change')
            if (octaveChangeEl) {
              const scorePartTranspose = parseInt(octaveChangeEl.textContent || '0', 10)
              transposeOctaves += scorePartTranspose
              console.log('MusicXMLViewer: Found score-part transpose:', scorePartTranspose, 'Total:', transposeOctaves)
            }
          }
        }
      }
      
      // Extract measures and parse barlines
      const measureElements = Array.from(part.querySelectorAll('measure'))
      const totalMeasures = measureElements.length
      
      console.log('MusicXMLViewer: Found', totalMeasures, 'measures')
      if (totalMeasures === 0) {
        throw new Error('No measures found in MusicXML')
      }

      // Parse barline for each measure
      const measureData: Array<{
        element: Element
        barlineType: number
        notes: Element[]
      }> = []

      measureElements.forEach((measure, measureIndex) => {
        const notes = Array.from(measure.querySelectorAll('note'))
        console.log(`MusicXMLViewer: Measure ${measureIndex + 1} has ${notes.length} notes`)
        
        // Parse barline if present
        let barlineType = Vex.Flow.Barline.type.SINGLE // Default
        const barlineEl = measure.querySelector('barline[location="right"]')
        
        if (barlineEl) {
          const barStyleEl = barlineEl.querySelector('bar-style')
          if (barStyleEl) {
            const barStyle = barStyleEl.textContent?.trim() || ''
            // Map MusicXML barline styles to VexFlow types
            if (barStyle === 'regular' || barStyle === 'light') {
              barlineType = Vex.Flow.Barline.type.SINGLE
            } else if (barStyle === 'light-light') {
              barlineType = Vex.Flow.Barline.type.DOUBLE
            } else if (barStyle === 'light-heavy') {
              barlineType = Vex.Flow.Barline.type.END
            } else if (barStyle === 'heavy-light') {
              barlineType = Vex.Flow.Barline.type.REPEAT_BEGIN
            } else if (barStyle === 'heavy-heavy') {
              barlineType = Vex.Flow.Barline.type.REPEAT_END
            }
          }
        } else {
          // Default barline logic: SINGLE for regular measures, END for last measure
          if (measureIndex === totalMeasures - 1) {
            barlineType = Vex.Flow.Barline.type.END // Final barline for last measure
          } else {
            barlineType = Vex.Flow.Barline.type.SINGLE // Single barline between measures
          }
        }

        measureData.push({
          element: measure,
          barlineType,
          notes
        })
      })

      const totalNotes = measureData.reduce((sum, md) => sum + md.notes.length, 0)
      console.log('MusicXMLViewer: Found', totalNotes, 'notes across', totalMeasures, 'measures')
      if (totalNotes === 0) {
        throw new Error('No notes found in MusicXML')
      }

      // Calculate key signature extra width for first measure(s)
      // Parse fifths from first measure to determine key signature size
      let keySignatureFifths = 0
      if (firstMeasure) {
        const attributes = firstMeasure.querySelector('attributes')
        if (attributes) {
          const keyEl = attributes.querySelector('key')
          if (keyEl) {
            const fifthsEl = keyEl.querySelector('fifths')
            if (fifthsEl) {
              keySignatureFifths = Math.abs(parseInt(fifthsEl.textContent || '0', 10))
            }
          }
        }
      }
      
      // Calculate extra width needed for large key signatures (5+ accidentals)
      let keySignatureExtraWidth = 0
      if (keySignatureFifths >= 5) {
        // Add extra width for measures with 5+ accidentals
        // More aggressive increase for 6-7 accidentals to ensure enough space
        keySignatureExtraWidth = keySignatureFifths === 7 ? 150 : keySignatureFifths === 6 ? 110 : ((keySignatureFifths - 4) * 35)
      }
      
      // Calculate dynamic measure widths based on note durations
      // Smaller durations (eighth, 16th, 32nd, 64th) need significantly more space
      const calculateMeasureWidth = (measureInfo: { notes: Element[] }, isFirstMeasure: boolean): number => {
        const baseWidth = 160 // Base width for whole/half notes (reduced from 200)
        let maxWidth = baseWidth
        let hasSmallNotes = false
        
        // Check all notes in this measure for smaller durations
        measureInfo.notes.forEach(noteEl => {
          const typeEl = noteEl.querySelector('type')
          const type = typeEl ? typeEl.textContent?.toLowerCase() || 'quarter' : 'quarter'
          
          // Increase width significantly for smaller note values
          // These notes need much more horizontal space
          if (type === '64th') {
            maxWidth = Math.max(maxWidth, baseWidth * 3.5) // 250% more width for 64th notes
            hasSmallNotes = true
          } else if (type === '32nd') {
            maxWidth = Math.max(maxWidth, baseWidth * 2.8) // 180% more width for 32nd notes
            hasSmallNotes = true
          } else if (type === '16th') {
            maxWidth = Math.max(maxWidth, baseWidth * 2.2) // 120% more width for 16th notes
            hasSmallNotes = true
          } else if (type === 'eighth') {
            maxWidth = Math.max(maxWidth, baseWidth * 1.6) // 60% more width for eighth notes
            hasSmallNotes = true
          } else if (type === 'quarter') {
            maxWidth = Math.max(maxWidth, baseWidth * 1.2) // 20% more for quarter notes
          }
        })
        
        // Add extra padding if measure contains many small notes
        if (hasSmallNotes && measureInfo.notes.length > 4) {
          maxWidth = maxWidth * 1.2 // Additional 20% for measures with many small notes
        }
        
        // Add extra width for first measure if key signature is large
        if (isFirstMeasure && keySignatureExtraWidth > 0) {
          maxWidth += keySignatureExtraWidth
        }
        
        return Math.ceil(maxWidth) // Round up to ensure enough space
      }
      
      // Calculate width for each measure
      const measureWidths = measureData.map((measureInfo, index) => {
        if (measureInfo.notes.length === 0) {
          // Empty measures also get extra width if first measure has large key signature
          const baseWidth = 160
          return index === 0 && keySignatureExtraWidth > 0 ? baseWidth + keySignatureExtraWidth : baseWidth
        }
        return calculateMeasureWidth(measureInfo, index === 0)
      })
      
      // Stave dimensions
      const spacing = 0 // No spacing between measures - staves are contiguous
      const staveY = 40
      const totalWidth = Math.max(width, measureWidths.reduce((sum, w) => sum + w, 0) + 20) // Sum of all measure widths

      // Create renderer
      const renderer = new Renderer(containerRef.current, Renderer.Backends.SVG)
      renderer.resize(totalWidth, height)
      const context = renderer.getContext()
      context.setFont('Arial', 10)

      let currentX = 10

      // Track octave shifts (8va, 8vb, etc.) from direction elements
      // Check for octave-shift in direction elements before notes
      let currentOctaveShift = 0
      
      // Parse dynamics and other direction elements
      const directionElements = part.querySelectorAll('measure direction')
      console.log(`[MusicXMLViewer] Found ${directionElements.length} direction elements`)
      const dynamicsData: Array<{ measureIndex: number; defaultX: number; defaultY: number; text: string; placement: string }> = []
      
      directionElements.forEach((dirEl, dirIndex) => {
        // Log all direction elements to see what we're getting
        const measureEl = dirEl.closest('measure')
        const measureNumber = measureEl ? parseInt(measureEl.getAttribute('number') || '1', 10) : 0
        console.log(`[MusicXMLViewer] Direction element ${dirIndex + 1} in measure ${measureNumber}:`, dirEl.outerHTML.substring(0, 200))
        
        // Check for dynamics - can be direct child or nested
        const dynamicsEl = dirEl.querySelector('dynamics')
        if (dynamicsEl) {
          // Get placement (above/below)
          const placement = dirEl.getAttribute('placement') || 'below'
          
          // Get dynamics text - check for specific elements like <mf>, <f>, <p>, etc.
          let dynamicsText = ''
          if (dynamicsEl.querySelector('mf')) {
            dynamicsText = 'mf'
          } else if (dynamicsEl.querySelector('f')) {
            dynamicsText = 'f'
          } else if (dynamicsEl.querySelector('p')) {
            dynamicsText = 'p'
          } else if (dynamicsEl.querySelector('mp')) {
            dynamicsText = 'mp'
          } else if (dynamicsEl.querySelector('ff')) {
            dynamicsText = 'ff'
          } else if (dynamicsEl.querySelector('pp')) {
            dynamicsText = 'pp'
          } else {
            // Fallback to text content
            dynamicsText = dynamicsEl.textContent?.trim() || ''
          }
          
          // Get position from default-x and default-y attributes (in tenths)
          const defaultX = parseFloat(dynamicsEl.getAttribute('default-x') || '0')
          const defaultY = parseFloat(dynamicsEl.getAttribute('default-y') || '0')
          
          // Also check for offset element
          const offsetEl = dirEl.querySelector('offset')
          const offset = offsetEl ? parseInt(offsetEl.textContent || '0', 10) : 0
          
          if (dynamicsText) {
            console.log(`[MusicXMLViewer] Found dynamics: "${dynamicsText}" in measure ${measureNumber}, placement=${placement}, default-x=${defaultX}, default-y=${defaultY}, offset=${offset}`)
            dynamicsData.push({
              measureIndex: measureNumber - 1, // Convert to 0-based index
              defaultX: defaultX + offset, // Combine default-x and offset
              defaultY,
              text: dynamicsText,
              placement
            })
          }
        }
        
        // Check for octave-shift
        const octaveShiftEl = dirEl.querySelector('octave-shift')
        if (octaveShiftEl) {
          const type = octaveShiftEl.getAttribute('type') || ''
          const size = parseInt(octaveShiftEl.getAttribute('size') || '0', 10)
          if (type === 'up') {
            currentOctaveShift = size || 1 // Typically 1 for 8va
            console.log('MusicXMLViewer: Found octave-shift up:', currentOctaveShift)
          } else if (type === 'down') {
            currentOctaveShift = -(size || 1) // Typically -1 for 8vb
            console.log('MusicXMLViewer: Found octave-shift down:', currentOctaveShift)
          } else if (type === 'stop') {
            currentOctaveShift = 0
            console.log('MusicXMLViewer: Found octave-shift stop')
          }
        }
      })
      
      // Track global note index for ties/slurs that span measures
      let globalNoteIndex = 0
      const allSlurData: Array<{ noteIndex: number; type: 'start' | 'stop'; number: string; measureIndex: number; localNoteIndex: number }> = []
      const allTieData: Array<{ noteIndex: number; type: 'start' | 'stop'; number?: string }> = []
      
      // Store all stave notes globally so we can access them for cross-measure slurs
      const allStaveNotes: Array<{ staveNote: any; measureIndex: number; localNoteIndex: number }> = []

      // Track current attributes (for handling changes mid-score)
      let currentClef = clef
      let currentKeySignature = keySignature
      let currentTimeSignature = '4/4'

      // Process each measure separately
      measureData.forEach((measureInfo, measureIndex) => {
        // Skip empty measures (no notes)
        if (measureInfo.notes.length === 0) {
          console.log(`MusicXMLViewer: Skipping empty measure ${measureIndex + 1}`)
          return
        }

        console.log(`MusicXMLViewer: Processing measure ${measureIndex + 1} with ${measureInfo.notes.length} notes`)
        
        // Check for attribute changes in this measure
        const attributes = measureInfo.element.querySelector('attributes')
        if (attributes) {
          const clefEl = attributes.querySelector('clef sign')
          if (clefEl) {
            const clefSign = clefEl.textContent?.toLowerCase() || 'g'
            const clefLine = clefEl.parentElement?.querySelector('line')?.textContent || '2'
            if (clefSign === 'f') {
              currentClef = 'bass'
            } else if (clefSign === 'c' && clefLine === '3') {
              currentClef = 'alto'
            } else if (clefSign === 'c' && clefLine === '4') {
              currentClef = 'tenor'
            } else {
              currentClef = 'treble'
            }
          }

          const keyEl = attributes.querySelector('key fifths')
          if (keyEl) {
            const fifths = parseInt(keyEl.textContent || '0', 10)
            const majorKeys: Record<number, string> = {
              0: 'C', 1: 'G', 2: 'D', 3: 'A', 4: 'E', 5: 'B', 6: 'F#', 7: 'C#',
              [-1]: 'F', [-2]: 'Bb', [-3]: 'Eb', [-4]: 'Ab', [-5]: 'Db', [-6]: 'Gb', [-7]: 'Cb'
            }
            if (majorKeys[fifths] !== undefined) {
              currentKeySignature = majorKeys[fifths]
            }
          }

          const timeEl = attributes.querySelector('time')
          if (timeEl) {
            const beatsEl = timeEl.querySelector('beats')
            const beatTypeEl = timeEl.querySelector('beat-type')
            if (beatsEl && beatTypeEl) {
              const beats = beatsEl.textContent || '4'
              const beatType = beatTypeEl.textContent || '4'
              currentTimeSignature = `${beats}/${beatType}`
            }
          }
        }

        // Get the calculated width for this measure (once, reuse throughout)
        const currentMeasureWidth = measureWidths[measureIndex] || 160
        
        // Create stave for this measure
        const stave = new Stave(currentX, staveY, currentMeasureWidth)
        
        // Add clef, key signature, and time signature
        // Only on first measure, or when they change
        const shouldAddAttributes = measureIndex === 0 || 
          (attributes && (attributes.querySelector('clef') || attributes.querySelector('key') || attributes.querySelector('time')))
        
        if (shouldAddAttributes) {
          if (currentClef === 'treble') {
            stave.addClef('treble')
          } else if (currentClef === 'bass') {
            stave.addClef('bass')
          } else if (currentClef === 'alto') {
            stave.addClef('alto')
          } else if (currentClef === 'tenor') {
            stave.addClef('tenor')
          }

          // Add key signature if available
          if (currentKeySignature) {
            try {
              stave.addKeySignature(currentKeySignature)
            } catch (keyError) {
              console.warn('Error adding key signature:', keyError)
            }
          }

          // Add time signature
          stave.addTimeSignature(currentTimeSignature)
        }

        // Set barline type at end of stave
        stave.setEndBarType(measureInfo.barlineType)

        stave.setContext(context).draw()

        // Convert notes to VexFlow format for this measure
        const staveNotes: any[] = []
        const measureSlurData: Array<{ noteIndex: number; type: 'start' | 'stop'; number: string }> = []
        const measureTieData: Array<{ noteIndex: number; type: 'start' | 'stop'; number?: string }> = []

        measureInfo.notes.forEach((noteEl, localNoteIndex) => {
          const currentNoteIndex = globalNoteIndex

          // Check for octave-shift in notations (less common, but possible)
          const octaveShiftEl = noteEl.querySelector('notations octave-shift')
          if (octaveShiftEl) {
            const shiftType = octaveShiftEl.getAttribute('type') || ''
            const size = parseInt(octaveShiftEl.getAttribute('size') || '0', 10)
            if (shiftType === 'up') {
              currentOctaveShift = size || 1
            } else if (shiftType === 'down') {
              currentOctaveShift = -(size || 1)
            } else if (shiftType === 'stop') {
              currentOctaveShift = 0
            }
          }
          
          const pitchEl = noteEl.querySelector('pitch')
          if (!pitchEl) {
            // Handle rests
            const durationEl = noteEl.querySelector('duration')
            const typeEl = noteEl.querySelector('type')
            const dotEl = noteEl.querySelector('dot')
            const duration = durationEl ? parseInt(durationEl.textContent || '4', 10) : 4
            const type = typeEl ? typeEl.textContent || 'quarter' : 'quarter'
            const hasDot = dotEl !== null

            // Convert MusicXML duration to VexFlow duration
            const durationMap: Record<string, string> = {
              'whole': 'w',
              'half': 'h',
              'quarter': 'q',
              'eighth': '8',
              '16th': '16'
            }
            const vexDuration = durationMap[type.toLowerCase()] || 'q'

            const rest = new StaveNote({
              clef: currentClef,
              keys: ['b/4'], // Dummy key for rest
              duration: vexDuration + 'r' // Add 'r' for rest (e.g., 'qr' for quarter rest)
            })
            ;(rest as any).rest = true
            // Add dot if present - use addModifier with Dot
            if (hasDot) {
              try {
                const dot = new Dot()
                rest.addModifier(dot, 0)
              } catch (dotError) {
                console.warn('Error adding dot to rest:', dotError)
              }
            }
            staveNotes.push(rest)
            // Store globally for cross-measure slurs
            allStaveNotes.push({
              staveNote: rest,
              measureIndex,
              localNoteIndex
            })
            globalNoteIndex++
            return
          }

          // Handle regular notes
          const stepEl = pitchEl.querySelector('step')
          const octaveEl = pitchEl.querySelector('octave')
          const alterEl = pitchEl.querySelector('alter')
          const durationEl = noteEl.querySelector('duration')
          const typeEl = noteEl.querySelector('type')
          const dotEl = noteEl.querySelector('dot')

          const step = stepEl?.textContent?.trim() || 'C'
          const octaveText = octaveEl?.textContent?.trim() || '4'
          let octave = parseInt(octaveText, 10)
          
          // Apply transpose octave adjustment from attributes
          if (transposeOctaves !== 0) {
            octave += transposeOctaves
          }
          
          // Apply octave shift if present (8va, 8vb, etc.)
          if (currentOctaveShift !== 0) {
            octave += currentOctaveShift
          }
          
          const alter = alterEl ? parseInt(alterEl.textContent?.trim() || '0', 10) : 0
          const type = typeEl ? typeEl.textContent?.trim() || 'quarter' : 'quarter'
          const hasDot = dotEl !== null
          
          // Debug: log note details
          console.log(`MusicXMLViewer: Measure ${measureIndex + 1}, Note ${localNoteIndex + 1}: ${step}${octave} (${type})`)

          // Build pitch string for VexFlow
          let pitch = `${step}/${octave}`
          if (alter === 1) {
            pitch = `${step}#/${octave}`
          } else if (alter === -1) {
            pitch = `${step}b/${octave}`
          }

          // Convert MusicXML duration to VexFlow duration
          const durationMap: Record<string, string> = {
            'whole': 'w',
            'half': 'h',
            'quarter': 'q',
            'eighth': '8',
            '16th': '16'
          }
          const vexDuration = durationMap[type.toLowerCase()] || 'q'

          const staveNote = new StaveNote({
            clef: currentClef,
            keys: [pitch],
            duration: vexDuration
          })

          // Add dot if present (must be added before other modifiers)
          if (hasDot) {
            try {
              const dot = new Dot()
              staveNote.addModifier(dot, 0)
            } catch (dotError) {
              console.warn('Error adding dot to note:', dotError)
            }
          }

          // Add accidental if present
          if (alter !== 0) {
            const { Accidental } = Vex.Flow
            let accidentalType = ''
            if (alter === 1) {
              accidentalType = '#'
            } else if (alter === -1) {
              accidentalType = 'b'
            } else if (alter === 0) {
              accidentalType = 'n'
            }
            if (accidentalType) {
              const accidental = new Accidental(accidentalType)
              staveNote.addModifier(accidental, 0)
            }
          }

          // Parse notations (articulations, slurs, and ties)
          const notationsEl = noteEl.querySelector('notations')
          if (notationsEl) {
            // Parse and add articulations
            const articulationsEl = notationsEl.querySelector('articulations')
            if (articulationsEl) {
              const { Articulation } = Vex.Flow
              let articulationType = ''
              
              if (articulationsEl.querySelector('staccatissimo')) {
                articulationType = 'av'
              } else if (articulationsEl.querySelector('staccato')) {
                articulationType = 'a.'
              } else if (articulationsEl.querySelector('strong-accent') || articulationsEl.querySelector('marcato')) {
                articulationType = 'a^'
              } else if (articulationsEl.querySelector('accent')) {
                articulationType = 'a>'
              } else if (articulationsEl.querySelector('tenuto')) {
                articulationType = 'a-'
              }
              
              if (articulationType) {
                try {
                  const articulation = new Articulation(articulationType)
                  staveNote.addModifier(articulation, 0)
                } catch (artError) {
                  console.warn('Error adding articulation:', artError)
                }
              }
            }
            
            // Parse slurs (store with global note index for cross-measure handling)
            const slurEls = notationsEl.querySelectorAll('slur')
            slurEls.forEach((slurEl) => {
              const slurType = slurEl.getAttribute('type')
              const slurNumber = slurEl.getAttribute('number') || '1'
              const slurPlacement = slurEl.getAttribute('placement') || slurEl.getAttribute('orientation') || 'above'
              if (slurType === 'start' || slurType === 'stop') {
                // Log the full slur element for debugging
                console.log(`[MusicXMLViewer] Found slur: type=${slurType}, number=${slurNumber}, placement=${slurPlacement}, measure=${measureIndex + 1}, note=${localNoteIndex + 1}`)
                console.log(`[MusicXMLViewer] Slur XML:`, slurEl.outerHTML)
                measureSlurData.push({
                  noteIndex: localNoteIndex,
                  type: slurType as 'start' | 'stop',
                  number: slurNumber
                })
                allSlurData.push({
                  noteIndex: currentNoteIndex,
                  type: slurType as 'start' | 'stop',
                  number: slurNumber,
                  measureIndex,
                  localNoteIndex
                })
              }
            })
            
            // Parse ties (store with global note index for cross-measure handling)
            const tiedEls = notationsEl.querySelectorAll('tied')
            tiedEls.forEach((tiedEl) => {
              const tieType = tiedEl.getAttribute('type')
              if (tieType === 'start' || tieType === 'stop') {
                measureTieData.push({
                  noteIndex: localNoteIndex,
                  type: tieType as 'start' | 'stop'
                })
                allTieData.push({
                  noteIndex: currentNoteIndex,
                  type: tieType as 'start' | 'stop'
                })
              }
            })
          }
          
          // Also check for tie elements at note level
          const tieEls = noteEl.querySelectorAll('tie')
          tieEls.forEach((tieEl) => {
            const tieType = tieEl.getAttribute('type')
            if (tieType === 'start' || tieType === 'stop') {
              measureTieData.push({
                noteIndex: localNoteIndex,
                type: tieType as 'start' | 'stop'
              })
              allTieData.push({
                noteIndex: currentNoteIndex,
                type: tieType as 'start' | 'stop'
              })
            }
          })

          staveNotes.push(staveNote)
          // Store globally for cross-measure slurs
          allStaveNotes.push({
            staveNote,
            measureIndex,
            localNoteIndex
          })
          globalNoteIndex++
        })

        // Render notes for this measure if any exist
        if (staveNotes.length > 0) {
          // Calculate beats for this measure
          const durationMap: Record<string, number> = {
            'w': 4,
            'h': 2,
            'q': 1,
            '8': 0.5,
            '16': 0.25
          }

          const measureBeats = staveNotes.reduce((sum, note) => {
            const duration = (note as any).duration || 'q'
            return sum + (durationMap[duration] || 1)
          }, 0)

          const totalSixteenths = Math.round(measureBeats * 16)
          const voiceBeats = Math.max(0.25, totalSixteenths / 16)

          // Create voice for this measure
          const voice = new Voice({ 
            num_beats: voiceBeats, 
            beat_value: 4 
          })
          voice.addTickables(staveNotes)

          // Format and draw
          const formatter = new Formatter()
          formatter.joinVoices([voice])
          // Calculate width needed for clef, key signature, and time signature
          const isFirstMeasure = measureIndex === 0
          const isFirstMeasureOfLine = false // Viewer doesn't have multi-line support yet
          let clefKeyTimeWidth = 0
          if (isFirstMeasure || isFirstMeasureOfLine) {
            clefKeyTimeWidth = 60 // Base width for clef
            // Add width for key signature based on number of accidentals
            if (keySignatureFifths > 0) {
              clefKeyTimeWidth += 20 + (keySignatureFifths * 12)
            }
            clefKeyTimeWidth += 40 // Time signature
          }
          const padding = (isFirstMeasure || isFirstMeasureOfLine) ? 15 : 40
          // Calculate formatter width to properly space notes within the measure
          const formatWidth = Math.max(150, currentMeasureWidth - clefKeyTimeWidth - padding)
          
          // Format WITHOUT automatic beaming - we'll create beams manually
          // Clear any existing beams first
          staveNotes.forEach((note) => {
            try {
              // Remove any beams that VexFlow might have attached
              const beams = (note as any).getBeams?.() || []
              beams.forEach((beam: any) => {
                try {
                  ;(beam as any).remove?.(note)
                } catch (e) {
                  // Ignore
                }
              })
              // Clear beams array
              if ((note as any).beams) {
                (note as any).beams = []
              }
            } catch (e) {
              // Ignore if method doesn't exist
            }
          })
          
          // Clear any existing beams before formatting
          staveNotes.forEach((note) => {
            try {
              const beams = (note as any).getBeams?.() || []
              beams.forEach((beam: any) => {
                try {
                  ;(beam as any).remove?.(note)
                } catch (e) {
                  // Ignore
                }
              })
              if ((note as any).beams) {
                (note as any).beams = []
              }
            } catch (e) {
              // Ignore
            }
          })
          
          // Format to position notes (this sets X positions, Y will be calculated when drawing)
          formatter.format([voice], formatWidth)
          
          // Clear any automatic beams before we create our custom ones
          staveNotes.forEach((note) => {
            try {
              const duration = (note as any).duration || 'q'
              const isRest = (note as any).rest || false
              
              // Clear beams from all beamed notes (eighth notes and smaller)
              if ((duration === '8' || duration === '16' || duration === '32' || duration === '64') && !isRest) {
                const existingBeams = (note as any).getBeams?.() || []
                existingBeams.forEach((beam: any) => {
                  try {
                    if (beam && typeof beam.remove === 'function') {
                      beam.remove(note)
                    }
                  } catch (e) {
                    // Ignore
                  }
                })
                if ((note as any).beams && Array.isArray((note as any).beams)) {
                  (note as any).beams.length = 0
                }
                try {
                  (note as any).setBeams?.([])
                } catch (e) {
                  // Ignore
                }
              }
            } catch (err) {
              // Ignore
            }
          })

          // Create beams for eighth notes (and smaller) grouped by musical time (beat)
          // We identify which notes will be in beams BEFORE drawing
          // Parse time signature to get beats per measure
          const timeSigMatch = currentTimeSignature.match(/(\d+)\/(\d+)/)
          const beatsPerMeasure = timeSigMatch ? parseInt(timeSigMatch[1], 10) : 4
          const beatType = timeSigMatch ? parseInt(timeSigMatch[2], 10) : 4
          
          // Detect compound time signatures (6/8, 9/8, 12/8, etc.)
          // Compound time: denominator is 8 (or multiple of 8) and numerator is multiple of 3
          const isCompoundTime = (beatType === 8 || beatType % 8 === 0) && beatsPerMeasure % 3 === 0 && beatsPerMeasure >= 3
          
          // For compound time: group by 3 eighth notes (1.5 beats in quarter note terms)
          // For simple time: group by half-measure (beats 1-2 together, beats 3-4 together for 4/4)
          const beatsPerGroup = isCompoundTime ? 1.5 : beatsPerMeasure / 2
          const maxNotesPerBeam = isCompoundTime ? 3 : 4
          
          const beams: any[] = []
          const beamGroups: Array<{ notes: any[]; beatRange: number }> = []
          const notesInBeams = new Set<any>() // Track notes that will be in beams
          let cumulativeBeat = 0
          
          staveNotes.forEach((note, index) => {
            const duration = (note as any).duration || 'q'
            const isRest = (note as any).rest || false
            const noteDuration = durationMap[duration] || 1
            const noteStartBeat = cumulativeBeat
            
            // Only beam eighth notes and smaller (8, 16, 32, 64)
            // Skip rests as they break beam groups
            if ((duration === '8' || duration === '16' || duration === '32' || duration === '64') && !isRest) {
              // Determine which beat group this note belongs to
              // For 4/4: Beat 0-2 = beats 1-2 (first half), Beat 2-4 = beats 3-4 (second half)
              // Group by half-measure
              const beatGroup = Math.floor(noteStartBeat / beatsPerGroup)
              
              // Find the current group for this beat range, or start a new one
              let currentGroup = beamGroups[beamGroups.length - 1]
              
              // If no group exists or current group is for a different beat range, start new group
              if (!currentGroup || currentGroup.beatRange !== beatGroup) {
                // Finalize previous group if it has 2+ notes
                if (currentGroup && currentGroup.notes.length >= 2) {
                  try {
                    // Split groups larger than maxNotesPerBeam if needed
                    for (let i = 0; i < currentGroup.notes.length; i += maxNotesPerBeam) {
                      const notesSubset = currentGroup.notes.slice(i, i + maxNotesPerBeam)
                      if (notesSubset.length >= 2) {
                        try {
                          const beam = new Beam(notesSubset)
                          beams.push(beam)
                          // Mark these notes as being in a beam
                          notesSubset.forEach((note: any) => notesInBeams.add(note))
                          console.log(`[MusicXMLViewer] Created beam with ${notesSubset.length} notes`)
                        } catch (beamCreateError) {
                          console.error('[MusicXMLViewer] Error creating beam:', beamCreateError)
                        }
                      }
                    }
                  } catch (beamError) {
                    console.warn('Error creating beam:', beamError)
                  }
                }
                
                // Start a new group
                currentGroup = {
                  notes: [],
                  beatRange: beatGroup
                }
                beamGroups.push(currentGroup)
              }
              
              currentGroup.notes.push(note)
            } else {
              // Non-beamed note or rest - finalize current group if it exists
              const finalizingGroup = beamGroups[beamGroups.length - 1]
              if (finalizingGroup && finalizingGroup.notes.length >= 2) {
                try {
                  // Split groups larger than maxNotesPerBeam if needed
                  for (let i = 0; i < finalizingGroup.notes.length; i += maxNotesPerBeam) {
                    const notesSubset = finalizingGroup.notes.slice(i, i + maxNotesPerBeam)
                    if (notesSubset.length >= 2) {
                      const beam = new Beam(notesSubset)
                      beams.push(beam)
                      // Mark these notes as being in a beam
                      notesSubset.forEach((note: any) => notesInBeams.add(note))
                    }
                  }
                } catch (beamError) {
                  console.warn('Error creating beam:', beamError)
                }
              }
              // Remove finalized group from array
              if (beamGroups.length > 0) {
                beamGroups.pop()
              }
            }
            
            cumulativeBeat += noteDuration
          })
          
          // Handle remaining beam groups
          beamGroups.forEach(group => {
            if (group.notes.length >= 2) {
              try {
                // Split groups larger than maxNotesPerBeam if needed
                for (let i = 0; i < group.notes.length; i += maxNotesPerBeam) {
                  const notesSubset = group.notes.slice(i, i + maxNotesPerBeam)
                  if (notesSubset.length >= 2) {
                    const beam = new Beam(notesSubset)
                    beams.push(beam)
                    // Mark these notes as being in a beam
                    notesSubset.forEach((note: any) => notesInBeams.add(note))
                  }
                }
              } catch (beamError) {
                console.warn('Error creating final beam:', beamError)
              }
            }
          })

          // Hide stems for notes that will be in beams BEFORE drawing
          // We'll draw notes individually so we can control stem visibility
          staveNotes.forEach((note) => {
            if (notesInBeams.has(note)) {
              try {
                // Try to hide the stem by modifying renderOptions
                ;(note as any).renderOptions = {
                  ...((note as any).renderOptions || {}),
                  draw_stem: false
                }
              } catch (e) {
                // Ignore if we can't set renderOptions
              }
            }
          })
          
          // Draw notes individually (not using voice.draw()) so we can control stem visibility
          // This calculates Y-coordinates and draws notes
          // Notes in beams will be drawn without stems (if renderOptions worked)
          staveNotes.forEach((note) => {
            try {
              note.setStave(stave)
              note.setContext(context).draw()
            } catch (drawError) {
              console.warn('Error drawing note:', drawError)
            }
          })
          
          // Draw our custom beams - this draws the horizontal beam lines
          // IMPORTANT: Beams must be drawn AFTER notes so they appear on top
          if (beams.length > 0) {
            console.log(`[MusicXMLViewer] Drawing ${beams.length} beams for measure ${measureIndex + 1}`)
            beams.forEach((beam, beamIndex) => {
              try {
                // Ensure beam has context
                beam.setContext(context)
                // Draw the beam
                beam.draw()
                console.log(`[MusicXMLViewer] Beam ${beamIndex + 1} drawn successfully`)
              } catch (drawError) {
                console.error(`[MusicXMLViewer] Error drawing beam ${beamIndex + 1}:`, drawError)
              }
            })
          } else {
            console.log(`[MusicXMLViewer] No beams to draw for measure ${measureIndex + 1} (${staveNotes.length} notes)`)
          }
          
          // Clear and redraw to ensure our beams are visible
          // This helps override any automatic beams that VexFlow created

          // Draw ties within this measure
          const tieStarts: Array<{ note: any; index: number }> = []
          const tieStops: Array<{ note: any; index: number }> = []
          
          measureTieData.forEach(({ noteIndex, type }) => {
            const staveNote = staveNotes[noteIndex]
            if (!staveNote || (staveNote as any).rest) return
            
            if (type === 'start') {
              tieStarts.push({ note: staveNote, index: noteIndex })
            } else if (type === 'stop') {
              tieStops.push({ note: staveNote, index: noteIndex })
            }
          })
          
          // Pair starts with stops
          for (let i = 0; i < Math.min(tieStarts.length, tieStops.length); i++) {
            const start = tieStarts[i]
            const stop = tieStops[i]
            
            if (start && stop && start.index < stop.index) {
              try {
                const tie = new Tie({
                  first_note: start.note,
                  last_note: stop.note,
                  first_indices: [0],
                  last_indices: [0]
                })
                tie.setContext(context)
                tie.draw()
              } catch (tieError) {
                console.warn('Error drawing tie:', tieError)
              }
            }
          }

          // Slurs will be processed after all measures are drawn (to handle cross-measure slurs)
          
          // Draw dynamics for this measure
          const measureDynamics = dynamicsData.filter(d => d.measureIndex === measureIndex)
          measureDynamics.forEach(({ text, placement, defaultX, defaultY }) => {
            try {
              // Convert MusicXML tenths to pixels (40 tenths = 1 staff space, 1 staff space ≈ 12 pixels)
              // defaultX is relative to the start of the measure
              const dynamicsX = currentX + (defaultX / 40) * 12 // Convert tenths to pixels
              
              // Calculate Y position (above or below the staff)
              // defaultY is in tenths, negative means above the staff
              // For placement="below", we want it below the staff
              let dynamicsY: number
              if (placement === 'above') {
                // Use defaultY if available, otherwise position above
                dynamicsY = staveY - 30 + (defaultY / 40) * 12
              } else {
                // Below the staff
                dynamicsY = staveY + 100 + (defaultY / 40) * 12
              }
              
              context.save()
              context.setFont('Arial', 14, 'normal')
              context.setFillStyle('#000000')
              context.fillText(text, dynamicsX, dynamicsY)
              context.restore()
              
              console.log(`[MusicXMLViewer] Drew dynamics "${text}" at (${dynamicsX.toFixed(1)}, ${dynamicsY.toFixed(1)}) - defaultX=${defaultX}, defaultY=${defaultY}`)
            } catch (dynamicsError) {
              console.warn('Error drawing dynamics:', dynamicsError)
            }
          })
        }

        // Move to next measure position using the calculated width (already defined above)
        currentX += currentMeasureWidth
      })

      // Now process all cross-measure slurs using global note indices
      console.log(`[MusicXMLViewer] Processing ${allSlurData.length} total slur events across all measures`)
      const { Curve } = Vex.Flow
      
      // Group slurs by number, but keep them in order
      const globalSlurEventsByNumber = new Map<string, Array<{ noteIndex: number; type: 'start' | 'stop'; staveNote: any }>>()
      
      allSlurData.forEach(({ noteIndex, type, number }) => {
        // Find the stave note using global index
        const noteInfo = allStaveNotes[noteIndex]
        if (!noteInfo || !noteInfo.staveNote || (noteInfo.staveNote as any).rest) {
          return
        }
        
        if (!globalSlurEventsByNumber.has(number)) {
          globalSlurEventsByNumber.set(number, [])
        }
        
        globalSlurEventsByNumber.get(number)!.push({
          noteIndex,
          type,
          staveNote: noteInfo.staveNote
        })
      })
      
      // Process each slur number separately
      globalSlurEventsByNumber.forEach((events, number) => {
        console.log(`[MusicXMLViewer] Processing global slur #${number} with ${events.length} events:`, events.map(e => `${e.type}@globalNote${e.noteIndex}`).join(', '))
        
        // Pair start with stop events in order
        let pendingStart: { noteIndex: number; staveNote: any } | null = null
        
        events.forEach(({ noteIndex, type, staveNote }) => {
          if (type === 'start') {
            // If there's a pending start, it means we have an unclosed slur
            if (pendingStart) {
              console.warn(`[MusicXMLViewer] Unclosed slur start at global note ${pendingStart.noteIndex}, closing with next start`)
            }
            pendingStart = { noteIndex, staveNote }
            console.log(`[MusicXMLViewer] Global slur #${number} start at global note ${noteIndex}`)
          } else if (type === 'stop') {
            if (pendingStart) {
              // We have a complete slur from pendingStart to this stop
              const start = pendingStart.staveNote
              const end = staveNote
              console.log(`[MusicXMLViewer] Global slur #${number} stop at global note ${noteIndex}, pairing with start at global note ${pendingStart.noteIndex}`)
              
              try {
                // Get bounding boxes to calculate proper control points for the slur
                const startBBox = start.getBoundingBox()
                const endBBox = end.getBoundingBox()
                
                if (startBBox && endBBox) {
                  // Calculate horizontal distance between note centers
                  const startX = startBBox.x + startBBox.w / 2
                  const endX = endBBox.x + endBBox.w / 2
                  let distance = endX - startX
                  
                  // Ensure distance is positive (start should be before end)
                  let actualStart = start
                  let actualEnd = end
                  if (distance < 0) {
                    // Swap start and end if they're in reverse order
                    actualStart = end
                    actualEnd = start
                    distance = -distance
                    console.log(`[MusicXMLViewer] Swapped global slur start/end due to negative distance`)
                  }
                  
                  // Control points X: position along the curve (relative to start)
                  const cp1X = distance * 0.33  // First control point at 33% of distance
                  const cp2X = distance * 0.67  // Second control point at 67% of distance
                  
                  // Control points Y: negative values position above, positive below
                  let cpY: number
                  if (distance < 50) {
                    // Short slur (2 beamed notes) - subtle curve
                    cpY = -15
                  } else if (distance < 70) {
                    // Medium slur - moderate curve
                    cpY = -20
                  } else {
                    // Long slur - more pronounced curve
                    cpY = -25
                  }
                  
                  console.log(`[MusicXMLViewer] Drawing global slur #${number}: from global note ${pendingStart.noteIndex} to ${noteIndex}, distance=${distance.toFixed(1)}, cp1=(${cp1X.toFixed(1)}, ${cpY.toFixed(1)}), cp2=(${cp2X.toFixed(1)}, ${cpY.toFixed(1)})`)
                  
                  try {
                    const slur = new Curve(actualStart, actualEnd, {
                      cps: [
                        { x: cp1X, y: cpY },
                        { x: cp2X, y: cpY }
                      ],
                      // Position the slur above the notes
                      position: (Curve as any).Position?.NEAR_HEAD || 1
                    })
                    slur.setContext(context)
                    slur.draw()
                  } catch (curveError) {
                    console.error(`[MusicXMLViewer] Error creating global Curve:`, curveError)
                  }
                } else {
                  console.warn(`[MusicXMLViewer] Could not get bounding boxes for global slur #${number}`)
                }
              } catch (slurError) {
                console.warn(`Error drawing global slur #${number}:`, slurError)
              }
              
              pendingStart = null // Clear the pending start
            } else {
              console.warn(`[MusicXMLViewer] Found global slur stop without matching start for slur #${number} at global note ${noteIndex}`)
            }
          }
        })
      })

      console.log('MusicXMLViewer: Notes drawn successfully')

        setLoading(false)
        console.log('MusicXMLViewer: Render complete, loading set to false')
      } catch (err: any) {
        console.error('MusicXMLViewer: Error rendering MusicXML:', err)
        console.error('Error stack:', err.stack)
        setError(err.message || 'Failed to render MusicXML')
        setLoading(false)
      }
    }, 50) // Small delay to ensure DOM is ready

    return () => clearTimeout(timer)
  }, [musicXML, width, height])

  return (
    <div className={`border rounded bg-white p-4 overflow-auto ${className}`} style={{ minHeight: height }}>
      {loading && !error && (
        <div className="flex items-center justify-center p-8">
          <p className="text-sm text-gray-600">Loading score...</p>
        </div>
      )}
      {error && (
        <div className="p-4 border border-red-200 rounded bg-red-50">
          <p className="text-sm text-red-600">Error: {error}</p>
        </div>
      )}
      <div ref={containerRef} style={{ display: loading || error ? 'none' : 'block' }} />
    </div>
  )
}

