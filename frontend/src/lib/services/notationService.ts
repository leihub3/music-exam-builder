import { evaluateTransposition as evaluateTranspositionFn } from '@/lib/notation/evaluator'

/**
 * Notation Service
 * Wrapper for transposition evaluation
 */
export async function evaluateTransposition(
  referenceMusicXML: string,
  studentMusicXML: string,
  transpositionSemitones: number = 0
) {
  return evaluateTranspositionFn(referenceMusicXML, studentMusicXML, transpositionSemitones)
}

