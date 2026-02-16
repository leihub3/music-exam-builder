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
  progression: Array<{ chord: string; rhythm: string }> | string[] // New format: [{chord: 'II', rhythm: 'half'}, ...] or old format: ['I', 'V', ...]
  key: string // e.g., "C major", "A minor"
  tempo?: number
  timeSignature?: string // e.g., '4/4', '3/4'
  metronomeEnabled?: boolean // Whether to play metronome before progression
  chordDuration?: number // Deprecated: seconds per chord (kept for backward compatibility)
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
    // Always reinitialize to ensure synth is ready - don't skip initialization
    // Clean up existing synth first
    if (this.synth) {
      try {
        this.synth.releaseAll()
        this.synth.dispose()
      } catch (e) {
        // Ignore disposal errors
      }
      this.synth = null
    }

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
   * Generate and play a chord as arpeggio (notes in sequence).
   * Reusable for any flow that needs arpeggiated chord playback.
   */
  async generateChordArpeggio(options: GenerateChordOptions): Promise<void> {
    await this.init(options.instrument || 'sine')

    const {
      chordName,
      octave = 4,
      duration = 2
    } = options

    try {
      const normalizedChordName = this.normalizeChordName(chordName)
      const chord = TonalChord.get(normalizedChordName)
      if (chord.empty || !chord.name || chord.notes.length === 0) {
        throw new Error(`Invalid chord: ${chordName} (normalized: ${normalizedChordName})`)
      }

      const notes = chord.notes.map(note => `${note}${octave}`)
      const gapBetweenNotes = 0.15 // seconds
      const noteDuration = 0.4 // seconds per note

      const now = Tone.now()
      notes.forEach((note, i) => {
        const startTime = now + i * (gapBetweenNotes + noteDuration)
        this.synth?.triggerAttackRelease(note, noteDuration, startTime)
      })

      const totalArpeggioDuration = (notes.length - 1) * gapBetweenNotes + notes.length * noteDuration
      await new Promise(resolve => setTimeout(resolve, (totalArpeggioDuration + 0.3) * 1000))
    } catch (error) {
      console.error('Error generating chord arpeggio:', error)
      throw error
    }
  }

  /**
   * Schedule metronome clicks on the Transport
   * Returns the duration of the metronome in seconds
   */
  private scheduleMetronome(options: {
    timeSignature: string; // '4/4', '3/4', '2/4', '6/8'
    tempo: number;
    measures: number; // How many measures to play (typically 1 before progression)
    accentFirstBeat?: boolean; // Accent beat 1 of each measure
    startTime: number; // When to start the metronome (in seconds)
  }): number {
    // Parse time signature
    const [beatsPerMeasure, beatType] = options.timeSignature.split('/').map(Number)
    
    if (!beatsPerMeasure || !beatType) {
      throw new Error(`Invalid time signature: ${options.timeSignature}`)
    }
    
    // Create click sounds (higher pitch for accent, lower for regular beats)
    const accentClick = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 10,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.1, sustain: 0.01, release: 0.1 }
    }).toDestination()
    
    const regularClick = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 8,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.05, sustain: 0.01, release: 0.05 }
    }).toDestination()
    
    const beatDuration = 60 / options.tempo // Duration of one beat in seconds
    
    // Schedule clicks for each measure
    for (let measure = 0; measure < options.measures; measure++) {
      for (let beat = 0; beat < beatsPerMeasure; beat++) {
        const isAccent = options.accentFirstBeat !== false && beat === 0 // Accent the first beat
        const time = options.startTime + measure * beatsPerMeasure * beatDuration + beat * beatDuration
        
        Tone.Transport.schedule(() => {
          if (isAccent) {
            accentClick.triggerAttackRelease('C6', '8n', '+0', 0.5)
          } else {
            regularClick.triggerAttackRelease('C5', '16n', '+0', 0.3)
          }
        }, time)
      }
    }
    
    // Return the total duration of the metronome
    return options.measures * beatsPerMeasure * beatDuration
  }

  /**
   * Generate and play a chord progression with optional metronome intro
   */
  async generateProgression(options: GenerateProgressionOptions): Promise<void> {
    await this.init(options.instrument || 'sine')

    const {
      progression,
      key,
      tempo = 120,
      timeSignature = '4/4',
      metronomeEnabled = false,
      chordDuration = 2 // Deprecated, kept for backward compatibility
    } = options

    try {
      // Stop and cancel any existing Transport schedule
      Tone.Transport.stop()
      Tone.Transport.cancel()
      
      // Set tempo
      Tone.Transport.bpm.value = tempo

      // Convert progression to normalized format
      let normalizedProgression: Array<{ chord: string; rhythm: string }>
      let progressionChords: string[]
      
      if (Array.isArray(progression) && progression.length > 0) {
        // Check if it's old format (string[]) or new format (object[])
        if (typeof progression[0] === 'string') {
          // Old format: string array, use default quarter note rhythm
          progressionChords = progression as string[]
          normalizedProgression = progressionChords.map(chord => ({
            chord: chord as string,
            rhythm: 'quarter'
          }))
        } else {
          // New format: object array with chord and rhythm
          normalizedProgression = progression as Array<{ chord: string; rhythm: string }>
          progressionChords = normalizedProgression.map(p => p.chord)
        }
      } else {
        throw new Error('Invalid progression format')
      }

      // Convert Roman numerals to chord names in the given key
      // TonalProgression.fromRomanNumerals expects: fromRomanNumerals(keyRoot, progression)
      // Extract just the root note (e.g., 'C' from 'C major')
      const keyRoot = key.split(' ')[0] || 'C'
      
      console.log('Converting progression:', { key, keyRoot, progressionChords })
      
      // Try conversion with just the root note (this is what Tonal.js expects)
      let chords = TonalProgression.fromRomanNumerals(keyRoot, progressionChords)
      console.log('Converted chords:', chords)
      
      // Validate conversion worked
      if (!chords || chords.length === 0 || chords.every(c => !c || (typeof c === 'string' && c.trim() === ''))) {
        throw new Error(`Invalid progression or key: ${key} (root: ${keyRoot}). Progression: ${progressionChords.join(', ')}. Conversion returned: ${JSON.stringify(chords)}`)
      }

      // Get octave from key (extract if exists, default to 4)
      const keyNote = Note.get(key.split(' ')[0] || key)
      const octave = keyNote.oct || 4

      // Rhythm to beats mapping
      const rhythmToBeats: Record<string, number> = {
        'whole': 4,
        'dotted-half': 3,
        'half': 2,
        'dotted-quarter': 1.5,
        'quarter': 1,
        'eighth': 0.5
      }

      // Calculate beat duration in seconds
      const beatDuration = 60 / tempo

      // Calculate metronome duration if enabled
      let metronomeDuration = 0
      let progressionStartTime = 0
      
      if (metronomeEnabled) {
        // Schedule metronome starting at time 0
        metronomeDuration = this.scheduleMetronome({
          timeSignature,
          tempo,
          measures: 1,
          accentFirstBeat: true,
          startTime: 0
        })
        // Small gap (0.2 seconds) before progression
        progressionStartTime = metronomeDuration + 0.2
      }

      // Ensure synth is initialized
      if (!this.synth) {
        throw new Error('Synth not initialized')
      }

      // Schedule each chord with its rhythm duration (starting after metronome if enabled)
      let currentTime = progressionStartTime
      
      console.log('Scheduling progression:', {
        progression: normalizedProgression,
        chords,
        progressionStartTime,
        tempo,
        beatDuration
      })
      
      normalizedProgression.forEach((progItem, index) => {
        const chordName = chords[index]
        if (!chordName) {
          console.warn(`No chord name at index ${index}`)
          return
        }

        const chord = TonalChord.get(chordName)
        if (chord.empty || !chord.name) {
          console.warn(`Invalid chord at index ${index}: ${chordName}`)
          return
        }

        const notes = chord.notes.map(note => `${note}${octave}`)
        
        // Calculate duration based on rhythm pattern
        const beats = rhythmToBeats[progItem.rhythm] || 1
        const durationSeconds = beats * beatDuration

        console.log(`Scheduling chord ${index + 1}: ${chordName} (${progItem.rhythm}, ${beats} beats) at time ${currentTime}s`, notes)

        Tone.Transport.schedule((time) => {
          console.log(`Playing chord ${index + 1} at scheduled time ${time}:`, notes)
          if (this.synth) {
            // Pass the scheduled time to triggerAttackRelease for accurate timing
            this.synth.triggerAttackRelease(notes, durationSeconds, time)
          } else {
            console.error('Synth not available when trying to play chord')
          }
        }, currentTime)
        
        currentTime += durationSeconds
      })

      // Calculate total duration (metronome + gap + progression)
      const progressionDuration = normalizedProgression.reduce((sum, item) => {
        const beats = rhythmToBeats[item.rhythm] || 1
        return sum + (beats * beatDuration)
      }, 0)
      
      const totalDuration = progressionStartTime + progressionDuration

      console.log('Starting Transport:', {
        metronomeDuration,
        progressionStartTime,
        progressionDuration,
        totalDuration
      })

      // Reset Transport position to 0 and start playback
      Tone.Transport.position = 0
      Tone.Transport.start(0)

      // Wait for everything to play (metronome + gap + progression)
      await new Promise(resolve => setTimeout(resolve, (totalDuration + 0.5) * 1000))

      // Stop transport and cancel all scheduled events
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

