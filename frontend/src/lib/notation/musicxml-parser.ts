/**
 * Shared MusicXML parser for NotationEditor
 * Converts MusicXML string to the notes format expected by NotationEditor
 */

export interface ParsedMusicXML {
  notes: Array<{
    id: string
    pitch: string
    duration: string
    accidental?: '#' | 'b' | 'n' | null
    stave: number
    x: number
    measure?: number
    isRest?: boolean
    dot?: boolean
    articulation?: 'staccato' | 'accent' | 'tenuto' | 'staccatissimo' | 'marcato' | null
    tieStart?: boolean
    tieEnd?: boolean
    tieId?: string
    slurStart?: boolean
    slurEnd?: boolean
    slurId?: string
  }>
  clef: 'treble' | 'bass' | 'alto' | 'tenor'
  keySignature: string
  timeSignature: string
  measureCount: number
}

export function parseMusicXMLToNotes(musicXML: string): ParsedMusicXML {
  try {
    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(musicXML, 'text/xml')

    const parserError = xmlDoc.querySelector('parsererror')
    if (parserError) {
      console.error('Error parsing MusicXML:', parserError.textContent)
      return {
        notes: [],
        clef: 'treble',
        keySignature: 'C',
        timeSignature: '4/4',
        measureCount: 1,
      }
    }

    const part =
      xmlDoc.querySelector('part') ||
      xmlDoc.querySelector('score-partwise part') ||
      xmlDoc
    const measures = Array.from(part.querySelectorAll('measure'))

    if (measures.length === 0) {
      return {
        notes: [],
        clef: 'treble',
        keySignature: 'C',
        timeSignature: '4/4',
        measureCount: 1,
      }
    }

    // Parse attributes from first measure
    const firstMeasure = measures[0]
    const attributes = firstMeasure.querySelector('attributes')
    let clef: 'treble' | 'bass' | 'alto' | 'tenor' = 'treble'
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
          '0': 'C',
          '1': 'G',
          '2': 'D',
          '3': 'A',
          '4': 'E',
          '5': 'B',
          '6': 'F#',
          '7': 'C#',
          '-1': 'F',
          '-2': 'Bb',
          '-3': 'Eb',
          '-4': 'Ab',
          '-5': 'Db',
          '-6': 'Gb',
          '-7': 'Cb',
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
    const notes: ParsedMusicXML['notes'] = []
    measures.forEach((measure, measureIndex) => {
      const measureNotes = measure.querySelectorAll('note')
      measureNotes.forEach((noteEl, noteIndex) => {
        const rest = noteEl.querySelector('rest')
        const pitchEl = noteEl.querySelector('pitch')

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

        const typeEl = noteEl.querySelector('type')
        const dotEl = noteEl.querySelector('dot')
        let duration = 'q'
        const dot = dotEl !== null

        if (typeEl) {
          const type = typeEl.textContent || 'quarter'
          const durationMap: Record<string, string> = {
            whole: 'w',
            half: 'h',
            quarter: 'q',
            eighth: '8',
            '16th': '16',
          }
          duration = durationMap[type] || 'q'
        }

        // Parse articulations
        let articulation:
          | 'staccato'
          | 'accent'
          | 'tenuto'
          | 'staccatissimo'
          | 'marcato'
          | null = null
        const notationsEl = noteEl.querySelector('notations')
        if (notationsEl) {
          const articulationsEl = notationsEl.querySelector('articulations')
          if (articulationsEl) {
            if (articulationsEl.querySelector('staccato'))
              articulation = 'staccato'
            else if (articulationsEl.querySelector('accent'))
              articulation = 'accent'
            else if (articulationsEl.querySelector('tenuto'))
              articulation = 'tenuto'
            else if (articulationsEl.querySelector('staccatissimo'))
              articulation = 'staccatissimo'
            else if (articulationsEl.querySelector('strong-accent'))
              articulation = 'marcato'
          }
        }

        const tieStart =
          noteEl.querySelector('tie[type="start"]') ||
          noteEl.querySelector('tied[type="start"]')
        const tieEnd =
          noteEl.querySelector('tie[type="stop"]') ||
          noteEl.querySelector('tied[type="stop"]')
        const slurStart = noteEl.querySelector('slur[type="start"]')
        const slurEnd = noteEl.querySelector('slur[type="stop"]')

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
          tieId: tieStart || tieEnd ? `tie-${measureIndex}-${noteIndex}` : undefined,
          slurStart: !!slurStart,
          slurEnd: !!slurEnd,
          slurId:
            slurStart || slurEnd ? `slur-${measureIndex}-${noteIndex}` : undefined,
        })
      })
    })

    return {
      notes,
      clef,
      keySignature,
      timeSignature,
      measureCount: measures.length,
    }
  } catch (error) {
    console.error('Error parsing MusicXML:', error)
    return {
      notes: [],
      clef: 'treble',
      keySignature: 'C',
      timeSignature: '4/4',
      measureCount: 1,
    }
  }
}
