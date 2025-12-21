/**
 * MusicXML Evaluation System
 * Compares student's transposition with reference answer
 */

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
 * Parse MusicXML and extract notes
 */
function parseMusicXML(musicXML: string): NoteData[] {
  try {
    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(musicXML, 'text/xml')
    
    // Check for parsing errors
    const parserError = xmlDoc.querySelector('parsererror')
    if (parserError) {
      console.error('MusicXML parsing error:', parserError.textContent)
      return []
    }
    
    const notes: NoteData[] = []
    const noteElements = xmlDoc.querySelectorAll('note')
    
    let currentPosition = 0
    const divisions = parseInt(
      xmlDoc.querySelector('divisions')?.textContent || '4',
      10
    )
    
    noteElements.forEach((noteEl) => {
      const pitchEl = noteEl.querySelector('pitch')
      if (!pitchEl) return // Skip rests
      
      const step = pitchEl.querySelector('step')?.textContent || ''
      const octave = parseInt(pitchEl.querySelector('octave')?.textContent || '4', 10)
      const alter = parseInt(pitchEl.querySelector('alter')?.textContent || '0', 10)
      const duration = parseInt(noteEl.querySelector('duration')?.textContent || '4', 10)
      const type = noteEl.querySelector('type')?.textContent || 'quarter'
      
      const note: NoteData = {
        step,
        octave,
        alter,
        duration,
        type,
        position: currentPosition
      }
      
      notes.push(note)
      
      // Update position (duration is in divisions, convert to beats)
      currentPosition += duration / divisions
    })
    
    return notes
  } catch (error) {
    console.error('Error parsing MusicXML:', error)
    return []
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
  
  // Compare duration (with tolerance)
  const durationDiff = Math.abs(expected.duration - actual.duration)
  if (durationDiff > tolerance) {
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
      
      let errorType: 'pitch' | 'duration' | 'accidental' | 'missing' | 'extra' | undefined
      if (!isCorrect) {
        if (expectedMIDI !== actualMIDI) {
          errorType = 'pitch'
        } else {
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
  // Parse both MusicXML files
  const referenceNotes = parseMusicXML(referenceMusicXML)
  const studentNotes = parseMusicXML(studentMusicXML)
  
  if (referenceNotes.length === 0) {
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
  
  // Apply transposition to reference
  const transposedReference = transposeNotes(referenceNotes, transpositionSemitones)
  
  // Align and compare notes
  const comparisons = alignNotes(transposedReference, studentNotes)
  
  // Calculate statistics
  const correctNotes = comparisons.filter(c => c.isCorrect).length
  const incorrectNotes = comparisons.filter(c => !c.isCorrect && c.expected && c.actual).length
  const missingNotes = comparisons.filter(c => c.errorType === 'missing').length
  const extraNotes = comparisons.filter(c => c.errorType === 'extra').length
  const totalNotes = transposedReference.length
  
  // Calculate score (correct notes / total notes)
  const score = totalNotes > 0 ? (correctNotes / totalNotes) * 100 : 0
  
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



