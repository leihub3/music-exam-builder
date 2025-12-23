'use client'

import { useEffect, useRef, useState } from 'react'
import Vex from 'vexflow'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Trash2, Undo2, Redo2 } from 'lucide-react'

const { Renderer, Stave, StaveNote, Voice, Formatter, Accidental, Beam, Dot } = Vex.Flow

interface Note {
  id: string
  pitch: string // e.g., "C/4", "D/4", "E/4" or "rest" for rests
  duration: string // e.g., "q" (quarter), "8" (eighth), "w" (whole)
  accidental?: '#' | 'b' | 'n' | null // sharp, flat, natural, or none
  stave: number // Which stave (0 = first stave)
  x: number // Position in beats
  measure?: number // Which measure this note belongs to (0 = first measure)
  isRest?: boolean // true if this is a rest
  dot?: boolean // true if note/rest has a dot (puntillo)
  // Ligaduras (ties and slurs)
  tieStart?: boolean // Start of a tie (ligadura de unión)
  tieEnd?: boolean // End of a tie (ligadura de unión)
  tieId?: string // ID to match tie start/end
  slurStart?: boolean // Start of a slur (ligadura de expresión)
  slurEnd?: boolean // End of a slur (ligadura de expresión)
  slurId?: string // ID to match slur start/end
  // Articulaciones (articulations)
  articulation?: 'staccato' | 'accent' | 'tenuto' | 'staccatissimo' | 'marcato' | null
}

interface Barline {
  id: string
  afterNoteIndex: number // Insert barline after this note index (-1 = start, notes.length = end)
  type: 'single' | 'double' | 'final' | 'repeat-start' | 'repeat-end'
}

interface NotationEditorProps {
  initialNotes?: Note[]
  clef?: 'treble' | 'bass' | 'alto' | 'tenor'
  initialKeySignature?: string
  initialTimeSignature?: string
  initialMeasureCount?: number
  onChange?: (notes: Note[], musicXML?: string) => void
  readOnly?: boolean
}

export function NotationEditor({
  initialNotes = [],
  clef = 'treble',
  initialKeySignature,
  initialTimeSignature,
  initialMeasureCount,
  onChange,
  readOnly = false
}: NotationEditorProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [notes, setNotes] = useState<Note[]>(initialNotes)
  const [history, setHistory] = useState<Note[][]>([initialNotes])
  const [historyIndex, setHistoryIndex] = useState(0)

  // Sync notes and metadata when initial values change (e.g., when loading saved content)
  useEffect(() => {
    console.log('NotationEditor: initialNotes changed', initialNotes?.length || 0, 'notes')
    if (initialNotes && initialNotes.length > 0) {
      console.log('NotationEditor: Setting notes from initialNotes', initialNotes)
      setNotes(initialNotes)
      setHistory([initialNotes])
      setHistoryIndex(0)
    } else if (initialNotes && initialNotes.length === 0) {
      // Explicitly clear notes if initialNotes is empty array
      console.log('NotationEditor: Clearing notes (empty initialNotes)')
      setNotes([])
      setHistory([[]])
      setHistoryIndex(0)
    }
    if (initialKeySignature) {
      setSelectedKeySignature(initialKeySignature)
    }
    if (initialTimeSignature) {
      setSelectedTimeSignature(initialTimeSignature)
    }
    if (initialMeasureCount) {
      setMeasureCount(initialMeasureCount)
    }
    if (clef) {
      setSelectedClef(clef)
    }
  }, [initialNotes, initialKeySignature, initialTimeSignature, initialMeasureCount, clef])
  const [selectedNote, setSelectedNote] = useState<string | null>(null)
  const [selectedDuration, setSelectedDuration] = useState<string>('q') // quarter note
  const [selectedPitch, setSelectedPitch] = useState<string>('C/4')
  const [selectedAccidental, setSelectedAccidental] = useState<'#' | 'b' | 'n' | null>(null)
  const [isRest, setIsRest] = useState<boolean>(false)
  const [selectedDot, setSelectedDot] = useState<boolean>(false) // dot (puntillo)
  const [editMode, setEditMode] = useState<'note' | 'rest' | 'select'>('note') // Mode: note, rest, or select (for moving notes)
  const [selectedNoteForMove, setSelectedNoteForMove] = useState<string | null>(null) // Note selected for moving
  const [draggingNote, setDraggingNote] = useState<boolean>(false) // Whether currently dragging a note
  const [dragStartY, setDragStartY] = useState<number>(0) // Y position when drag started
  const [dragPreviewPitch, setDragPreviewPitch] = useState<string | null>(null) // Preview pitch while dragging
  const notePositionsRef = useRef<Map<string, { x: number; y: number; width: number; height: number }>>(new Map()) // Store actual note positions from rendering
  const [draggedNote, setDraggedNote] = useState<string | null>(null)
  const [staveRef, setStaveRef] = useState<any>(null)
  const [rendererRef, setRendererRef] = useState<any>(null)
  const [tieMode, setTieMode] = useState<boolean>(false) // Mode for creating ties
  const [slurMode, setSlurMode] = useState<boolean>(false) // Mode for creating slurs
  const [firstNoteForTie, setFirstNoteForTie] = useState<string | null>(null) // First note selected for tie
  const [firstNoteForSlur, setFirstNoteForSlur] = useState<string | null>(null) // First note selected for slur
  const [selectedArticulation, setSelectedArticulation] = useState<'staccato' | 'accent' | 'tenuto' | 'staccatissimo' | 'marcato' | null>(null)
  const [selectedClef, setSelectedClef] = useState<'treble' | 'bass' | 'alto' | 'tenor'>(clef)
  const [selectedKeySignature, setSelectedKeySignature] = useState<string>(initialKeySignature || 'C') // Default to C major (no sharps/flats)
  const [selectedTimeSignature, setSelectedTimeSignature] = useState<string>(initialTimeSignature || '4/4') // Default to 4/4
  const [measureCount, setMeasureCount] = useState<number>(initialMeasureCount || (initialNotes.length > 0 ? Math.max(...initialNotes.map(n => (n.measure || 0))) + 1 : 4)) // Start with 4 measures or calculated from notes
  const [currentMeasure, setCurrentMeasure] = useState<number>(0) // Currently active measure for adding notes
  const [measuresPerLine, setMeasuresPerLine] = useState<number>(4) // Measures per line
  const [selectedBarlineType, setSelectedBarlineType] = useState<'single' | 'double' | 'final' | 'repeat-start' | 'repeat-end'>('single')
  const [cursorPreview, setCursorPreview] = useState<{ x: number; y: number; show: boolean; pitch: string | null }>({ x: 0, y: 0, show: false, pitch: null })
  const keySequenceRef = useRef<string>('')
  const keySequenceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Time signature options
  const timeSignatureOptions = [
    { value: '2/2', label: '2/2 (Alla breve) 𝄵', beats: 2, beatType: 2 },
    { value: '2/4', label: '2/4', beats: 2, beatType: 4 },
    { value: '3/4', label: '3/4', beats: 3, beatType: 4 },
    { value: '4/4', label: '4/4 (Common time) 𝄴', beats: 4, beatType: 4 },
    { value: '5/4', label: '5/4', beats: 5, beatType: 4 },
    { value: '6/4', label: '6/4', beats: 6, beatType: 4 },
    { value: '7/4', label: '7/4', beats: 7, beatType: 4 },
    { value: '3/8', label: '3/8', beats: 3, beatType: 8 },
    { value: '5/8', label: '5/8', beats: 5, beatType: 8 },
    { value: '6/8', label: '6/8', beats: 6, beatType: 8 },
    { value: '7/8', label: '7/8', beats: 7, beatType: 8 },
    { value: '9/8', label: '9/8', beats: 9, beatType: 8 },
    { value: '12/8', label: '12/8', beats: 12, beatType: 8 },
    { value: 'C', label: 'C (Common time) 𝄴', beats: 4, beatType: 4 },
    { value: 'C|', label: 'C| (Cut time) 𝄵', beats: 2, beatType: 2 },
  ]

  // Key signature options (fifths in circle of fifths)
  const keySignatureOptions = [
    { value: 'C', label: 'Do Mayor / La menor (C / Am) - Sin alteraciones', fifths: 0 },
    { value: 'G', label: 'Sol Mayor / Mi menor (G / Em) - 1♯', fifths: 1 },
    { value: 'D', label: 'Re Mayor / Si menor (D / Bm) - 2♯', fifths: 2 },
    { value: 'A', label: 'La Mayor / Fa♯ menor (A / F♯m) - 3♯', fifths: 3 },
    { value: 'E', label: 'Mi Mayor / Do♯ menor (E / C♯m) - 4♯', fifths: 4 },
    { value: 'B', label: 'Si Mayor / Sol♯ menor (B / G♯m) - 5♯', fifths: 5 },
    { value: 'F#', label: 'Fa♯ Mayor / Re♯ menor (F♯ / D♯m) - 6♯', fifths: 6 },
    { value: 'C#', label: 'Do♯ Mayor / La♯ menor (C♯ / A♯m) - 7♯', fifths: 7 },
    { value: 'F', label: 'Fa Mayor / Re menor (F / Dm) - 1♭', fifths: -1 },
    { value: 'Bb', label: 'Si♭ Mayor / Sol menor (B♭ / Gm) - 2♭', fifths: -2 },
    { value: 'Eb', label: 'Mi♭ Mayor / Do menor (E♭ / Cm) - 3♭', fifths: -3 },
    { value: 'Ab', label: 'La♭ Mayor / Fa menor (A♭ / Fm) - 4♭', fifths: -4 },
    { value: 'Db', label: 'Re♭ Mayor / Si♭ menor (D♭ / B♭m) - 5♭', fifths: -5 },
    { value: 'Gb', label: 'Sol♭ Mayor / Mi♭ menor (G♭ / E♭m) - 6♭', fifths: -6 },
    { value: 'Cb', label: 'Do♭ Mayor / La♭ menor (C♭ / A♭m) - 7♭', fifths: -7 },
  ]

  // Get pitch options based on selected clef
  const getPitchOptions = (clefType: string) => {
    if (clefType === 'treble') {
      return [
        { value: 'C/4', label: 'Do (C4)' },
        { value: 'D/4', label: 'Re (D4)' },
        { value: 'E/4', label: 'Mi (E4)' },
        { value: 'F/4', label: 'Fa (F4)' },
        { value: 'G/4', label: 'Sol (G4)' },
        { value: 'A/4', label: 'La (A4)' },
        { value: 'B/4', label: 'Si (B4)' },
        { value: 'C/5', label: 'Do (C5)' },
        { value: 'D/5', label: 'Re (D5)' },
        { value: 'E/5', label: 'Mi (E5)' },
        { value: 'F/5', label: 'Fa (F5)' },
        { value: 'G/5', label: 'Sol (G5)' },
      ]
    } else if (clefType === 'bass') {
      return [
        { value: 'E/2', label: 'Mi (E2)' },
        { value: 'F/2', label: 'Fa (F2)' },
        { value: 'G/2', label: 'Sol (G2)' },
        { value: 'A/2', label: 'La (A2)' },
        { value: 'B/2', label: 'Si (B2)' },
        { value: 'C/3', label: 'Do (C3)' },
        { value: 'D/3', label: 'Re (D3)' },
        { value: 'E/3', label: 'Mi (E3)' },
        { value: 'F/3', label: 'Fa (F3)' },
        { value: 'G/3', label: 'Sol (G3)' },
        { value: 'A/3', label: 'La (A3)' },
        { value: 'B/3', label: 'Si (B3)' },
      ]
    } else if (clefType === 'alto') {
      return [
        { value: 'F/3', label: 'Fa (F3)' },
        { value: 'G/3', label: 'Sol (G3)' },
        { value: 'A/3', label: 'La (A3)' },
        { value: 'B/3', label: 'Si (B3)' },
        { value: 'C/4', label: 'Do (C4)' },
        { value: 'D/4', label: 'Re (D4)' },
        { value: 'E/4', label: 'Mi (E4)' },
        { value: 'F/4', label: 'Fa (F4)' },
        { value: 'G/4', label: 'Sol (G4)' },
        { value: 'A/4', label: 'La (A4)' },
        { value: 'B/4', label: 'Si (B4)' },
        { value: 'C/5', label: 'Do (C5)' },
      ]
    } else if (clefType === 'tenor') {
      return [
        { value: 'D/3', label: 'Re (D3)' },
        { value: 'E/3', label: 'Mi (E3)' },
        { value: 'F/3', label: 'Fa (F3)' },
        { value: 'G/3', label: 'Sol (G3)' },
        { value: 'A/3', label: 'La (A3)' },
        { value: 'B/3', label: 'Si (B3)' },
        { value: 'C/4', label: 'Do (C4)' },
        { value: 'D/4', label: 'Re (D4)' },
        { value: 'E/4', label: 'Mi (E4)' },
        { value: 'F/4', label: 'Fa (F4)' },
        { value: 'G/4', label: 'Sol (G4)' },
        { value: 'A/4', label: 'La (A4)' },
      ]
    }
    return []
  }

  const pitchOptions = getPitchOptions(selectedClef)

  const durationOptions = [
    { value: 'w', label: 'Redonda (Whole)' },
    { value: 'h', label: 'Blanca (Half)' },
    { value: 'q', label: 'Negra (Quarter)' },
    { value: '8', label: 'Corchea (Eighth)' },
    { value: '16', label: 'Semicorchea (16th)' },
  ]

  // Convert Y position to pitch (supports ledger lines above and below staff)
  const yToPitch = (lineSpace: number, clefType: string): string | null => {
    // Define base pitches for each clef (line 0 = bottom line of staff)
    let baseStep: string = 'C'
    let baseOctave: number = 4
    
    if (clefType === 'treble') {
      // Treble clef: line 0 = E4 (bottom line)
      baseStep = 'E'
      baseOctave = 4
    } else if (clefType === 'bass') {
      // Bass clef: line 0 = G2 (bottom line)
      baseStep = 'G'
      baseOctave = 2
    } else if (clefType === 'alto') {
      // Alto clef: line 0 = F3 (bottom line)
      baseStep = 'F'
      baseOctave = 3
    } else if (clefType === 'tenor') {
      // Tenor clef: line 0 = D3 (bottom line)
      baseStep = 'D'
      baseOctave = 3
    }
    
    // Diatonic scale order (ascending)
    const diatonicScale = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
    
    // Find base step index
    const baseIndex = diatonicScale.indexOf(baseStep)
    if (baseIndex === -1) return null
    
    // Calculate total diatonic steps from base
    // lineSpace 0 = base, each increment = +1 diatonic step upward
    // IMPORTANT: Check lineSpace directly, not totalSteps, because totalSteps can be positive
    // even when going down if baseIndex is large enough
    let octaveOffset: number
    let stepIndex: number
    
    if (lineSpace >= 0) {
      // Positive or zero lineSpace: going up from base
      // Each lineSpace increment = +1 diatonic step upward
      const totalSteps = baseIndex + lineSpace
      octaveOffset = Math.floor(totalSteps / 7)
      stepIndex = totalSteps % 7
    } else {
      // Negative lineSpace: going down from base
      // Each lineSpace decrement = -1 diatonic step downward
      // e.g., for treble clef (E4, baseIndex=2 in scale ['C','D','E','F','G','A','B']):
      //   lineSpace = -1 -> D4 (one step down: E->D, index 2->1)
      //   lineSpace = -2 -> C4 (two steps down: E->D->C, index 2->0)
      //   lineSpace = -3 -> B3 (three steps down: E->D->C->B, index 2->6, wrapped to previous octave)
      
      // Calculate how many diatonic steps down we're going
      const absLineSpace = Math.abs(lineSpace)
      
      // Calculate the target step index by going backwards in the scale
      // Start from baseIndex and subtract absLineSpace
      let targetIndex = baseIndex - absLineSpace
      
      // Calculate octave offset: if we go negative, we've wrapped to previous octave
      if (targetIndex < 0) {
        // Calculate how many octaves down we need
        // e.g., if baseIndex=2 and absLineSpace=3, targetIndex=-1, so we need 1 octave down
        octaveOffset = -Math.ceil(Math.abs(targetIndex) / 7)
        // Wrap the index to positive
        while (targetIndex < 0) {
          targetIndex += 7
        }
      } else {
        octaveOffset = 0
      }
      
      stepIndex = targetIndex % 7
    }
    
    const step = diatonicScale[stepIndex]
    const octave = baseOctave + octaveOffset
    
    // Ensure octave is valid (not negative or too extreme)
    if (octave < 0 || octave > 9) {
      return null
    }
    
    return `${step}/${octave}`
  }

  // Generate basic MusicXML (simplified version)
  const generateMusicXML = (notesToConvert: Note[]): string => {
    // Group notes by measure
    const notesByMeasure: Note[][] = Array(measureCount).fill(null).map(() => [])
    
    notesToConvert.forEach(note => {
      const measureIndex = note.measure || 0
      if (measureIndex < measureCount) {
        notesByMeasure[measureIndex].push(note)
      }
    })

    // Convert notes to XML for each measure
    const measuresXML = notesByMeasure.map((measureNotes, measureIndex) => {
      const notesXML = measureNotes.map(note => {
      // Handle rests
      if (note.isRest || note.pitch === 'rest') {
        const durationMap: Record<string, number> = {
          'w': 1,
          'h': 2,
          'q': 4,
          '8': 8,
          '16': 16
        }
        const divisions = 4
        const baseDuration = (divisions * 4) / durationMap[note.duration] || 4
        // If note has a dot, add half of the base duration
        const duration = note.dot ? Math.round(baseDuration * 1.5) : baseDuration
        const dotXML = note.dot ? '<dot/>' : ''
        
        return `
        <note>
          <rest/>
          <duration>${duration}</duration>
          <type>${note.duration === 'w' ? 'whole' : note.duration === 'h' ? 'half' : note.duration === 'q' ? 'quarter' : note.duration === '8' ? 'eighth' : '16th'}</type>
          ${dotXML}
        </note>
      `
      }
      
      const [pitchName, octave] = note.pitch.split('/')
      const durationMap: Record<string, number> = {
        'w': 1,
        'h': 2,
        'q': 4,
        '8': 8,
        '16': 16
      }
      const divisions = 4
      const baseDuration = (divisions * 4) / durationMap[note.duration] || 4
      // If note has a dot, add half of the base duration
      const duration = note.dot ? Math.round(baseDuration * 1.5) : baseDuration
      const dotXML = note.dot ? '<dot/>' : ''

      const accidentalXML = note.accidental 
        ? `<alter>${note.accidental === '#' ? '1' : note.accidental === 'b' ? '-1' : '0'}</alter>`
        : ''
      
      // Build notations XML for ties, slurs, and articulations
      let notationsXML = ''
      const hasNotations = note.tieStart || note.tieEnd || note.slurStart || note.slurEnd || note.articulation
      
      if (hasNotations) {
        notationsXML = '<notations>'
        
        // Add articulations
        if (note.articulation) {
          notationsXML += '<articulations>'
          if (note.articulation === 'staccato') {
            notationsXML += '<staccato/>'
          } else if (note.articulation === 'accent') {
            notationsXML += '<accent/>'
          } else if (note.articulation === 'tenuto') {
            notationsXML += '<tenuto/>'
          } else if (note.articulation === 'staccatissimo') {
            notationsXML += '<staccatissimo/>'
          } else if (note.articulation === 'marcato') {
            notationsXML += '<strong-accent type="up"/>'
          }
          notationsXML += '</articulations>'
        }
        
        // Add tie notation
        if (note.tieStart) {
          notationsXML += '<tied type="start"/>'
        }
        if (note.tieEnd) {
          notationsXML += '<tied type="stop"/>'
        }
        
        // Add slur notation
        if (note.slurStart) {
          notationsXML += '<slur type="start" number="1"/>'
        }
        if (note.slurEnd) {
          notationsXML += '<slur type="stop" number="1"/>'
        }
        
        notationsXML += '</notations>'
      }
      
      // Add tie element (separate from notations, used for playback)
      const tieXML = note.tieStart 
        ? '<tie type="start"/>' 
        : note.tieEnd 
        ? '<tie type="stop"/>' 
        : ''
      
      return `
        <note>
          <pitch>
            <step>${pitchName}</step>
            ${accidentalXML}
            <octave>${octave}</octave>
          </pitch>
          ${tieXML}
          <duration>${duration}</duration>
          <type>${note.duration === 'w' ? 'whole' : note.duration === 'h' ? 'half' : note.duration === 'q' ? 'quarter' : note.duration === '8' ? 'eighth' : '16th'}</type>
          ${dotXML}
          ${notationsXML}
        </note>
      `
    }).join('')

    // Get fifths value for key signature
    const keySignatureData = keySignatureOptions.find(k => k.value === selectedKeySignature)
    const fifths = keySignatureData ? keySignatureData.fifths : 0

    // Get time signature values
    const timeSignatureData = timeSignatureOptions.find(t => t.value === selectedTimeSignature)
    const beats = timeSignatureData ? timeSignatureData.beats : 4
    const beatType = timeSignatureData ? timeSignatureData.beatType : 4

      const isLastMeasure = measureIndex === notesByMeasure.length - 1
      
      return `
    <measure number="${measureIndex + 1}">
      ${measureIndex === 0 ? `
      <attributes>
        <divisions>${4}</divisions>
        <key>
          <fifths>${fifths}</fifths>
        </key>
        <time${selectedTimeSignature === 'C' || selectedTimeSignature === 'C|' ? ' symbol="' + (selectedTimeSignature === 'C' ? 'common' : 'cut') + '"' : ''}>
          <beats>${beats}</beats>
          <beat-type>${beatType}</beat-type>
        </time>
        <clef>
          <sign>${selectedClef === 'treble' ? 'G' : selectedClef === 'bass' ? 'F' : 'C'}</sign>
          <line>${selectedClef === 'treble' ? '2' : selectedClef === 'bass' ? '4' : selectedClef === 'alto' ? '3' : '4'}</line>
        </clef>
      </attributes>` : ''}
      ${notesXML}
      ${isLastMeasure ? `
        <barline location="right">
          <bar-style>light-heavy</bar-style>
        </barline>` : ''}
    </measure>`
    }).join('')

    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <part-list>
    <score-part id="P1">
      <part-name>Music</part-name>
    </score-part>
  </part-list>
  <part id="P1">
    ${measuresXML}
  </part>
</score-partwise>`
  }

  const updateNotes = (newNotes: Note[]) => {
    setNotes(newNotes)
    
    // Update history
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(newNotes)
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)

    // Call onChange callback
    if (onChange) {
      onChange(newNotes, generateMusicXML(newNotes))
    }
  }

  useEffect(() => {
    renderNotation()
  }, [notes, selectedClef, selectedKeySignature, selectedTimeSignature, measureCount, currentMeasure, measuresPerLine, selectedNote, selectedNoteForMove, draggingNote, dragPreviewPitch, editMode])

  // Handle keyboard shortcuts
  useEffect(() => {
    if (readOnly) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle keys if not typing in an input/select/textarea
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA') {
        return
      }

      // Navigation shortcuts
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        if (currentMeasure > 0) {
          setCurrentMeasure(currentMeasure - 1)
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        if (currentMeasure < measureCount - 1) {
          setCurrentMeasure(currentMeasure + 1)
        }
      } else if (e.key === 'Home') {
        e.preventDefault()
        setCurrentMeasure(0)
      } else if (e.key === 'End') {
        e.preventDefault()
        setCurrentMeasure(measureCount - 1)
      }
      // Accidental shortcuts
      else if (e.key === '+' || (e.key === '=' && e.shiftKey)) {
        e.preventDefault()
        setSelectedAccidental('#') // sostenido
      } else if (e.key === '-') {
        e.preventDefault()
        setSelectedAccidental('b') // bemol
      } else if (e.key === '=' && !e.shiftKey) {
        e.preventDefault()
        // Toggle becuadro: if already natural, remove it; otherwise set it
        setSelectedAccidental(selectedAccidental === 'n' ? null : 'n')
      }
      // Toggle edit mode: note -> rest -> select -> note (circular)
      else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        if (editMode === 'note') {
          setEditMode('rest')
          setIsRest(true)
          setSelectedNoteForMove(null)
        } else if (editMode === 'rest') {
          setEditMode('select')
          setIsRest(false)
          setSelectedNoteForMove(null)
        } else if (editMode === 'select') {
          setEditMode('note')
          setIsRest(false)
          setSelectedNoteForMove(null)
        }
      }
      // Duration shortcuts
      else if (e.key === '1') {
        e.preventDefault()
        // Clear any existing timeout
        if (keySequenceTimeoutRef.current) {
          clearTimeout(keySequenceTimeoutRef.current)
        }
        // Start sequence for "16"
        keySequenceRef.current = '1'
        // Wait to see if "6" follows
        keySequenceTimeoutRef.current = setTimeout(() => {
          if (keySequenceRef.current === '1') {
            // No "6" followed, apply whole note
            setSelectedDuration('w')
            keySequenceRef.current = ''
          }
        }, 300)
      } else if (e.key === '6' && keySequenceRef.current === '1') {
        e.preventDefault()
        // Clear timeout since we got the full sequence
        if (keySequenceTimeoutRef.current) {
          clearTimeout(keySequenceTimeoutRef.current)
        }
        setSelectedDuration('16') // sixteenth note (semicorchea)
        keySequenceRef.current = ''
      } else if (e.key === '2') {
        e.preventDefault()
        if (keySequenceTimeoutRef.current) {
          clearTimeout(keySequenceTimeoutRef.current)
        }
        setSelectedDuration('h') // half note (blanca)
        keySequenceRef.current = ''
      } else if (e.key === '4') {
        e.preventDefault()
        if (keySequenceTimeoutRef.current) {
          clearTimeout(keySequenceTimeoutRef.current)
        }
        setSelectedDuration('q') // quarter note (negra)
        keySequenceRef.current = ''
      } else if (e.key === '8') {
        e.preventDefault()
        if (keySequenceTimeoutRef.current) {
          clearTimeout(keySequenceTimeoutRef.current)
        }
        setSelectedDuration('8') // eighth note (corchea)
        keySequenceRef.current = ''
      } else {
        // Clear sequence if any other key is pressed
        if (keySequenceTimeoutRef.current) {
          clearTimeout(keySequenceTimeoutRef.current)
        }
        keySequenceRef.current = ''
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (keySequenceTimeoutRef.current) {
        clearTimeout(keySequenceTimeoutRef.current)
      }
    }
  }, [readOnly, currentMeasure, measureCount, isRest, editMode, selectedAccidental, selectedNoteForMove])

  // Helper function to find note at a given position (for Select mode)
  const findNoteAtPosition = (x: number, y: number): Note | null => {
    // Use stored note positions from rendering
    let closestNote: Note | null = null
    let minDistance = Infinity
    const threshold = 35 // Pixel threshold for detecting note clicks - adjusted for better precision

    notes.forEach(note => {
      if (note.isRest || note.pitch === 'rest') return // Skip rests

      const position = notePositionsRef.current.get(note.id)
      if (!position) return // Position not stored yet

      // Calculate note center
      const noteCenterX = position.x + position.width / 2
      const noteCenterY = position.y + position.height / 2
      
      // Calculate distance from click to note center
      const distanceX = Math.abs(x - noteCenterX)
      const distanceY = Math.abs(y - noteCenterY)
      const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY)

      // Check if click is within the expanded bounding box
      // Use a tighter X threshold for better precision, but more generous Y for stems
      const withinX = x >= position.x - (threshold * 0.5) && x <= position.x + position.width + (threshold * 0.5)
      const withinY = y >= position.y - threshold && y <= position.y + position.height + threshold

      // Prioritize notes that are clicked directly (within bounds)
      // Use a weighted distance that favors direct clicks
      if (withinX && withinY) {
        // Direct click - use smaller effective distance (prioritize this)
        const effectiveDistance = distance * 0.5
        if (effectiveDistance < minDistance) {
          minDistance = effectiveDistance
          closestNote = note
        }
      } else if (distance < threshold) {
        // Nearby click - use full distance
        if (distance < minDistance) {
          minDistance = distance
          closestNote = note
        }
      }
    })

    return closestNote
  }

  // Handle click on stave to add note
  useEffect(() => {
    if (readOnly || !canvasRef.current) return

    const handleClick = (e: MouseEvent) => {
      // Don't add notes when in tie/slur mode
      if (tieMode || slurMode) return
      
      // Check if click target is actually the canvas or its SVG content
      const target = e.target as HTMLElement
      if (!target) return
      
      // If clicking on a button or interactive element, don't add note
      if (target.closest('button') || target.closest('select') || target.closest('input')) {
        return
      }

      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return

      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      // In Select mode, don't add notes - just handle selection via mousedown
      if (editMode === 'select') {
        // Selection handled in mousedown event
        return
      }

      const durationMap: Record<string, number> = { 'w': 4, 'h': 2, 'q': 1, '8': 0.5, '16': 0.25 }
      const beatsPerMeasure = getBeatsPerMeasure()
      
      // If adding a rest, check for space and add it directly without pitch calculation
      if (editMode === 'rest' || isRest) {
        // Check if the new rest can fit in current measure
        if (!canFitInMeasure(currentMeasure, selectedDuration, selectedDot)) {
          alert(`No hay espacio en el Compás ${currentMeasure + 1}. Selecciona otro compás o agrega más compases.`)
          return
        }
        const newNote: Note = {
          id: `rest-${Date.now()}-${Math.random()}`,
          pitch: 'rest',
          duration: selectedDuration,
          accidental: null,
          articulation: null,
          dot: selectedDot,
          stave: 0,
          x: notes.length,
          measure: currentMeasure,
          isRest: true
        }
        const newNotes = [...notes, newNote]
        updateNotes(newNotes)
        
        // Calculate if measure is now full
        const notesInCurrentMeasure = newNotes.filter(n => (n.measure || 0) === currentMeasure)
        const totalBeats = notesInCurrentMeasure.reduce((sum, note) => {
          const baseDuration = durationMap[note.duration] || 1
          return sum + (note.dot ? baseDuration * 1.5 : baseDuration)
        }, 0)
        
        // Auto-advance to next measure only if this one is now COMPLETELY full
        if (totalBeats >= beatsPerMeasure && currentMeasure < measureCount - 1) {
          setCurrentMeasure(currentMeasure + 1)
        }
        return
      }
      
      // Only add notes in Note mode (not Select mode)
      if (editMode !== 'note') return
      
      // For notes, calculate pitch from click position (using same function as preview)
      const pitch = calculatePitchFromPosition(x, y)
      
      if (pitch) {
        // Check if there's a rest of the same duration in the current measure that we can replace
        const notesInCurrentMeasure = notes.filter(n => (n.measure || 0) === currentMeasure)
        const restToReplace = notesInCurrentMeasure.find(
          n => n.isRest && n.duration === selectedDuration && n.dot === selectedDot
        )
        
        let newNotes: Note[]
        if (restToReplace) {
          // Replace the rest with the note
          newNotes = notes.map(n => 
            n.id === restToReplace.id 
              ? {
                  ...n,
                  id: `note-${Date.now()}-${Math.random()}`,
                  pitch,
                  accidental: selectedAccidental,
                  articulation: selectedArticulation,
                  isRest: false
                }
              : n
          )
        } else {
          // Check if we can add a new note (if measure has space)
          if (!canFitInMeasure(currentMeasure, selectedDuration, selectedDot)) {
            alert(`No hay espacio en el Compás ${currentMeasure + 1}. Haz clic en un descanso para eliminarlo primero, selecciona otro compás, o agrega más compases.`)
            return
          }
          
          // Add new note
          const newNote: Note = {
            id: `note-${Date.now()}-${Math.random()}`,
            pitch: pitch,
            duration: selectedDuration,
            accidental: selectedAccidental,
            articulation: selectedArticulation,
            dot: selectedDot,
            stave: 0,
            x: notes.length,
            measure: currentMeasure,
            isRest: false
          }
          newNotes = [...notes, newNote]
        }
        
        updateNotes(newNotes)
        
        // Calculate if measure is now full
        const notesInCurrentMeasureAfter = newNotes.filter(n => (n.measure || 0) === currentMeasure)
        const totalBeats = notesInCurrentMeasureAfter.reduce((sum, note) => {
          const baseDuration = durationMap[note.duration] || 1
          return sum + (note.dot ? baseDuration * 1.5 : baseDuration)
        }, 0)
        
        // Auto-advance to next measure only if this one is now COMPLETELY full
        if (totalBeats >= beatsPerMeasure && currentMeasure < measureCount - 1) {
          setCurrentMeasure(currentMeasure + 1)
        }
      }
    }

    // Helper function to calculate pitch from mouse position (used by both preview and click)
    const calculatePitchFromPosition = (x: number, y: number): string | null => {
      const staveHeight = 200
      const lineSpacing = 12
      const totalLineHeight = staveHeight + lineSpacing
      const lineIndex = Math.floor(y / totalLineHeight)
      const staveContainerTop = lineIndex * totalLineHeight + 40
      
      // VexFlow staff lines are positioned within the stave container
      // The first line is approximately 60px from the stave container top
      // Each line/space is 10px apart
      const staffLinesOffset = 60
      const staffLinesStart = staveContainerTop + staffLinesOffset
      const relativeY = y - staffLinesStart
      
      // Check bounds - allow extended range for ledger lines above and below staff
      // Allow up to 6 ledger lines above (about -60px) and many below (about +150px for lower notes)
      // This allows going well below C4 in treble clef (e.g., down to C3 or lower)
      if (relativeY < -60 || relativeY > 150) return null
      if (x < 10) return null
      
      // Calculate which line/space (0 = first line, 1 = first space, 2 = second line, etc.)
      // Each line/space is 10px, so we divide by 10 and round to nearest
      // IMPORTANT: Invert the calculation because Y increases downward but pitches increase upward
      // When relativeY is small (mouse up), we want higher pitches (larger lineSpace)
      // When relativeY is large (mouse down), we want lower pitches (smaller lineSpace)
      // The staff has approximately 5 lines (0-4) plus spaces, so max lineSpace is around 8-9
      // If relativeY ranges from 0 (bottom line) to ~40 (top line), we invert it:
      const lineSpaceHeight = 10
      const maxStaffHeight = 40 // Approximate height from first to last line
      // Invert: when relativeY=0 (bottom), lineSpace should be max; when relativeY=max (top), lineSpace should be 0
      // Extended range: allow negative values (below staff) and values > 8 (above staff)
      const lineSpace = Math.round((maxStaffHeight - relativeY) / lineSpaceHeight)
      
      return yToPitch(lineSpace, selectedClef)
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (readOnly || !canvasRef.current) return
      
      const rect = canvasRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      
      // Handle note dragging in Select mode - store preview pitch and update note in real-time
      if (editMode === 'select' && draggingNote && selectedNoteForMove) {
        // Calculate new pitch based on Y position for preview
        const newPitch = calculatePitchFromPosition(x, y)
        if (newPitch) {
          // Store preview pitch - will be used to update note on mouseup
          setDragPreviewPitch(newPitch)
          
          // Update note pitch in real-time for visual feedback
          // Use a separate state update to avoid triggering history
          const currentNote = notes.find(n => n.id === selectedNoteForMove)
          if (currentNote && newPitch !== currentNote.pitch && !currentNote.isRest) {
            // Create a temporary updated note for visual feedback
            const updatedNotes = notes.map(note => {
              if (note.id === selectedNoteForMove) {
                return { ...note, pitch: newPitch }
              }
              return note
            })
            // Use setNotes directly (not updateNotes) to avoid adding to history during drag
            // This is just for visual feedback - final update happens on mouseup
            setNotes(updatedNotes)
          }
        }
        return
      }
      
      // Check if mouse is within canvas bounds
      if (x >= 0 && y >= 0 && x <= rect.width && y <= rect.height) {
        // Calculate the pitch at cursor position (same logic as click handler)
        const pitch = !isRest && editMode !== 'select' ? calculatePitchFromPosition(x, y) : null
        setCursorPreview({ x, y, show: true, pitch })
      } else {
        setCursorPreview({ x: 0, y: 0, show: false, pitch: null })
      }
    }

    const handleMouseDown = (e: MouseEvent) => {
      if (readOnly || !canvasRef.current || editMode !== 'select') return
      
      // If clicking on a button or interactive element, don't select note
      const target = e.target as HTMLElement
      if (target.closest('button') || target.closest('select') || target.closest('input')) {
        return
      }
      
      const rect = canvasRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      
      console.log('Select mode: mousedown at', x, y)
      console.log('Stored positions:', Array.from(notePositionsRef.current.entries()).map(([id, pos]) => ({ id, ...pos })))
      
      // Find note at click position
      const clickedNote = findNoteAtPosition(x, y)
      if (clickedNote) {
        console.log('Note found:', clickedNote.id, clickedNote.pitch)
        setSelectedNoteForMove(clickedNote.id)
        setDragStartY(y)
        setDraggingNote(true)
        e.preventDefault() // Prevent default to enable drag
      } else {
        console.log('No note found at position')
        // Clicked on empty space, deselect
        setSelectedNoteForMove(null)
        setDraggingNote(false)
      }
    }

    const handleMouseUp = (e: MouseEvent) => {
      if (readOnly || !canvasRef.current) return
      
      // Complete note drag if in Select mode
      if (editMode === 'select' && draggingNote && selectedNoteForMove) {
        const rect = canvasRef.current.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        
        // Use the last preview pitch from mousemove, or calculate final position
        const finalPitch = dragPreviewPitch || calculatePitchFromPosition(x, y)
        if (finalPitch) {
          console.log('Updating note pitch to:', finalPitch)
          // Get the current state of notes (which may have been updated during drag)
          const currentNote = notes.find(n => n.id === selectedNoteForMove)
          if (currentNote && !currentNote.isRest) {
            // Calculate accidental if needed (from key signature or explicit)
            let accidental = currentNote.accidental // Preserve existing accidental initially
            
            // TODO: Calculate accidental from key signature if needed
            
            // Update the note with final pitch using updateNotes (which handles history)
            const newNotes = notes.map(note => {
              if (note.id === selectedNoteForMove) {
                return { ...note, pitch: finalPitch, accidental }
              }
              return note
            })
            updateNotes(newNotes)
          }
        }
        
        setDraggingNote(false)
        setDragStartY(0)
        setDragPreviewPitch(null)
      }
    }

    const handleMouseLeave = () => {
      setCursorPreview({ x: 0, y: 0, show: false, pitch: null })
      // Cancel drag if mouse leaves canvas
      if (draggingNote) {
        setDraggingNote(false)
        setDragStartY(0)
      }
    }

    const canvas = canvasRef.current
    if (canvas) {
      canvas.addEventListener('click', handleClick)
      canvas.addEventListener('mousedown', handleMouseDown)
      canvas.addEventListener('mousemove', handleMouseMove)
      canvas.addEventListener('mouseup', handleMouseUp)
      canvas.addEventListener('mouseleave', handleMouseLeave)
      return () => {
        canvas.removeEventListener('click', handleClick)
        canvas.removeEventListener('mousedown', handleMouseDown)
        canvas.removeEventListener('mousemove', handleMouseMove)
        canvas.removeEventListener('mouseup', handleMouseUp)
        canvas.removeEventListener('mouseleave', handleMouseLeave)
      }
    }
  }, [notes, selectedClef, selectedDuration, selectedAccidental, isRest, editMode, selectedNoteForMove, draggingNote, dragPreviewPitch, readOnly, history, historyIndex, onChange, tieMode, slurMode, selectedArticulation, currentMeasure, measureCount, measuresPerLine])

  const renderNotation = () => {
    if (!canvasRef.current) return

    // Clear previous render
    canvasRef.current.innerHTML = ''
    
    // Clear stored note positions
    notePositionsRef.current.clear()

    // Group notes by measure
    const notesByMeasure: Note[][] = Array(measureCount).fill(null).map(() => [])
    
    notes.forEach(note => {
      const measureIndex = note.measure || 0
      if (measureIndex < measureCount) {
        notesByMeasure[measureIndex].push(note)
      }
    })
    

    // Calculate canvas dimensions based on measures per line
    const baseMeasureWidth = 250
    const staveHeight = 200
    const lineSpacing = 12 // Space between lines (reduced by ~70%)
    const numberOfLines = Math.ceil(measureCount / measuresPerLine)
    
    // Calculate extra width needed for key signature on first measure of each line
    let keySignatureExtraWidth = 0
    const keySignatureData = keySignatureOptions.find(k => k.value === selectedKeySignature)
    const fifths = keySignatureData ? Math.abs(keySignatureData.fifths) : 0
    if (fifths >= 5) {
      // Add extra width for measures with 5+ accidentals
      // More aggressive increase for 6-7 accidentals to ensure enough space
      keySignatureExtraWidth = fifths === 7 ? 150 : fifths === 6 ? 110 : ((fifths - 4) * 35)
    }
    
    // Calculate canvas width: base width per measure + extra width for first measure(s) on each line
    // Each line's first measure gets extra width if there's a large key signature
    const measuresInFirstLine = Math.min(measureCount, measuresPerLine)
    const extraWidthForFirstLine = numberOfLines > 0 ? keySignatureExtraWidth : 0
    // Calculate total width: all measures at base width + extra width for first measure of first line
    // For subsequent lines, the extra width is accounted for when we position measures
    const baseCanvasWidth = measuresInFirstLine * baseMeasureWidth + extraWidthForFirstLine + 70
    const canvasWidth = baseCanvasWidth
    const canvasHeight = numberOfLines * staveHeight + (numberOfLines - 1) * lineSpacing

    // Create renderer
    const renderer = new Renderer(canvasRef.current, Renderer.Backends.SVG)
    renderer.resize(canvasWidth, canvasHeight)
    const context = renderer.getContext()
    context.setFont('Arial', 10)

    // Render each measure
    const staves: any[] = []
    let xPosition = 10
    let yPosition = 40
    let measuresInCurrentLine = 0

    // Only render staves for measures that exist (up to measureCount)
    for (let measureIndex = 0; measureIndex < measureCount; measureIndex++) {
      const measureNotes = notesByMeasure[measureIndex] || []
      const isFirstMeasure = measureIndex === 0
      const isLastMeasure = measureIndex === measureCount - 1
      const isFirstMeasureOfLine = measuresInCurrentLine === 0
      
      // Move to next line if needed
      if (measuresInCurrentLine >= measuresPerLine) {
        yPosition += staveHeight + lineSpacing
        xPosition = 10
        measuresInCurrentLine = 0
      }
      
      // Calculate actual measure width for this measure
      // First measure of each line gets extra width if there's a large key signature
      const actualMeasureWidth = (isFirstMeasure || isFirstMeasureOfLine) 
        ? baseMeasureWidth + keySignatureExtraWidth 
        : baseMeasureWidth
      
      // Create stave for this measure
      // xPosition and yPosition are relative to canvas
      const stave = new Stave(xPosition, yPosition, actualMeasureWidth)
      
      // Add clef, key, and time signature on first measure of each line
      if (isFirstMeasure || isFirstMeasureOfLine) {
        if (selectedClef === 'treble') {
          stave.addClef('treble')
        } else if (selectedClef === 'bass') {
          stave.addClef('bass')
        } else if (selectedClef === 'alto') {
          stave.addClef('alto')
        } else if (selectedClef === 'tenor') {
          stave.addClef('tenor')
        } else {
          stave.addClef('treble') // Default
        }
        
        // Add key signature
        if (selectedKeySignature && selectedKeySignature !== 'C') {
          stave.addKeySignature(selectedKeySignature)
        }
        
        // Add time signature
        stave.addTimeSignature(selectedTimeSignature)
      }
      
      // Add barline at the end of measure
      if (isLastMeasure) {
        stave.setEndBarType(Vex.Flow.Barline.type.END) // Final barline
      } else {
        stave.setEndBarType(Vex.Flow.Barline.type.SINGLE) // Regular barline
      }
      
      // Highlight current measure
      if (measureIndex === currentMeasure && !readOnly) {
        stave.setStyle({ fillStyle: '#e0f2fe', strokeStyle: '#3b82f6' })
      }
      
      stave.setContext(context).draw()
      staves.push({ stave, notes: measureNotes })
      
      xPosition += actualMeasureWidth
      measuresInCurrentLine++
    }
    
    // Store first stave reference for click handling
    if (staves.length > 0) {
      setStaveRef(staves[0].stave)
    }
    setRendererRef(renderer)

    // Render notes for each measure
    staves.forEach(({ stave, notes: measureNotes }, staveIndex) => {
      if (measureNotes.length === 0) return
      
      // Calculate if this is the first measure or first measure of a line
      const isFirstMeasure = staveIndex === 0
      const isFirstMeasureOfLine = staveIndex % measuresPerLine === 0
      
      // Convert notes to VexFlow format
      const staveNotes = measureNotes.map((note: Note, index: number) => {
      // Handle rests - VexFlow uses StaveNote with rest flag
      if (note.isRest || note.pitch === 'rest') {
        const rest = new StaveNote({
          clef: selectedClef,
          keys: ['b/4'], // Dummy key for rest
          duration: note.duration + 'r' // Add 'r' for rest (e.g., 'qr' for quarter rest)
        })
        // Add dot if present - use cast to access addDot method
        if (note.dot) {
          try {
            if ((rest as any).addDot && typeof (rest as any).addDot === 'function') {
              ;(rest as any).addDot(0) // Add dot to the rest
            }
          } catch (dotError) {
            console.warn('Error adding dot to rest:', dotError)
          }
        }
        return rest
      }
      
      // Handle regular notes
      const staveNote = new StaveNote({
        clef: selectedClef,
        keys: [note.pitch],
        duration: note.duration
      })
      
      // Add dot if present (must be added before other modifiers)
      if (note.dot) {
        try {
          const dot = new Dot()
          staveNote.addModifier(dot, 0) // Add dot to the note
        } catch (dotError) {
          console.warn('Error adding dot to note:', dotError)
        }
      }
      
      // Add accidental if present
      // In VexFlow 4.x, use addModifier instead of addAccidental
      if (note.accidental) {
        let accidentalType = ''
        if (note.accidental === '#') {
          accidentalType = '#'
        } else if (note.accidental === 'b') {
          accidentalType = 'b'
        } else if (note.accidental === 'n') {
          accidentalType = 'n'
        }
        
        if (accidentalType) {
          const accidental = new Accidental(accidentalType)
          staveNote.addModifier(accidental, 0) // 0 is the index of the key
        }
      }
      
      // Add articulation if present
      if (note.articulation && !note.isRest) {
        const { Articulation } = Vex.Flow
        let articulationType = ''
        if (note.articulation === 'staccato') {
          articulationType = 'a.'
        } else if (note.articulation === 'accent') {
          articulationType = 'a>'
        } else if (note.articulation === 'tenuto') {
          articulationType = 'a-'
        } else if (note.articulation === 'staccatissimo') {
          articulationType = 'av'
        } else if (note.articulation === 'marcato') {
          articulationType = 'a^'
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
      
      // Add visual indicator for selected note
      // Highlight selected note
      if (selectedNote === note.id) {
        staveNote.setStyle({ fillStyle: '#3b82f6', strokeStyle: '#3b82f6' })
      }
      
      // Highlight note selected for moving (in Select mode)
      if (editMode === 'select' && selectedNoteForMove === note.id) {
        if (draggingNote) {
          // Show preview pitch if dragging
          if (dragPreviewPitch && dragPreviewPitch !== note.pitch) {
            // Note: We can't easily preview the new position visually without re-rendering
            // But we can show the note is being dragged
            staveNote.setStyle({ fillStyle: '#10b981', strokeStyle: '#10b981' })
          } else {
            staveNote.setStyle({ fillStyle: '#10b981', strokeStyle: '#10b981' })
          }
        } else {
          staveNote.setStyle({ fillStyle: '#f59e0b', strokeStyle: '#f59e0b' })
        }
      }
      
      // Add drag handle (store note ID for drag detection)
      ;(staveNote as any).__noteId = note.id
      
      return staveNote
    })

      if (staveNotes.length > 0) {
      // Calculate total beats from notes
      // Duration values in beats: w=4, h=2, q=1, 8=0.5, 16=0.25
      const durationMap: Record<string, number> = {
        'w': 4,   // whole note = 4 beats
        'h': 2,   // half note = 2 beats
        'q': 1,   // quarter note = 1 beat
        '8': 0.5, // eighth note = 0.5 beats
        '16': 0.25 // sixteenth note = 0.25 beats
      }

      const totalBeats = measureNotes.reduce((sum: number, note: Note) => {
        return sum + (durationMap[note.duration] || 1)
      }, 0)
      
      // VexFlow requires that notes sum to exactly the num_beats specified
      // For fractional beats, we need to use a common denominator
      // Convert to sixteenth notes (smallest unit) then back to beats
      const totalSixteenths = Math.round(totalBeats * 16)
      const voiceBeats = Math.max(0.25, totalSixteenths / 16)
      
      // Create voice with beats matching the notes
      const voice = new Voice({ 
        num_beats: voiceBeats, 
        beat_value: 4 
      })
      voice.addTickables(staveNotes)

      // Format and draw
      try {
        const formatter = new Formatter()
        formatter.joinVoices([voice])
        
        // Get the actual measure width for this stave
        // For first measure of each line, it includes the key signature extra width
        const actualMeasureWidth = stave.getWidth()
        
        // Calculate dynamic width for clef, key signature, and time signature
        // Base width for clef and time signature
        let clefKeyTimeWidth = 0
        if (isFirstMeasure || isFirstMeasureOfLine) {
          clefKeyTimeWidth = 60 // Base width for clef
          
          // Add width for key signature based on number of accidentals
          const keySignatureData = keySignatureOptions.find(k => k.value === selectedKeySignature)
          const fifths = keySignatureData ? Math.abs(keySignatureData.fifths) : 0
          
          // Each accidental takes about 12-15px, plus spacing
          // Use a more conservative estimate for clefKeyTimeWidth to maximize note space
          if (fifths > 0) {
            // Reduce the calculation slightly to give more room for notes
            // The actual space needed is slightly less than we were calculating
            clefKeyTimeWidth += 20 + (fifths * 12) // Reduced from 25+14 to 20+12
          }
          
          // Add width for time signature
          clefKeyTimeWidth += 40 // Time signature width
        }
        
        // Use the actual stave width minus the calculated clef/key/time width
        // For first measure with many accidentals, use minimal padding to maximize note space
        // For other measures, use standard padding
        const padding = (isFirstMeasure || isFirstMeasureOfLine) ? 15 : 40
        const formatterWidth = Math.max(150, actualMeasureWidth - clefKeyTimeWidth - padding)
        
        // Clear any existing beams before formatting
        staveNotes.forEach((note: any) => {
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
        
        formatter.format([voice], formatterWidth)
        
        // Create beams BEFORE drawing - following the example approach
        // Parse time signature to get beats per measure
        const timeSigMatch = selectedTimeSignature.match(/(\d+)\/(\d+)/)
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
        
        staveNotes.forEach((staveNote: any, index: number) => {
          const note = measureNotes[index]
          const duration = (staveNote as any).duration || 'q'
          const isRest = (note?.isRest || note?.pitch === 'rest') || false
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
              
              // Start a new group
              currentGroup = {
                notes: [],
                beatRange: beatGroup
              }
              beamGroups.push(currentGroup)
            }
            
            currentGroup.notes.push(staveNote)
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
        
        // Draw notes individually (like the example) instead of using voice.draw()
        // This prevents VexFlow from drawing automatic beams
        staveNotes.forEach((note: any) => {
          try {
            // Hide stem if note is in a beam
            if (notesInBeams.has(note)) {
              try {
                // VexFlow: try to hide the stem by setting renderOptions
                ;(note as any).renderOptions = {
                  ...((note as any).renderOptions || {}),
                  draw_stem: false
                }
              } catch (e) {
                // If renderOptions doesn't work, try accessing the stem directly
                try {
                  const stem = (note as any).stem
                  if (stem) {
                    ;(stem as any).hide = true
                    ;(stem as any).render_stem = false
                  }
                } catch (e2) {
                  // Ignore if we can't hide the stem
                }
              }
            }
            note.setStave(stave)
            note.setContext(context).draw()
          } catch (drawError) {
            console.warn('Error drawing note:', drawError)
          }
        })
        
        // Draw our custom beams
        beams.forEach(beam => {
          try {
            beam.setContext(context).draw()
          } catch (drawError) {
            console.warn('Error drawing beam:', drawError)
          }
        })
        
        // Store note positions for click detection in Select mode
        // Use bounding box after formatter has positioned notes
        // IMPORTANT: Calculate positions AFTER voice.draw() to ensure accurate coordinates
        staveNotes.forEach((staveNote: any, index: number) => {
          const note = measureNotes[index]
          if (!note || note.isRest) return
          
          try {
            // Get bounding box - coordinates are relative to the stave's note area start
            // After drawing, bbox coordinates are relative to where notes actually appear
            const bbox = staveNote.getBoundingBox()
            if (bbox) {
              // Get stave position in canvas coordinates
              const staveX = stave.getX() // This is xPosition (start of stave)
              const staveY = stave.getY() // This is yPosition (top of stave)
              
              // VexFlow's bbox.x is relative to the note area start (after clef/key/time)
              // We need to get the actual note area start position
              // The formatter positions notes starting after clef/key/time signature
              // Calculate clef/key/time width for position calculation
              const keySignatureData = keySignatureOptions.find(k => k.value === selectedKeySignature)
              const fifths = keySignatureData ? Math.abs(keySignatureData.fifths) : 0
              let clefKeyTimeWidth = 0
              if (isFirstMeasure || isFirstMeasureOfLine) {
                clefKeyTimeWidth = 60 // Base width for clef
                if (fifths > 0) {
                  clefKeyTimeWidth += 20 + (fifths * 12)
                }
                clefKeyTimeWidth += 40 // Time signature
              }
              
              // Get actual measure width for this stave
              const actualMeasureWidth = stave.getWidth()
              
              // Calculate note X position: stave start + clef/key/time width + note offset
              // bbox.x is the offset from where notes start (after clef/key/time), not from stave start
              // So we need: staveX + clefKeyTimeWidth + bbox.x
              // However, if bbox.x is abnormally large, it might already include accumulated offsets
              let noteX: number
              
              // Check if bbox.x seems reasonable (within the measure width after clef/key/time)
              const maxExpectedX = actualMeasureWidth - clefKeyTimeWidth
              if (bbox.x >= 0 && bbox.x < maxExpectedX) {
                // Normal case: bbox.x is relative to note area start
                noteX = staveX + clefKeyTimeWidth + bbox.x
              } else {
                // Abnormal case: bbox.x might include accumulated offsets or be incorrect
                // Fall back to calculating based on note index
                const noteIndexInMeasure = measureNotes.indexOf(note)
                const availableWidth = actualMeasureWidth - 100 - clefKeyTimeWidth
                const spacingPerNote = measureNotes.length > 1 
                  ? availableWidth / (measureNotes.length - 1) 
                  : 0
                noteX = staveX + clefKeyTimeWidth + (noteIndexInMeasure * Math.max(spacingPerNote, 40))
              }
              
              // For Y: bbox.y is relative to stave top
              // This should be accurate as is
              const noteY = staveY + bbox.y
              
              // Use the bounding box width and height for accurate click detection
              // Adjust width to focus on notehead area (center of note)
              const noteWidth = Math.max(bbox.w || 30, 20)
              const noteHeight = Math.max(bbox.h || 20, 15)
              
              notePositionsRef.current.set(note.id, {
                x: noteX,
                y: noteY,
                width: noteWidth,
                height: noteHeight
              })
              console.log(`Stored position for note ${note.id} (${note.pitch}):`, {
                x: noteX,
                y: noteY,
                width: noteWidth,
                height: noteHeight,
                staveX,
                staveY,
                bboxX: bbox.x,
                bboxY: bbox.y,
                bboxW: bbox.w,
                bboxH: bbox.h,
                clefKeyTimeWidth,
                measureIndex: note.measure || 0
              })
            }
          } catch (e) {
            // Fallback: calculate approximate position using pitch
            console.warn('Could not get bounding box for note:', note.id, e)
            const [step, octave] = note.pitch.split('/')
            const octaveNum = parseInt(octave)
            
            // Approximate position calculation
            const measureIndex = note.measure || 0
            const staveHeight = 200
            const lineSpacing = 12
            const lineIndex = Math.floor(measureIndex / measuresPerLine)
            const staveYPos = lineIndex * staveHeight + (lineIndex * lineSpacing) + 40
            
            const notePositions: Record<string, number> = {
              'C': 3, 'D': 2.5, 'E': 2, 'F': 1.5, 'G': 1, 'A': 0.5, 'B': 0
            }
            let linePosition = notePositions[step] || 3
            
            if (selectedClef === 'treble') {
              const octaveOffset = (octaveNum - 4) * 3.5
              linePosition += octaveOffset
            } else if (selectedClef === 'bass') {
              const octaveOffset = (octaveNum - 3) * 3.5
              linePosition += octaveOffset
            }
            
            const noteYPos = staveYPos + 60 + (linePosition * 10)
            const measureIndexInLine = measureIndex % measuresPerLine
            const measureXPos = 10 + (measureIndexInLine * baseMeasureWidth)
            const noteIndexInMeasure = notes.filter(n => (n.measure || 0) === measureIndex).indexOf(note)
            const noteXPos = measureXPos + 50 + (noteIndexInMeasure * 40)
            
            notePositionsRef.current.set(note.id, {
              x: noteXPos,
              y: noteYPos,
              width: 30,
              height: 20
            })
          }
        })
        
        // Draw ties (ligaduras de unión) - connect notes with same pitch
        const { Tie } = Vex.Flow as any
        const tieGroups = new Map<string, { start: any; end: any }>()
        
        staveNotes.forEach((staveNote: any, index: number) => {
          const note = measureNotes[index]
          if (!note || note.isRest) return
          
          if (note.tieStart && note.tieId) {
            if (!tieGroups.has(note.tieId)) {
              tieGroups.set(note.tieId, { start: null, end: null })
            }
            tieGroups.get(note.tieId)!.start = staveNote
          }
          
          if (note.tieEnd && note.tieId) {
            if (!tieGroups.has(note.tieId)) {
              tieGroups.set(note.tieId, { start: null, end: null })
            }
            tieGroups.get(note.tieId)!.end = staveNote
          }
        })
        
        // Draw ties
        tieGroups.forEach(({ start, end }) => {
          if (start && end) {
            try {
              const tie = new Tie({
                first_note: start,
                last_note: end,
                first_indices: [0],
                last_indices: [0]
              })
              tie.setContext(context)
              tie.draw()
            } catch (tieError) {
              console.warn('Error drawing tie:', tieError)
            }
          }
        })
        
        // Draw slurs (ligaduras de expresión) - connect different pitches
        const slurGroups = new Map<string, { start: any; end: any }>()
        
        staveNotes.forEach((staveNote: any, index: number) => {
          const note = measureNotes[index]
          if (!note || note.isRest) return
          
          if (note.slurStart && note.slurId) {
            if (!slurGroups.has(note.slurId)) {
              slurGroups.set(note.slurId, { start: null, end: null })
            }
            slurGroups.get(note.slurId)!.start = staveNote
          }
          
          if (note.slurEnd && note.slurId) {
            if (!slurGroups.has(note.slurId)) {
              slurGroups.set(note.slurId, { start: null, end: null })
            }
            slurGroups.get(note.slurId)!.end = staveNote
          }
        })
        
        // Draw slurs using Curve (similar to tie but for different pitches)
        slurGroups.forEach(({ start, end }) => {
          if (start && end) {
            try {
              const { Curve } = Vex.Flow
              const slur = new Curve(start, end, {
                cps: [
                  { x: 0, y: 10 },
                  { x: 0, y: 10 }
                ]
              })
              slur.setContext(context)
              slur.draw()
            } catch (slurError) {
              console.warn('Error drawing slur:', slurError)
            }
          }
        })
      } catch (error) {
        console.error('Error formatting notes:', error)
        // Notes should still be drawn individually even if formatting fails
        // The formatter may have partially positioned them
      }
    }
    }) // Close staves.forEach
  }

  // Calculate beats in a measure based on time signature
  const getBeatsPerMeasure = (): number => {
    const timeSignatureData = timeSignatureOptions.find(t => t.value === selectedTimeSignature)
    return timeSignatureData ? timeSignatureData.beats : 4
  }

  // Check if current measure is full
  const isMeasureFull = (measureIndex: number): boolean => {
    const durationMap: Record<string, number> = {
      'w': 4,
      'h': 2,
      'q': 1,
      '8': 0.5,
      '16': 0.25
    }
    
    const notesInMeasure = notes.filter(n => (n.measure || 0) === measureIndex)
    const totalBeats = notesInMeasure.reduce((sum, note) => {
      const baseDuration = durationMap[note.duration] || 1
      // If note has a dot, add half of the base duration
      const duration = note.dot ? baseDuration * 1.5 : baseDuration
      return sum + duration
    }, 0)
    
    const beatsPerMeasure = getBeatsPerMeasure()
    return totalBeats >= beatsPerMeasure
  }

  // Check if a note/rest with given duration can fit in the measure
  const canFitInMeasure = (measureIndex: number, duration: string, dot: boolean = false): boolean => {
    const durationMap: Record<string, number> = {
      'w': 4,
      'h': 2,
      'q': 1,
      '8': 0.5,
      '16': 0.25
    }
    
    const notesInMeasure = notes.filter(n => (n.measure || 0) === measureIndex)
    const currentBeats = notesInMeasure.reduce((sum, note) => {
      const baseDuration = durationMap[note.duration] || 1
      const duration = note.dot ? baseDuration * 1.5 : baseDuration
      return sum + duration
    }, 0)
    
    const baseNewNoteDuration = durationMap[duration] || 1
    const newNoteDuration = dot ? baseNewNoteDuration * 1.5 : baseNewNoteDuration
    const beatsPerMeasure = getBeatsPerMeasure()
    
    return (currentBeats + newNoteDuration) <= beatsPerMeasure
  }

  // Get beats used in a measure
  const getMeasureBeats = (measureIndex: number): string => {
    const durationMap: Record<string, number> = {
      'w': 4,
      'h': 2,
      'q': 1,
      '8': 0.5,
      '16': 0.25
    }
    
    const notesInMeasure = notes.filter(n => (n.measure || 0) === measureIndex)
    const currentBeats = notesInMeasure.reduce((sum, note) => {
      const baseDuration = durationMap[note.duration] || 1
      return sum + (note.dot ? baseDuration * 1.5 : baseDuration)
    }, 0)
    
    const beatsPerMeasure = getBeatsPerMeasure()
    return `${currentBeats}/${beatsPerMeasure}`
  }

  const addNote = () => {
    // Check if the new note can fit in current measure
    if (!canFitInMeasure(currentMeasure, selectedDuration, selectedDot)) {
      alert(`No hay espacio en el Compás ${currentMeasure + 1}. Selecciona otro compás o agrega más compases.`)
      return
    }
    
    const newNote: Note = {
      id: `note-${Date.now()}-${Math.random()}`,
      pitch: selectedPitch,
      duration: selectedDuration,
      accidental: selectedAccidental,
      articulation: selectedArticulation,
      dot: selectedDot,
      stave: 0,
      x: notes.length,
      measure: currentMeasure,
      isRest: false
    }
    
    const newNotes = [...notes, newNote]
    updateNotes(newNotes)
    
    // Calculate if measure is now full
    const durationMap: Record<string, number> = { 'w': 4, 'h': 2, 'q': 1, '8': 0.5, '16': 0.25 }
    const notesInCurrentMeasure = newNotes.filter(n => (n.measure || 0) === currentMeasure)
    const totalBeats = notesInCurrentMeasure.reduce((sum, note) => {
      const baseDuration = durationMap[note.duration] || 1
      return sum + (note.dot ? baseDuration * 1.5 : baseDuration)
    }, 0)
    const beatsPerMeasure = getBeatsPerMeasure()
    
    // Auto-advance to next measure only if this one is now COMPLETELY full
    if (totalBeats >= beatsPerMeasure && currentMeasure < measureCount - 1) {
      setCurrentMeasure(currentMeasure + 1)
    }
  }

  const addMeasure = () => {
    setMeasureCount(measureCount + 1)
  }

  const removeMeasure = () => {
    if (measureCount <= 1) return
    
    // Remove notes from the last measure
    const newNotes = notes.filter(n => (n.measure || 0) < measureCount - 1)
    setMeasureCount(measureCount - 1)
    
    // Adjust current measure if needed
    if (currentMeasure >= measureCount - 1) {
      setCurrentMeasure(measureCount - 2)
    }
    
    updateNotes(newNotes)
  }

  const addRest = () => {
    // Check if the new rest can fit in current measure
    if (!canFitInMeasure(currentMeasure, selectedDuration, selectedDot)) {
      alert(`No hay espacio en el Compás ${currentMeasure + 1}. Selecciona otro compás o agrega más compases.`)
      return
    }
    
    const newNote: Note = {
      id: `rest-${Date.now()}-${Math.random()}`,
      pitch: 'rest',
      duration: selectedDuration,
      dot: selectedDot,
      stave: 0,
      x: notes.length,
      measure: currentMeasure,
      isRest: true
    }

    const newNotes = [...notes, newNote]
    updateNotes(newNotes)
    
    // Calculate if measure is now full
    const durationMap: Record<string, number> = { 'w': 4, 'h': 2, 'q': 1, '8': 0.5, '16': 0.25 }
    const notesInCurrentMeasure = newNotes.filter(n => (n.measure || 0) === currentMeasure)
    const totalBeats = notesInCurrentMeasure.reduce((sum, note) => {
      const baseDuration = durationMap[note.duration] || 1
      return sum + (note.dot ? baseDuration * 1.5 : baseDuration)
    }, 0)
    const beatsPerMeasure = getBeatsPerMeasure()
    
    // Auto-advance to next measure only if this one is now COMPLETELY full
    if (totalBeats >= beatsPerMeasure && currentMeasure < measureCount - 1) {
      setCurrentMeasure(currentMeasure + 1)
    }
  }

  // Apply articulation to selected note
  const applyArticulation = (articulation: 'staccato' | 'accent' | 'tenuto' | 'staccatissimo' | 'marcato' | null) => {
    if (!selectedNote) {
      // Set as default for new notes
      setSelectedArticulation(articulation)
      return
    }
    
    const newNotes = notes.map(n => {
      if (n.id === selectedNote) {
        return { ...n, articulation }
      }
      return n
    })
    updateNotes(newNotes)
  }

  // Apply dot to selected note
  const applyDot = (dot: boolean) => {
    if (!selectedNote) {
      // Set as default for new notes
      setSelectedDot(dot)
      return
    }
    
    const newNotes = notes.map(n => {
      if (n.id === selectedNote) {
        return { ...n, dot }
      }
      return n
    })
    updateNotes(newNotes)
    setSelectedDot(dot)
  }

  // Handle note drag
  const handleNoteDrag = (noteId: string, newPosition: number) => {
    const newNotes = notes.map(note => {
      if (note.id === noteId) {
        return { ...note, x: newPosition }
      }
      return note
    })
    // Sort by position
    newNotes.sort((a, b) => a.x - b.x)
    updateNotes(newNotes)
  }

  const deleteNote = (noteId: string) => {
    const newNotes = notes.filter(n => n.id !== noteId)
    updateNotes(newNotes)
    setSelectedNote(null)
  }

  // Handle note selection for ties/slurs/articulations
  const handleNoteClick = (noteId: string) => {
    if (readOnly) return
    
    const note = notes.find(n => n.id === noteId)
    if (!note) return
    
    // Allow selecting rests for deletion (useful for "Listen and Complete" exercises)
    if (note.isRest) {
      setSelectedNote(noteId)
      return
    }

    // Update articulation selector when selecting a note
    setSelectedArticulation(note.articulation || null)
    // Update dot state when selecting a note
    setSelectedDot(note.dot || false)

    if (tieMode) {
      if (!firstNoteForTie) {
        // Select first note for tie
        setFirstNoteForTie(noteId)
        setSelectedNote(noteId)
      } else if (firstNoteForTie === noteId) {
        // Deselect if clicking same note
        setFirstNoteForTie(null)
        setSelectedNote(null)
      } else {
        // Create tie between first and second note
        const firstNote = notes.find(n => n.id === firstNoteForTie)
        if (firstNote && firstNote.pitch === note.pitch) {
          // Ties only work for same pitch
          const tieId = `tie-${Date.now()}`
          const newNotes = notes.map(n => {
            if (n.id === firstNoteForTie) {
              return { ...n, tieStart: true, tieId }
            } else if (n.id === noteId) {
              return { ...n, tieEnd: true, tieId }
            }
            return n
          })
          updateNotes(newNotes)
          setFirstNoteForTie(null)
          setTieMode(false)
          setSelectedNote(null)
        } else {
          alert('Las ligaduras de unión (ties) solo funcionan entre notas del mismo pitch')
        }
      }
    } else if (slurMode) {
      if (!firstNoteForSlur) {
        // Select first note for slur
        setFirstNoteForSlur(noteId)
        setSelectedNote(noteId)
      } else if (firstNoteForSlur === noteId) {
        // Deselect if clicking same note
        setFirstNoteForSlur(null)
        setSelectedNote(null)
      } else {
        // Create slur between first and second note
        const slurId = `slur-${Date.now()}`
        const newNotes = notes.map(n => {
          if (n.id === firstNoteForSlur) {
            return { ...n, slurStart: true, slurId }
          } else if (n.id === noteId) {
            return { ...n, slurEnd: true, slurId }
          }
          return n
        })
        updateNotes(newNotes)
        setFirstNoteForSlur(null)
        setSlurMode(false)
        setSelectedNote(null)
      }
    } else {
      // Normal selection
      setSelectedNote(noteId === selectedNote ? null : noteId)
    }
  }

  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      setNotes(history[newIndex])
      if (onChange) {
        onChange(history[newIndex], generateMusicXML(history[newIndex]))
      }
    }
  }

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1
      setHistoryIndex(newIndex)
      setNotes(history[newIndex])
      if (onChange) {
        onChange(history[newIndex], generateMusicXML(history[newIndex]))
      }
    }
  }

  const clearAll = () => {
    updateNotes([])
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      {!readOnly && (
        <div className="border rounded-lg p-4 bg-gray-50 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-8 gap-4">
            {/* Clef Selector */}
            <div className="space-y-2">
              <Label>Clave (Clef)</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedClef}
                onChange={(e) => setSelectedClef(e.target.value as 'treble' | 'bass' | 'alto' | 'tenor')}
              >
                <option value="treble">Sol (Treble) 🎼</option>
                <option value="bass">Fa (Bass) 🎵</option>
                <option value="alto">Do en 3ra (Alto) 🎶</option>
                <option value="tenor">Do en 4ta (Tenor) 🎶</option>
              </select>
            </div>

            {/* Key Signature Selector */}
            <div className="space-y-2 md:col-span-2">
              <Label>Armadura (Key Signature)</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedKeySignature}
                onChange={(e) => setSelectedKeySignature(e.target.value)}
              >
                {keySignatureOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Time Signature Selector */}
            <div className="space-y-2">
              <Label>Compás (Time Signature)</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedTimeSignature}
                onChange={(e) => setSelectedTimeSignature(e.target.value)}
              >
                {timeSignatureOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Pitch Selector */}
            <div className="space-y-2">
              <Label>Nota (Pitch)</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedPitch}
                onChange={(e) => setSelectedPitch(e.target.value)}
                disabled={isRest}
              >
                {pitchOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Accidental Selector */}
            <div className="space-y-2">
              <Label>Alteración <span className="text-xs text-gray-500">(+/-/= toggle)</span></Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedAccidental || ''}
                onChange={(e) => setSelectedAccidental(e.target.value === '' ? null : e.target.value as '#' | 'b' | 'n')}
                disabled={isRest}
              >
                <option value="">Ninguna</option>
                <option value="#">Sostenido (#) [+]</option>
                <option value="b">Bemol (b) [-]</option>
                <option value="n">Becuarto (♮) [= toggle]</option>
              </select>
            </div>

            {/* Duration Selector */}
            <div className="space-y-2">
              <Label>Duración <span className="text-xs text-gray-500">(1/2/4/8/16)</span></Label>
              <div className="flex gap-2 items-center">
                <select
                  className="flex h-10 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={selectedDuration}
                  onChange={(e) => setSelectedDuration(e.target.value)}
                >
                  {durationOptions.map(option => {
                    const shortcut = option.value === 'w' ? '1' : 
                                    option.value === 'h' ? '2' : 
                                    option.value === 'q' ? '4' : 
                                    option.value === '8' ? '8' : 
                                    option.value === '16' ? '16' : ''
                    return (
                      <option key={option.value} value={option.value}>
                        {option.label} {shortcut && `[${shortcut}]`}
                      </option>
                    )
                  })}
                </select>
                <Button
                  type="button"
                  variant={selectedDot ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    const newDot = !selectedDot
                    if (selectedNote) {
                      applyDot(newDot)
                    } else {
                      setSelectedDot(newDot)
                    }
                  }}
                  title="Puntillo (agrega la mitad del valor)"
                  className="h-10 px-3 min-w-[45px] flex items-center justify-center"
                >
                  <span className="text-xl font-bold leading-none">•</span>
                </Button>
              </div>
              {selectedDot && (
                <p className="text-xs text-blue-600">Puntillo activo</p>
              )}
            </div>

            {/* Articulation Selector */}
            <div className="space-y-2">
              <Label>Articulación</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedArticulation || ''}
                onChange={(e) => {
                  const art = e.target.value === '' ? null : e.target.value as 'staccato' | 'accent' | 'tenuto' | 'staccatissimo' | 'marcato'
                  setSelectedArticulation(art)
                  if (selectedNote) {
                    applyArticulation(art)
                  }
                }}
                disabled={isRest}
              >
                <option value="">Ninguna</option>
                <option value="staccato">Staccato (.)</option>
                <option value="accent">Acento (&gt;)</option>
                <option value="tenuto">Tenuto (-)</option>
                <option value="staccatissimo">Staccatissimo (!)</option>
                <option value="marcato">Marcato (^)</option>
              </select>
            </div>

            {/* Note Type Toggle */}
            <div className="space-y-2">
              <Label>Tipo <span className="text-xs text-gray-500">(n)</span></Label>
              <div className="flex flex-col space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    variant={editMode === 'note' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setEditMode('note')
                      setIsRest(false)
                      setSelectedNoteForMove(null)
                    }}
                    className="flex-1"
                    title="Nota (agregar notas)"
                  >
                    <span className="text-xl">♪</span>
                  </Button>
                  <Button
                    type="button"
                    variant={editMode === 'rest' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setEditMode('rest')
                      setIsRest(true)
                      setSelectedNoteForMove(null)
                    }}
                    className="flex-1"
                    title="Silencio (agregar silencios)"
                  >
                    <span className="text-xl">𝄽</span>
                  </Button>
                  <Button
                    type="button"
                    variant={editMode === 'select' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setEditMode('select')
                      setIsRest(false)
                      setSelectedNoteForMove(null)
                    }}
                    className="flex-1"
                    title="Seleccionar (mover notas)"
                  >
                    <span className="text-xl">✋</span>
                  </Button>
                </div>
                {editMode === 'rest' && (
                  <div className="text-xs text-orange-600 font-medium bg-orange-50 px-2 py-1 rounded">
                    ⚠️ Modo Silencio activo
                  </div>
                )}
                {editMode === 'select' && (
                  <div className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded">
                    💡 Haz clic en una nota para seleccionarla, luego arrástrala arriba/abajo para moverla
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              type="button"
              onClick={isRest ? addRest : addNote}
              size="sm"
              className="w-full"
            >
              {isRest ? 'Agregar Silencio' : 'Agregar Nota'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearAll}
              className="w-full"
            >
              Limpiar Todo
            </Button>
            <div className="text-sm text-gray-600 flex items-center justify-center">
              💡 Click en el pentagrama para agregar
            </div>
          </div>

          {/* Measures Control Row */}
          <div className="border-t pt-4 mt-2">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
              <div className="space-y-2">
                <Label>Compás Actual (Current Measure)</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={currentMeasure}
                  onChange={(e) => setCurrentMeasure(Number(e.target.value))}
                >
                  {Array.from({ length: measureCount }, (_, i) => (
                    <option key={i} value={i}>
                      Compás {i + 1} [{getMeasureBeats(i)}]
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500">
                  ⌨️ Use ← → arrow keys to navigate
                </p>
              </div>
              <div className="space-y-2">
                <Label>Compases por Línea</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={measuresPerLine}
                  onChange={(e) => setMeasuresPerLine(Number(e.target.value))}
                >
                  <option value={2}>2 compases</option>
                  <option value={3}>3 compases</option>
                  <option value={4}>4 compases</option>
                  <option value={5}>5 compases</option>
                  <option value={6}>6 compases</option>
                  <option value={8}>8 compases</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Total de Compases</Label>
                <div className="flex h-10 items-center px-3 py-2 text-sm font-medium">
                  {measureCount} compás{measureCount !== 1 ? 'es' : ''} ({Math.ceil(measureCount / measuresPerLine)} línea{Math.ceil(measureCount / measuresPerLine) !== 1 ? 's' : ''})
                </div>
              </div>
              <Button
                type="button"
                onClick={addMeasure}
                size="sm"
                className="w-full"
              >
                ➕ Agregar Compás
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={removeMeasure}
                className="w-full"
                disabled={measureCount <= 1}
              >
                ➖ Quitar Compás
              </Button>
            </div>
            <div className="mt-2 text-sm text-gray-600">
              💡 Las notas se agregan al compás actual. El compás avanza automáticamente cuando se llena.
            </div>
          </div>

          {/* Ligaduras (Ties & Slurs) */}
          <div className="border-t pt-4">
            <Label className="mb-2 block">Ligaduras</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={tieMode ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setTieMode(!tieMode)
                  setSlurMode(false)
                  setFirstNoteForTie(null)
                  setFirstNoteForSlur(null)
                  if (tieMode) setSelectedNote(null)
                }}
                className="w-full"
              >
                {tieMode ? '✓ Ligadura de Unión (Tie)' : 'Ligadura de Unión (Tie)'}
              </Button>
              <Button
                type="button"
                variant={slurMode ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setSlurMode(!slurMode)
                  setTieMode(false)
                  setFirstNoteForTie(null)
                  setFirstNoteForSlur(null)
                  if (slurMode) setSelectedNote(null)
                }}
                className="w-full"
              >
                {slurMode ? '✓ Ligadura de Expresión (Slur)' : 'Ligadura de Expresión (Slur)'}
              </Button>
            </div>
            {(tieMode || slurMode) && (
              <div className="mt-2 space-y-1">
                <p className="text-xs text-gray-600">
                  {tieMode 
                    ? '💡 Selecciona dos notas del mismo pitch para crear una ligadura de unión'
                    : '💡 Selecciona dos notas para crear una ligadura de expresión'}
                </p>
                {tieMode && firstNoteForTie && (
                  <p className="text-xs text-purple-600 font-medium">
                    ✓ Primera nota seleccionada. Haz clic en otra nota del mismo pitch.
                  </p>
                )}
                {slurMode && firstNoteForSlur && (
                  <p className="text-xs text-purple-600 font-medium">
                    ✓ Primera nota seleccionada. Haz clic en otra nota para completar la ligadura.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* History Controls */}
          <div className="flex space-x-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={undo}
              disabled={historyIndex === 0}
            >
              <Undo2 className="h-4 w-4 mr-1" />
              Deshacer
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
            >
              <Redo2 className="h-4 w-4 mr-1" />
              Rehacer
            </Button>
            <div className="ml-auto text-sm text-gray-600">
              {notes.length} nota(s)
            </div>
          </div>
        </div>
      )}

      {/* Notation Canvas */}
      <div className="border rounded-lg p-4 bg-white overflow-x-auto">
        <div className="relative">
          <div 
            ref={canvasRef} 
            className={`min-h-[200px] relative`}
            style={{ 
              userSelect: 'none',
              cursor: editMode === 'note' 
                ? 'crosshair' 
                : editMode === 'rest' 
                ? 'cell' 
                : editMode === 'select' 
                ? (draggingNote ? 'grabbing' : 'grab')
                : 'default'
            }}
          />
          
          {/* Cursor Preview - Musical Symbol */}
          {!readOnly && cursorPreview.show && (
            <div
              className="absolute pointer-events-none z-50 flex flex-col items-center gap-1"
              style={{
                left: `${cursorPreview.x}px`,
                top: `${cursorPreview.y}px`,
                transform: 'translate(-50%, -100%)',
              }}
            >
              {/* Note name (only for notes, not rests) */}
              {!isRest && cursorPreview.pitch && (
                <div className="bg-gray-800 text-white px-2 py-0.5 rounded text-xs font-semibold">
                  {cursorPreview.pitch.replace('/', '')}
                  {selectedAccidental && (
                    <span className="ml-0.5">
                      {selectedAccidental === '#' ? '♯' : selectedAccidental === 'b' ? '♭' : '♮'}
                    </span>
                  )}
                </div>
              )}
              
              {/* Musical symbol */}
              <div className="text-4xl opacity-60 drop-shadow-lg" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>
                {isRest ? (
                  selectedDuration === 'w' ? '𝄻' :
                  selectedDuration === 'h' ? '𝄼' :
                  selectedDuration === 'q' ? '𝄽' :
                  selectedDuration === '8' ? '𝄾' :
                  selectedDuration === '16' ? '𝄿' :
                  '𝄽'
                ) : (
                  <span className="flex items-center gap-0.5">
                    {selectedAccidental && (
                      <span className="text-3xl">
                        {selectedAccidental === '#' ? '♯' : selectedAccidental === 'b' ? '♭' : '♮'}
                      </span>
                    )}
                    <span>
                      {selectedDuration === 'w' ? '𝅝' :
                       selectedDuration === 'h' ? '𝅗𝅥' :
                       selectedDuration === 'q' ? '♩' :
                       selectedDuration === '8' ? '♪' :
                       selectedDuration === '16' ? '♬' :
                       '♩'}
                    </span>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
        {!readOnly && (
          <p className="text-xs text-gray-500 mt-2 text-center">
            💡 Click en el pentagrama para agregar {isRest ? 'un silencio' : 'una nota'} • Arrastra notas en la lista para reordenar
          </p>
        )}
      </div>

      {/* Notes List (for editing/deleting and drag & drop) */}
      {!readOnly && notes.length > 0 && (
        <div 
          className="border rounded-lg p-4"
          onClick={(e) => e.stopPropagation()} // Prevent clicks from reaching canvas
        >
          <Label className="mb-2 block">Notas Agregadas (arrastra para reordenar):</Label>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {notes.map((note, index) => (
              <div
                key={note.id}
                draggable
                onDragStart={(e) => {
                  // Disable drag when in tie/slur mode
                  if (tieMode || slurMode) {
                    e.preventDefault()
                    return
                  }
                  setDraggedNote(note.id)
                  e.dataTransfer.effectAllowed = 'move'
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'move'
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  if (draggedNote && draggedNote !== note.id) {
                    // Reorder notes
                    const draggedIndex = notes.findIndex(n => n.id === draggedNote)
                    const targetIndex = notes.findIndex(n => n.id === note.id)
                    
                    const newNotes = [...notes]
                    const [removed] = newNotes.splice(draggedIndex, 1)
                    newNotes.splice(targetIndex, 0, removed)
                    
                    // Update x positions
                    const reorderedNotes = newNotes.map((n, idx) => ({
                      ...n,
                      x: idx
                    }))
                    
                    updateNotes(reorderedNotes)
                  }
                  setDraggedNote(null)
                }}
                onDragEnd={() => setDraggedNote(null)}
                className={`flex items-center justify-between p-2 rounded border cursor-pointer transition-colors ${
                  selectedNote === note.id || firstNoteForTie === note.id || firstNoteForSlur === note.id
                    ? firstNoteForTie === note.id || firstNoteForSlur === note.id
                      ? 'bg-purple-50 border-purple-400 ring-2 ring-purple-300'
                      : 'bg-blue-50 border-blue-300'
                    : 'bg-gray-50'
                } ${draggedNote === note.id ? 'opacity-50' : ''} ${note.isRest ? 'opacity-60 cursor-not-allowed' : ''}`}
                onClick={(e) => {
                  e.stopPropagation() // Prevent event from bubbling to canvas
                  handleNoteClick(note.id)
                }}
              >
                <div className="flex items-center space-x-2 flex-1">
                  <span className="text-gray-400">⋮⋮</span>
                  <div className="text-sm">
                    <span className="font-medium">
                      {note.isRest || note.pitch === 'rest' ? 'Silencio' : `Nota ${index + 1}`}:
                    </span>{' '}
                    {note.isRest || note.pitch === 'rest' ? (
                      <span className="text-gray-600">Silencio</span>
                    ) : (
                      <>
                        {pitchOptions.find(p => p.value === note.pitch)?.label || note.pitch}
                        {note.accidental && (
                          <span className="ml-1">
                            {note.accidental === '#' ? '♯' : note.accidental === 'b' ? '♭' : '♮'}
                          </span>
                        )}
                      </>
                    )}
                    {' - '}
                    {durationOptions.find(d => d.value === note.duration)?.label || note.duration}
                    {(note.tieStart || note.tieEnd) && (
                      <span className="ml-2 text-xs text-pink-600" title="Ligadura de unión">
                        🎵 Tie
                      </span>
                    )}
                    {(note.slurStart || note.slurEnd) && (
                      <span className="ml-2 text-xs text-indigo-600" title="Ligadura de expresión">
                        🎶 Slur
                      </span>
                    )}
                    {note.articulation && (
                      <span className="ml-2 text-xs text-green-600" title={`Articulación: ${note.articulation}`}>
                        {note.articulation === 'staccato' && '•'}
                        {note.articulation === 'accent' && '>'}
                        {note.articulation === 'tenuto' && '-'}
                        {note.articulation === 'staccatissimo' && '!•'}
                        {note.articulation === 'marcato' && '^'}
                        {' '}{note.articulation}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteNote(note.id)
                  }}
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

