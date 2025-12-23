import { evaluateTransposition } from '@/lib/notation/evaluator'
import type { EvaluationResult } from '@/lib/notation/evaluator'

/**
 * Evaluate Listen and Write submissions
 * Reuses transposition evaluation logic with 0 semitones (no transposition)
 */
export async function evaluateListenAndWrite(
  referenceMusicXML: string,
  studentMusicXML: string
): Promise<EvaluationResult> {
  // Use evaluateTransposition with 0 semitones (no transposition)
  return evaluateTransposition(referenceMusicXML, studentMusicXML, 0)
}

