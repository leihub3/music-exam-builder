import * as Tone from 'tone'
import { Note, Interval as TonalInterval, Chord as TonalChord, Progression as TonalProgression, transpose } from '@tonaljs/tonal'

export interface GenerateIntervalOptions {
  rootNote: string // e.g., "C4"
  interval: string // e.g., "P5", "m3", "M7"
  direction: 'ascending' | 'descending' | 'harmonic'
  tempo?: number // BPM
  noteDuration?: number // seconds
  instrument?: 'piano' | 'sine' | 'synth'
}

export interface GenerateChordOptions {
  chordName: string // e.g., "C major", "Am", "F#dim"
  octave?: number
  tempo?: number
  duration?: number // seconds
  instrument?: 'piano' | 'sine' | 'synth'
}

export interface GenerateProgressionOptions {
  progression: string[] // e.g., ["I", "V", "vi", "IV"]
  key: string // e.g., "C major", "A minor"
  tempo?: number
  chordDuration?: number // seconds per chord
  instrument?: 'piano' | 'sine' | 'synth'
}

/**
 * Music Audio Generator
 * Generates intervals, chords, and progressions using Tone.js and Tonal.js
 */
export class MusicAudioGenerator {
  private synth: Tone.PolySynth | Tone.Sampler | null = null
  private initialized = false

  /**
   * Initialize audio context and synth
   */
  async init(instrument: 'piano' | 'sine' | 'synth' = 'sine'): Promise<void> {
    if (this.initialized && this.synth) return

    try {
      // Start Tone.js audio context (requires user interaction)
      await Tone.start()

      // Create synth based on instrument type
      if (instrument === 'piano') {
        // For now, use a PolySynth with a piano-like envelope
        // TODO: Later can add SoundFont samples for better piano sound
        this.synth = new Tone.PolySynth({
          maxPolyphony: 6,
          voice: Tone.Synth,
          options: {
            oscillator: { type: 'sine' },
            envelope: {
              attack: 0.1,
              decay: 0.2,
              sustain: 0.5,
              release: 1.2
            }
          }
        }).toDestination()
      } else if (instrument === 'synth') {
        this.synth = new Tone.PolySynth(Tone.Synth).toDestination()
      } else {
        // Simple sine wave
        this.synth = new Tone.PolySynth({
          maxPolyphony: 6,
          voice: Tone.Synth,
          options: {
            oscillator: { type: 'sine' }
          }
        }).toDestination()
      }

      this.initialized = true
    } catch (error) {
      console.error('Error initializing audio generator:', error)
      throw error
    }
  }

  /**
   * Generate and play an interval
   */
  async generateInterval(options: GenerateIntervalOptions): Promise<void> {
    await this.init(options.instrument || 'sine')

    const {
      rootNote,
      interval,
      direction,
      noteDuration = 1,
      tempo = 120
    } = options

    try {
      // Parse and validate root note
      // Normalize the note string: ensure uppercase note name
      let normalizedRootNote = rootNote.trim()
      
      // Extract and normalize note components: "B4" -> "B4", "b4" -> "B4", "C#4" -> "C#4"
      const noteMatch = normalizedRootNote.match(/^([A-Ga-g])([#b]?)(\d+)$/)
      if (noteMatch) {
        const [, note, accidental, octave] = noteMatch
        normalizedRootNote = `${note.toUpperCase()}${accidental}${octave}`
      }
      
      // Validate note with Tone.js first (more lenient)
      try {
        const toneFreq = Tone.Frequency(normalizedRootNote)
        if (toneFreq.toMidi() === null || isNaN(toneFreq.toMidi())) {
          throw new Error(`Invalid note format: ${normalizedRootNote}`)
        }
      } catch (toneError) {
        throw new Error(`Invalid root note: ${rootNote}. Please use format like "C4", "F#4", or "Bb4".`)
      }
      
      // Now parse with Tonal.js for interval calculations
      // Tonal.js Note.get() returns an object with 'name' property if valid, or 'empty: true' if invalid
      const root = Note.get(normalizedRootNote)
      
      // Check if note is valid - Tonal.js uses 'name' property or 'empty: false' to indicate validity
      if (root.empty || !root.name) {
        console.error(`Tonal.js could not parse "${normalizedRootNote}". Tonal.js result:`, root)
        throw new Error(
          `Invalid root note: ${rootNote} (normalized: ${normalizedRootNote}). ` +
          `Please use format like "C4", "F#4", or "Bb4".`
        )
      }

      // Get interval info
      // Tonal.js Interval.get() returns an object with 'name' if valid
      const intervalInfo = TonalInterval.get(interval)
      if (intervalInfo.empty || !intervalInfo.name) {
        throw new Error(`Invalid interval: ${interval}`)
      }

      let note1: string
      let note2: string

      // Use the parsed root note name (should be valid now)
      const rootNoteName = root.name
      
      if (direction === 'ascending') {
        note1 = rootNoteName // e.g., "C4"
        // Use transpose function from Tonal.js (correct API: transpose(noteName, intervalName))
        note2 = transpose(rootNoteName, interval) // e.g., "G4" for P5 from C4
      } else if (direction === 'descending') {
        const inverted = TonalInterval.invert(interval)
        note1 = transpose(rootNoteName, inverted)
        note2 = rootNoteName
      } else {
        // harmonic - both notes at once
        note1 = rootNoteName
        note2 = transpose(rootNoteName, interval)
      }
      
      // Validate resulting notes with Tone.js
      try {
        Tone.Frequency(note1).toMidi()
        Tone.Frequency(note2).toMidi()
      } catch (err) {
        throw new Error(`Generated invalid notes: ${note1}, ${note2}`)
      }

      const duration = Tone.Time(`${noteDuration * 4}n`).toSeconds() // Convert to Tone time

      if (direction === 'harmonic') {
        // Play both notes simultaneously
        this.synth?.triggerAttackRelease([note1, note2], duration)
        // Wait for harmonic interval to finish (only one duration since notes play together)
        await new Promise(resolve => setTimeout(resolve, (noteDuration + 0.5) * 1000))
      } else {
        // Play sequentially
        const now = Tone.now()
        this.synth?.triggerAttackRelease(note1, duration, now)
        this.synth?.triggerAttackRelease(note2, duration, now + noteDuration)
        // Wait for sequential interval to finish (two durations)
        await new Promise(resolve => setTimeout(resolve, (noteDuration * 2 + 0.5) * 1000))
      }
    } catch (error) {
      console.error('Error generating interval:', error)
      throw error
    }
  }

  /**
   * Generate and play a chord
   */
  /**
   * Normalize chord name to Tonal.js format
   * Converts "C major7" to "Cmaj7", "C minor" to "Cm", etc.
   */
  private normalizeChordName(chordName: string): string {
    // Remove extra spaces and split
    const parts = chordName.trim().split(/\s+/)
    if (parts.length < 2) return chordName // Already in correct format or just a note
    
    const note = parts[0]
    const quality = parts.slice(1).join(' ').toLowerCase()
    
    // Map quality names to Tonal.js abbreviations
    const qualityMap: Record<string, string> = {
      'major': '',
      'minor': 'm',
      'diminished': 'dim',
      'augmented': 'aug',
      'dominant7': '7',
      'major7': 'maj7',
      'minor7': 'm7',
      'half-diminished7': 'm7b5',
      'diminished7': 'dim7',
      'augmented7': 'aug7',
      'major 7': 'maj7',
      'minor 7': 'm7',
      'dominant 7': '7',
      'half-diminished 7': 'm7b5',
      'diminished 7': 'dim7',
      'augmented 7': 'aug7'
    }
    
    const normalizedQuality = qualityMap[quality] ?? quality
    // If quality is empty (major), just return the note
    if (normalizedQuality === '') {
      return note
    }
    return `${note}${normalizedQuality}`
  }

  async generateChord(options: GenerateChordOptions): Promise<void> {
    await this.init(options.instrument || 'sine')

    const {
      chordName,
      octave = 4,
      duration = 2
    } = options

    try {
      // Normalize chord name for Tonal.js
      const normalizedChordName = this.normalizeChordName(chordName)
      
      // Parse chord using Tonal.js
      // Tonal.js Chord.get() returns an object with 'name' if valid
      const chord = TonalChord.get(normalizedChordName)
      if (chord.empty || !chord.name || chord.notes.length === 0) {
        throw new Error(`Invalid chord: ${chordName} (normalized: ${normalizedChordName})`)
      }

      // Convert chord notes to specific octave
      const notes = chord.notes.map(note => `${note}${octave}`)

      const durationSeconds = Tone.Time(`${duration * 4}n`).toSeconds()
      this.synth?.triggerAttackRelease(notes, durationSeconds)

      // Wait for audio to finish
      await new Promise(resolve => setTimeout(resolve, (duration + 0.5) * 1000))
    } catch (error) {
      console.error('Error generating chord:', error)
      throw error
    }
  }

  /**
   * Generate and play a chord progression
   */
  async generateProgression(options: GenerateProgressionOptions): Promise<void> {
    await this.init(options.instrument || 'sine')

    const {
      progression,
      key,
      tempo = 120,
      chordDuration = 2
    } = options

    try {
      // Set tempo
      Tone.Transport.bpm.value = tempo

      // Convert Roman numerals to chord names in the given key
      const chords = TonalProgression.fromRomanNumerals(key, progression)
      
      if (chords.length === 0) {
        throw new Error(`Invalid progression or key: ${key}`)
      }

      // Get octave from key (extract if exists, default to 4)
      const keyNote = Note.get(key.split(' ')[0] || key)
      const octave = keyNote.oct || 4

      // Schedule each chord
      progression.forEach((romanNumeral, index) => {
        const chordName = chords[index]
        if (!chordName) return

        const chord = TonalChord.get(chordName)
        if (chord.empty || !chord.name) return

        const notes = chord.notes.map(note => `${note}${octave}`)
        const durationSeconds = Tone.Time(`${chordDuration * 4}n`).toSeconds()

        Tone.Transport.schedule(() => {
          this.synth?.triggerAttackRelease(notes, durationSeconds)
        }, index * chordDuration)
      })

      // Start playback
      Tone.Transport.start()

      // Wait for entire progression to play
      const totalDuration = progression.length * chordDuration
      await new Promise(resolve => setTimeout(resolve, (totalDuration + 0.5) * 1000))

      // Stop transport
      Tone.Transport.stop()
      Tone.Transport.cancel()
    } catch (error) {
      console.error('Error generating progression:', error)
      Tone.Transport.stop()
      Tone.Transport.cancel()
      throw error
    }
  }

  /**
   * Stop any currently playing audio
   */
  stop(): void {
    if (this.synth) {
      this.synth.releaseAll()
    }
    Tone.Transport.stop()
    Tone.Transport.cancel()
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.stop()
    if (this.synth) {
      this.synth.dispose()
      this.synth = null
    }
    this.initialized = false
  }
}

// Singleton instance (optional - can also create new instances)
export const musicAudioGenerator = new MusicAudioGenerator()

