/**
 * MusicXML Evaluation System
 * Compares student's transposition with reference answer
 */

// Use server-side XML parser if available (Node.js), otherwise use browser DOMParser
let DOMParserClass: any
let isXmldom = false
if (typeof window === 'undefined') {
  // Server-side: use xmldom
  const { DOMParser: XMDOMParser } = require('@xmldom/xmldom')
  DOMParserClass = XMDOMParser
  isXmldom = true
} else {
  // Browser: use native DOMParser
  DOMParserClass = DOMParser
  isXmldom = false
}

// Helper functions for cross-platform DOM queries (xmldom doesn't support querySelector)
function querySelector(element: any, selector: string): any {
  if (!element) return null
  
  if (isXmldom) {
    // xmldom doesn't support querySelector, use getElementsByTagName
    // For simple tag names, just get the first element
    if (!selector.includes('[') && !selector.includes(' ')) {
      const elements = element.getElementsByTagName(selector)
      return elements && elements.length > 0 ? elements[0] : null
    }
    // For attribute selectors like 'tie[type="start"]', we need to search manually
    if (selector.includes('[')) {
      const match = selector.match(/^(\w+)\[(\w+)="([^"]+)"\]$/)
      if (match) {
        const tagName = match[1]
        const attrName = match[2]
        const attrValue = match[3]
        const elements = element.getElementsByTagName(tagName)
        for (let i = 0; i < elements.length; i++) {
          const el = elements[i]
          if (el.getAttribute && el.getAttribute(attrName) === attrValue) {
            return el
          }
        }
      }
      return null
    }
    return null
  } else {
    // Browser: use native querySelector
    return element.querySelector(selector)
  }
}

function querySelectorAll(element: any, selector: string): any[] {
  if (!element) return []
  
  if (isXmldom) {
    // xmldom doesn't support querySelectorAll, use getElementsByTagName
    if (!selector.includes('[') && !selector.includes(' ')) {
      const elements = element.getElementsByTagName(selector)
      if (!elements) return []
      // Convert NodeList to array manually for xmldom
      const results: any[] = []
      for (let i = 0; i < elements.length; i++) {
        results.push(elements[i])
      }
      return results
    }
    // For attribute selectors, search manually
    if (selector.includes('[')) {
      const match = selector.match(/^(\w+)\[(\w+)="([^"]+)"\]$/)
      if (match) {
        const tagName = match[1]
        const attrName = match[2]
        const attrValue = match[3]
        const elements = element.getElementsByTagName(tagName)
        const results: any[] = []
        if (elements) {
          for (let i = 0; i < elements.length; i++) {
            const el = elements[i]
            if (el.getAttribute && el.getAttribute(attrName) === attrValue) {
              results.push(el)
            }
          }
        }
        return results
      }
    }
    return []
  } else {
    // Browser: use native querySelectorAll
    return Array.from(element.querySelectorAll(selector))
  }
}

function getTextContent(element: any): string {
  if (!element) return ''
  if (isXmldom) {
    // xmldom uses textContent or firstChild.nodeValue
    if (element.textContent) return element.textContent
    if (element.firstChild && element.firstChild.nodeValue) return element.firstChild.nodeValue
    return ''
  } else {
    return element.textContent || ''
  }
}

export interface NoteData {
  step: string // C, D, E, F, G, A, B
  octave: number
  alter?: number // -1 (flat), 0 (natural), 1 (sharp)
  duration: number // in divisions
  type: string // whole, half, quarter, eighth, etc.
  position: number // temporal position in beats
  tieStart?: boolean
  tieEnd?: boolean
  slurStart?: boolean
  slurEnd?: boolean
  articulation?: string | null // staccato, accent, tenuto, staccatissimo, marcato
}

export interface NoteComparison {
  position: number
  expected: NoteData | null
  actual: NoteData | null
  isCorrect: boolean
  errorType?: 'pitch' | 'duration' | 'accidental' | 'tie' | 'slur' | 'articulation' | 'missing' | 'extra'
  expectedMIDI?: number
  actualMIDI?: number
}

export interface EvaluationResult {
  score: number
  totalNotes: number
  correctNotes: number
  incorrectNotes: number
  missingNotes: number
  extraNotes: number
  details: NoteComparison[]
  percentage: number
}

/**
 * Convert note to MIDI number
 */
function noteToMIDI(step: string, octave: number, alter: number = 0): number {
  const stepToSemitone: Record<string, number> = {
    'C': 0,
    'D': 2,
    'E': 4,
    'F': 5,
    'G': 7,
    'A': 9,
    'B': 11
  }
  
  const baseMIDI = 12 + (octave * 12) + stepToSemitone[step.toUpperCase()] + alter
  return baseMIDI
}

/**
 * Get expected accidental for a note step based on key signature (fifths)
 * Returns the alter value expected by the key signature (1 for sharp, -1 for flat, 0 for natural)
 */
function getKeySignatureAccidental(step: string, fifths: number): number {
  const stepUpper = step.toUpperCase()
  
  if (fifths > 0) {
    // Sharp keys: F, C, G, D, A, E, B (Father Charles Goes Down And Ends Battle)
    const sharpOrder = ['F', 'C', 'G', 'D', 'A', 'E', 'B']
    const sharpIndex = sharpOrder.indexOf(stepUpper)
    if (sharpIndex >= 0 && sharpIndex < fifths) {
      return 1 // Sharp
    }
  } else if (fifths < 0) {
    // Flat keys: B, E, A, D, G, C, F (Battle Ends And Down Goes Charles Father)
    const flatOrder = ['B', 'E', 'A', 'D', 'G', 'C', 'F']
    const flatIndex = flatOrder.indexOf(stepUpper)
    if (flatIndex >= 0 && flatIndex < Math.abs(fifths)) {
      return -1 // Flat
    }
  }
  
  return 0 // Natural (no accidental from key signature)
}

/**
 * Normalize alter value considering key signature
 * If alter is missing (undefined/null) or 0, use the key signature's expected accidental
 */
function normalizeAccidental(step: string, alter: number | undefined | null, keySignatureFifths: number): number {
  // If alter is explicitly provided (even if 0), use it (explicit natural cancels key signature)
  if (alter !== undefined && alter !== null) {
    return alter
  }
  
  // Otherwise, use key signature default
  return getKeySignatureAccidental(step, keySignatureFifths)
}

/**
 * Parse MusicXML and extract notes
 */
function parseMusicXML(musicXML: string): { notes: NoteData[], keySignatureFifths: number } {
  try {
    const parser = new DOMParserClass()
    const xmlDoc = parser.parseFromString(musicXML, 'text/xml')
    
    // Check for parsing errors
    const parserError = querySelector(xmlDoc, 'parsererror')
    if (parserError) {
      console.error('[evaluator] MusicXML parsing error:', getTextContent(parserError))
      return { notes: [], keySignatureFifths: 0 }
    }
    
    const notes: NoteData[] = []
    const noteElements = querySelectorAll(xmlDoc, 'note')
    console.log('[evaluator] parseMusicXML: Found', noteElements.length, 'note elements')
    
    // Find divisions and key signature in the first measure's attributes
    const firstMeasure = querySelector(xmlDoc, 'measure')
    const attributes = firstMeasure ? querySelector(firstMeasure, 'attributes') : null
    const divisionsEl = attributes ? querySelector(attributes, 'divisions') : null
    const divisions = parseInt(
      divisionsEl ? getTextContent(divisionsEl) : '4',
      10
    )
    console.log('[evaluator] parseMusicXML: Using divisions:', divisions)
    
    // Parse key signature (fifths)
    let keySignatureFifths = 0
    if (attributes) {
      const keyEl = querySelector(attributes, 'key')
      if (keyEl) {
        const fifthsEl = querySelector(keyEl, 'fifths')
        if (fifthsEl) {
          keySignatureFifths = parseInt(getTextContent(fifthsEl) || '0', 10)
          console.log('[evaluator] parseMusicXML: Key signature fifths:', keySignatureFifths)
        }
      }
    }
    
    let currentPosition = 0
    
    noteElements.forEach((noteEl: any, index: number) => {
      const pitchEl = querySelector(noteEl, 'pitch')
      if (!pitchEl) {
        // For rests, we still need to account for their duration in the position
        const durationEl = querySelector(noteEl, 'duration')
        const duration = parseInt(durationEl ? getTextContent(durationEl) : '4', 10)
        currentPosition += duration / divisions
        return // Skip rests but update position
      }
      
      const stepEl = querySelector(pitchEl, 'step')
      const step = stepEl ? getTextContent(stepEl) : ''
      const octaveEl = querySelector(pitchEl, 'octave')
      const octave = parseInt(octaveEl ? getTextContent(octaveEl) : '4', 10)
      const alterEl = querySelector(pitchEl, 'alter')
      // If alter element exists, use its value (even if 0, which means explicit natural)
      // If alter element doesn't exist, the accidental comes from key signature
      const alterValue = alterEl ? parseInt(getTextContent(alterEl) || '0', 10) : null
      // Normalize: if alter is null (missing), use key signature; if present, use explicit value
      const alter = alterValue !== null ? alterValue : getKeySignatureAccidental(step, keySignatureFifths)
      const durationEl = querySelector(noteEl, 'duration')
      const duration = parseInt(durationEl ? getTextContent(durationEl) : '4', 10)
      const typeEl = querySelector(noteEl, 'type')
      const type = typeEl ? getTextContent(typeEl) : 'quarter'
      
      // Check for ties and slurs
      const notationsEl = querySelector(noteEl, 'notations')
      const tieStartEl = notationsEl ? querySelector(notationsEl, 'tie[type="start"]') : null
      const tieEndEl = notationsEl ? querySelector(notationsEl, 'tie[type="stop"]') : null
      const slurStartEl = notationsEl ? querySelector(notationsEl, 'slur[type="start"]') : null
      const slurEndEl = notationsEl ? querySelector(notationsEl, 'slur[type="stop"]') : null
      
      const tieStart = tieStartEl !== null
      const tieEnd = tieEndEl !== null
      const slurStart = slurStartEl !== null
      const slurEnd = slurEndEl !== null
      
      // Check for articulations
      const articulationsEl = notationsEl ? querySelector(notationsEl, 'articulations') : null
      let articulation: string | null = null
      if (articulationsEl) {
        if (querySelector(articulationsEl, 'staccato')) articulation = 'staccato'
        else if (querySelector(articulationsEl, 'accent')) articulation = 'accent'
        else if (querySelector(articulationsEl, 'tenuto')) articulation = 'tenuto'
        else if (querySelector(articulationsEl, 'staccatissimo')) articulation = 'staccatissimo'
        else if (querySelector(articulationsEl, 'strong-accent')) articulation = 'marcato'
      }
      
      const note: NoteData = {
        step,
        octave,
        alter,
        duration,
        type,
        position: currentPosition,
        tieStart,
        tieEnd,
        slurStart,
        slurEnd,
        articulation
      }
      
      notes.push(note)
      
      // Update position (duration is in divisions, convert to beats)
      currentPosition += duration / divisions
    })
    
    console.log('[evaluator] parseMusicXML: Parsed', notes.length, 'notes')
    return { notes, keySignatureFifths }
  } catch (error) {
    console.error('[evaluator] Error parsing MusicXML:', error)
    return { notes: [], keySignatureFifths: 0 }
  }
}

/**
 * Apply transposition to notes
 */
function transposeNotes(notes: NoteData[], semitones: number): NoteData[] {
  return notes.map(note => {
    const currentMIDI = noteToMIDI(note.step, note.octave, note.alter || 0)
    const transposedMIDI = currentMIDI + semitones
    
    // Convert MIDI back to note
    const octave = Math.floor((transposedMIDI - 12) / 12)
    const semitoneInOctave = ((transposedMIDI - 12) % 12 + 12) % 12
    
    const semitoneToStep: Record<number, { step: string; alter: number }> = {
      0: { step: 'C', alter: 0 },
      1: { step: 'C', alter: 1 },
      2: { step: 'D', alter: 0 },
      3: { step: 'D', alter: 1 },
      4: { step: 'E', alter: 0 },
      5: { step: 'F', alter: 0 },
      6: { step: 'F', alter: 1 },
      7: { step: 'G', alter: 0 },
      8: { step: 'G', alter: 1 },
      9: { step: 'A', alter: 0 },
      10: { step: 'A', alter: 1 },
      11: { step: 'B', alter: 0 }
    }
    
    const { step, alter } = semitoneToStep[semitoneInOctave] || { step: 'C', alter: 0 }
    
    return {
      ...note,
      step,
      octave,
      alter
    }
  })
}

/**
 * Compare two notes
 */
function compareNotes(expected: NoteData, actual: NoteData, tolerance: number = 0.1): boolean {
  // Compare pitch (MIDI number)
  const expectedMIDI = noteToMIDI(expected.step, expected.octave, expected.alter || 0)
  const actualMIDI = noteToMIDI(actual.step, actual.octave, actual.alter || 0)
  
  if (Math.abs(expectedMIDI - actualMIDI) > 0) {
    return false
  }
  
  // Compare duration type (quarter, half, etc.) instead of raw duration values
  // because duration values are in "divisions" units which can differ between files
  // The type field is standardized and consistent regardless of divisions
  if (expected.type !== actual.type) {
    return false
  }
  
  // Also compare ties, slurs, and articulations for completeness
  if (expected.tieStart !== actual.tieStart || expected.tieEnd !== actual.tieEnd) {
    return false
  }
  
  if (expected.slurStart !== actual.slurStart || expected.slurEnd !== actual.slurEnd) {
    return false
  }
  
  if (expected.articulation !== actual.articulation) {
    return false
  }
  
  return true
}

/**
 * Align notes by temporal position
 */
function alignNotes(expected: NoteData[], actual: NoteData[], tolerance: number = 0.25): NoteComparison[] {
  const comparisons: NoteComparison[] = []
  const usedActualIndices = new Set<number>()
  
  // Match expected notes with actual notes
  expected.forEach((expNote) => {
    // Find closest actual note within tolerance
    let bestMatch: { index: number; note: NoteData; distance: number } | null | undefined = null
    
    actual.forEach((actNote, index) => {
      if (usedActualIndices.has(index)) return
      
      const distance = Math.abs(expNote.position - actNote.position)
      if (distance <= tolerance) {
        if (!bestMatch || distance < bestMatch.distance) {
          bestMatch = { index, note: actNote, distance }
        }
      }
    })
    
    if (bestMatch) {
      const match = bestMatch as { index: number; note: NoteData; distance: number }
      usedActualIndices.add(match.index)
      const isCorrect = compareNotes(expNote, match.note)
      const expectedMIDI = noteToMIDI(expNote.step, expNote.octave, expNote.alter || 0)
      const actualMIDI = noteToMIDI(match.note.step, match.note.octave, match.note.alter || 0)
      
      let errorType: 'pitch' | 'duration' | 'accidental' | 'tie' | 'slur' | 'articulation' | 'missing' | 'extra' | undefined
      if (!isCorrect) {
        // Determine the specific error type
        if (expectedMIDI !== actualMIDI) {
          errorType = 'pitch'
        } else if (expNote.type !== match.note.type) {
          errorType = 'duration'
        } else if (expNote.tieStart !== match.note.tieStart || expNote.tieEnd !== match.note.tieEnd) {
          errorType = 'tie'
        } else if (expNote.slurStart !== match.note.slurStart || expNote.slurEnd !== match.note.slurEnd) {
          errorType = 'slur'
        } else if (expNote.articulation !== match.note.articulation) {
          errorType = 'articulation'
        } else {
          // Fallback to duration if we can't determine the specific error
          errorType = 'duration'
        }
      }
      
      comparisons.push({
        position: expNote.position,
        expected: expNote,
        actual: match.note,
        isCorrect,
        errorType,
        expectedMIDI,
        actualMIDI
      })
    } else {
      // Missing note
      comparisons.push({
        position: expNote.position,
        expected: expNote,
        actual: null,
        isCorrect: false,
        errorType: 'missing',
        expectedMIDI: noteToMIDI(expNote.step, expNote.octave, expNote.alter || 0)
      })
    }
  })
  
  // Find extra notes (actual notes not matched)
  actual.forEach((actNote, index) => {
    if (!usedActualIndices.has(index)) {
      comparisons.push({
        position: actNote.position,
        expected: null,
        actual: actNote,
        isCorrect: false,
        errorType: 'extra',
        actualMIDI: noteToMIDI(actNote.step, actNote.octave, actNote.alter || 0)
      })
    }
  })
  
  // Sort by position
  comparisons.sort((a, b) => a.position - b.position)
  
  return comparisons
}

/**
 * Main evaluation function
 */
export function evaluateTransposition(
  referenceMusicXML: string,
  studentMusicXML: string,
  transpositionSemitones: number
): EvaluationResult {
  console.log('[evaluator] Starting evaluation, transposition semitones:', transpositionSemitones)
  console.log('[evaluator] Reference MusicXML length:', referenceMusicXML.length)
  console.log('[evaluator] Student MusicXML length:', studentMusicXML.length)
  
  // Parse both MusicXML files
  const referenceParseResult = parseMusicXML(referenceMusicXML)
  const studentParseResult = parseMusicXML(studentMusicXML)
  const referenceNotes = referenceParseResult.notes
  const studentNotes = studentParseResult.notes
  
  console.log('[evaluator] Parsed reference notes:', referenceNotes.length)
  console.log('[evaluator] Parsed student notes:', studentNotes.length)
  
  if (referenceNotes.length === 0) {
    console.warn('[evaluator] No reference notes found, returning zero result')
    return {
      score: 0,
      totalNotes: 0,
      correctNotes: 0,
      incorrectNotes: 0,
      missingNotes: 0,
      extraNotes: 0,
      details: [],
      percentage: 0
    }
  }
  
  if (studentNotes.length === 0) {
    console.warn('[evaluator] No student notes found, returning zero result')
    return {
      score: 0,
      totalNotes: referenceNotes.length,
      correctNotes: 0,
      incorrectNotes: 0,
      missingNotes: referenceNotes.length,
      extraNotes: 0,
      details: [],
      percentage: 0
    }
  }
  
  // Apply transposition to reference
  const transposedReference = transposeNotes(referenceNotes, transpositionSemitones)
  console.log('[evaluator] Transposed reference notes:', transposedReference.length)
  
  // Align and compare notes
  const comparisons = alignNotes(transposedReference, studentNotes)
  console.log('[evaluator] Comparisons:', comparisons.length)
  
  // Calculate statistics
  const correctNotes = comparisons.filter(c => c.isCorrect).length
  const incorrectNotes = comparisons.filter(c => !c.isCorrect && c.expected && c.actual).length
  const missingNotes = comparisons.filter(c => c.errorType === 'missing').length
  const extraNotes = comparisons.filter(c => c.errorType === 'extra').length
  const totalNotes = transposedReference.length
  
  console.log('[evaluator] Stats - correct:', correctNotes, 'incorrect:', incorrectNotes, 'missing:', missingNotes, 'extra:', extraNotes, 'total:', totalNotes)
  
  // Calculate score (correct notes / total notes)
  const score = totalNotes > 0 ? (correctNotes / totalNotes) * 100 : 0
  console.log('[evaluator] Final score:', score)
  
  return {
    score: Math.round(score),
    totalNotes,
    correctNotes,
    incorrectNotes,
    missingNotes,
    extraNotes,
    details: comparisons,
    percentage: Math.round(score)
  }
}



