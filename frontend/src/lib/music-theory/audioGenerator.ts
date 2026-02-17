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

/** NotationEditor note format */
export interface NotationEditorNote {
  id: string
  pitch: string // e.g., "C/4", "D/4"
  duration: string // "q", "8", "h", "w", "16"
  accidental?: '#' | 'b' | 'n' | null
  stave?: number
  x?: number
  measure?: number
  isRest?: boolean
  dot?: boolean
  tieStart?: boolean
  tieEnd?: boolean
  tieId?: string
  slurStart?: boolean
  slurEnd?: boolean
  slurId?: string
  articulation?: 'staccato' | 'accent' | 'tenuto' | 'staccatissimo' | 'marcato' | null
}

export interface PlayNotationScoreOptions {
  notes: NotationEditorNote[]
  tempo?: number
  timeSignature?: string
  metronomeEnabled?: boolean
  instrument?: 'piano' | 'sine' | 'synth'
}

/**
 * Music Audio Generator
 * Generates intervals, chords, and progressions using Tone.js and Tonal.js
 */
const SIDESTICK_URL = '/samples/drums/SideStick.wav'

export class MusicAudioGenerator {
  private synth: Tone.PolySynth | Tone.Sampler | null = null
  private pianoSampler: Tone.Sampler | null = null
  private metronomePlayer: Tone.Player | null = null
  private metronomePlayerAccent: Tone.Player | null = null
  private initialized = false
  private playbackTimeouts: ReturnType<typeof setTimeout>[] = []

  private async loadMetronomeSample(): Promise<void> {
    if (this.metronomePlayer?.loaded) return
    const [player, accentPlayer] = await Promise.all([
      (async () => { const p = new Tone.Player().toDestination(); await p.load(SIDESTICK_URL); return p })(),
      (async () => { const p = new Tone.Player().toDestination(); p.volume.value = 3; await p.load(SIDESTICK_URL); return p })()
    ])
    this.metronomePlayer = player
    this.metronomePlayerAccent = accentPlayer
  }

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
    if (this.pianoSampler) {
      try {
        this.pianoSampler.releaseAll()
        this.pianoSampler.dispose()
      } catch (e) {
        // Ignore disposal errors
      }
      this.pianoSampler = null
    }

    try {
      // Start Tone.js audio context (requires user interaction)
      await Tone.start()

      // Create synth based on instrument type
      if (instrument === 'piano') {
        await new Promise<void>((resolve, reject) => {
          this.pianoSampler = new Tone.Sampler({
            urls: { 60: '3_60.wav' },
            baseUrl: '/samples/piano/',
            onload: resolve,
            onerror: reject
          }).toDestination()
        })
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

  /** Play note(s) using current instrument (synth or piano) */
  private playNote(notes: string | string[], durationSeconds: number, time?: number): void {
    const t = time ?? Tone.now()
    if (this.pianoSampler) {
      this.pianoSampler.triggerAttackRelease(notes, durationSeconds, t, 0.8)
    } else if (this.synth) {
      this.synth.triggerAttackRelease(notes, durationSeconds, t)
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
        this.playNote([note1, note2], duration)
        await new Promise(resolve => setTimeout(resolve, (noteDuration + 0.5) * 1000))
      } else {
        const now = Tone.now()
        this.playNote(note1, duration, now)
        this.playNote(note2, duration, now + noteDuration)
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
      this.playNote(notes, durationSeconds)

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
        this.playNote(note, noteDuration, startTime)
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
    
    const beatDuration = 60 / options.tempo
    const accentPlayer = this.metronomePlayerAccent!
    const regularPlayer = this.metronomePlayer!

    for (let measure = 0; measure < options.measures; measure++) {
      for (let beat = 0; beat < beatsPerMeasure; beat++) {
        const isAccent = options.accentFirstBeat !== false && beat === 0
        const time = options.startTime + measure * beatsPerMeasure * beatDuration + beat * beatDuration

        Tone.Transport.schedule((scheduledTime) => {
          (isAccent ? accentPlayer : regularPlayer).start(scheduledTime)
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

      const progressionDuration = normalizedProgression.reduce((sum, item) => {
        const beats = rhythmToBeats[item.rhythm] || 1
        return sum + (beats * beatDuration)
      }, 0)
      const [beatsPerMeasure] = (timeSignature || '4/4').split('/').map(Number)
      const measureDuration = (beatsPerMeasure || 4) * beatDuration
      const progressionMeasures = Math.max(1, Math.ceil(progressionDuration / measureDuration))

      if (metronomeEnabled) {
        await this.loadMetronomeSample()
        this.scheduleMetronome({
          timeSignature,
          tempo,
          measures: progressionMeasures,
          accentFirstBeat: true,
          startTime: 0
        })
      }

      if (!this.synth && !this.pianoSampler) {
        throw new Error('Synth not initialized')
      }

      let currentTime = 0
      
      console.log('Scheduling progression:', {
        progression: normalizedProgression,
        chords,
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
          this.playNote(notes, durationSeconds, time)
        }, currentTime)
        
        currentTime += durationSeconds
      })

      const totalDuration = progressionDuration + 0.5

      console.log('Starting Transport:', {
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
   * Play a notation score (NotationEditor notes format)
   * Uses setTimeout (Transport can fail in modal/editor context).
   */
  async playNotationScore(options: PlayNotationScoreOptions): Promise<void> {
    await this.init(options.instrument || 'sine')

    const {
      notes,
      tempo = 120,
      timeSignature = '4/4',
      metronomeEnabled = false
    } = options

    if (!notes || notes.length === 0) {
      return
    }

    if (!this.synth && !this.pianoSampler) {
      throw new Error('Synth not initialized')
    }

    const durationMap: Record<string, number> = {
      w: 4,
      h: 2,
      q: 1,
      '8': 0.5,
      '16': 0.25
    }
    const beatDurationSeconds = 60 / tempo

    const playAtTimes: { timeMs: number; noteName: string; durationSeconds: number }[] = []
    let currentBeat = 0
    const skipIndices = new Set<number>()

    for (let i = 0; i < notes.length; i++) {
      if (skipIndices.has(i)) continue

      const note = notes[i]
      let beats = (durationMap[note.duration] ?? 1) * (note.dot ? 1.5 : 1)

      if (note.isRest || note.pitch === 'rest') {
        currentBeat += beats
        continue
      }

      if (note.tieStart) {
        let totalBeats = beats
        for (let j = i + 1; j < notes.length; j++) {
          const nextNote = notes[j]
          if (nextNote.pitch === note.pitch && !nextNote.isRest && (nextNote.tieEnd || nextNote.tieStart)) {
            const nextBeats = (durationMap[nextNote.duration] ?? 1) * (nextNote.dot ? 1.5 : 1)
            totalBeats += nextBeats
            skipIndices.add(j)
            if (nextNote.tieEnd && !nextNote.tieStart) break
          } else {
            break
          }
        }
        beats = totalBeats
      } else if (note.tieEnd && !note.tieStart) {
        skipIndices.add(i)
        continue
      }

      const [step, octave] = note.pitch.split('/')
      const stepUpper = (step || 'C').toUpperCase()
      const octaveStr = octave || '4'
      const accidental = note.accidental === '#' ? '#' : note.accidental === 'b' ? 'b' : ''
      const noteName = `${stepUpper}${accidental}${octaveStr}`

      try {
        Tone.Frequency(noteName).toMidi()
      } catch {
        continue
      }

      const startSeconds = currentBeat * beatDurationSeconds
      const durationSeconds = beats * beatDurationSeconds
      playAtTimes.push({
        timeMs: Math.round(startSeconds * 1000),
        noteName,
        durationSeconds
      })
      currentBeat += beats
    }

    const totalDurationMs = (currentBeat * beatDurationSeconds + 0.5) * 1000

    this.playbackTimeouts = []
    if (metronomeEnabled) {
      await this.loadMetronomeSample()
      const normalizedTimeSignature = timeSignature === 'C' ? '4/4' : timeSignature === 'C|' ? '2/2' : (timeSignature || '4/4')
      const [beatsPerMeasure] = normalizedTimeSignature.split('/').map(Number) || [4]
      const accentPlayer = this.metronomePlayerAccent!
      const regularPlayer = this.metronomePlayer!
      for (let b = 0; b < currentBeat; b++) {
        const player = beatsPerMeasure > 0 && b % beatsPerMeasure === 0 ? accentPlayer : regularPlayer
        const id = setTimeout(() => player.start(Tone.now()), Math.round(b * beatDurationSeconds * 1000))
        this.playbackTimeouts.push(id)
      }
    }

    if (playAtTimes.length === 0) {
      const hasNotes = notes.some(n => !n.isRest && n.pitch !== 'rest')
      if (hasNotes) {
        console.warn('playNotationScore: No notes scheduled - possible validation failures', notes)
      }
      return
    }

    for (const { timeMs, noteName, durationSeconds } of playAtTimes) {
      const id = setTimeout(() => {
        this.playNote(noteName, durationSeconds, Tone.now())
      }, timeMs)
      this.playbackTimeouts.push(id)
    }

    await new Promise<void>((resolve) => {
      const id = setTimeout(() => resolve(), totalDurationMs)
      this.playbackTimeouts.push(id)
    })
  }

  /**
   * Stop any currently playing audio
   */
  stop(): void {
    for (const id of this.playbackTimeouts) {
      clearTimeout(id)
    }
    this.playbackTimeouts = []
    if (this.synth) {
      this.synth.releaseAll()
    }
    if (this.pianoSampler) {
      this.pianoSampler.releaseAll()
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
    if (this.pianoSampler) {
      this.pianoSampler.dispose()
      this.pianoSampler = null
    }
    if (this.metronomePlayer) {
      this.metronomePlayer.dispose()
      this.metronomePlayer = null
    }
    if (this.metronomePlayerAccent) {
      this.metronomePlayerAccent.dispose()
      this.metronomePlayerAccent = null
    }
    this.initialized = false
  }
}

// Singleton instance (optional - can also create new instances)
export const musicAudioGenerator = new MusicAudioGenerator()

