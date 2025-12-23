/**
 * Music Theory Constants
 * Used for dropdowns and validations in dictation questions
 */

export interface IntervalOption {
  value: string
  label: string
  semitones: number
}

export interface ChordQualityOption {
  value: string
  label: string
}

export interface RomanNumeralOption {
  value: string
  label: string
}

export const INTERVALS: IntervalOption[] = [
  { value: 'P1', label: 'Perfect Unison (P1)', semitones: 0 },
  { value: 'm2', label: 'Minor Second (m2)', semitones: 1 },
  { value: 'M2', label: 'Major Second (M2)', semitones: 2 },
  { value: 'm3', label: 'Minor Third (m3)', semitones: 3 },
  { value: 'M3', label: 'Major Third (M3)', semitones: 4 },
  { value: 'P4', label: 'Perfect Fourth (P4)', semitones: 5 },
  { value: 'A4', label: 'Augmented Fourth (A4)', semitones: 6 },
  { value: 'd5', label: 'Diminished Fifth (d5)', semitones: 6 },
  { value: 'P5', label: 'Perfect Fifth (P5)', semitones: 7 },
  { value: 'm6', label: 'Minor Sixth (m6)', semitones: 8 },
  { value: 'M6', label: 'Major Sixth (M6)', semitones: 9 },
  { value: 'm7', label: 'Minor Seventh (m7)', semitones: 10 },
  { value: 'M7', label: 'Major Seventh (M7)', semitones: 11 },
  { value: 'P8', label: 'Perfect Octave (P8)', semitones: 12 },
]

export const CHORD_QUALITIES: ChordQualityOption[] = [
  { value: 'major', label: 'Major' },
  { value: 'minor', label: 'Minor' },
  { value: 'diminished', label: 'Diminished' },
  { value: 'augmented', label: 'Augmented' },
  { value: 'dominant7', label: 'Dominant 7th' },
  { value: 'major7', label: 'Major 7th' },
  { value: 'minor7', label: 'Minor 7th' },
  { value: 'half-diminished7', label: 'Half-Diminished 7th' },
  { value: 'diminished7', label: 'Diminished 7th' },
  { value: 'augmented7', label: 'Augmented 7th' },
]

export const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

export const OCTAVES = [2, 3, 4, 5, 6]

export const ROMAN_NUMERALS: RomanNumeralOption[] = [
  { value: 'I', label: 'I (Tonic)' },
  { value: 'ii', label: 'ii (Supertonic)' },
  { value: 'iii', label: 'iii (Mediant)' },
  { value: 'IV', label: 'IV (Subdominant)' },
  { value: 'V', label: 'V (Dominant)' },
  { value: 'vi', label: 'vi (Submediant)' },
  { value: 'vii°', label: 'vii° (Leading Tone)' },
]

export const KEYS = [
  'C major', 'C# major', 'D major', 'D# major', 'E major', 'F major',
  'F# major', 'G major', 'G# major', 'A major', 'A# major', 'B major',
  'C minor', 'C# minor', 'D minor', 'D# minor', 'E minor', 'F minor',
  'F# minor', 'G minor', 'G# minor', 'A minor', 'A# minor', 'B minor',
]

export const INTERVAL_DIRECTIONS = [
  { value: 'ascending', label: 'Ascending' },
  { value: 'descending', label: 'Descending' },
  { value: 'harmonic', label: 'Harmonic' },
]

export const CHORD_VOICINGS = [
  { value: 'root', label: 'Root Position' },
  { value: 'first_inversion', label: 'First Inversion' },
  { value: 'second_inversion', label: 'Second Inversion' },
  { value: 'open', label: 'Open Voicing' },
]

export const CHORD_TYPES = [
  { value: 'triad', label: 'Triad' },
  { value: 'seventh', label: 'Seventh Chord' },
  { value: 'extended', label: 'Extended Chord' },
]

export const PROGRESSION_NOTATIONS = [
  { value: 'roman', label: 'Roman Numerals (I, V, vi, IV)' },
  { value: 'jazz', label: 'Jazz Notation (C, G, Am, F)' },
  { value: 'figured_bass', label: 'Figured Bass' },
]

