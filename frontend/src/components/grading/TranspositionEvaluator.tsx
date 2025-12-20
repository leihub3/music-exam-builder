'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { EvaluationResults } from '@/components/notation/EvaluationResults'
import { api } from '@/lib/api'
import { COMMON_INSTRUMENTS } from '@music-exam-builder/shared/types'
import type { EvaluationResult } from '@/lib/notation/evaluator'
import JSZip from 'jszip'

interface TranspositionEvaluatorProps {
  question: any
  studentAnswer: any
  onEvaluationComplete?: (result: EvaluationResult) => void
}

export function TranspositionEvaluator({ 
  question, 
  studentAnswer,
  onEvaluationComplete 
}: TranspositionEvaluatorProps) {
  const [evaluating, setEvaluating] = useState(false)
  const [evaluationResult, setEvaluationResult] = useState<EvaluationResult | null>(null)

  // Get transposition data
  const transpositionData = (() => {
    if (question.transposition) {
      const trans = Array.isArray(question.transposition)
        ? question.transposition[0]
        : question.transposition
      return {
        sourceInstrument: trans.source_instrument,
        targetInstrument: trans.target_instrument,
        notationFilePath: trans.notation_file_path,
        referenceAnswerPath: trans.reference_answer_path
      }
    }
    return {}
  })()

  // Calculate transposition semitones
  const calculateTranspositionSemitones = (): number => {
    const sourceInst = COMMON_INSTRUMENTS[transpositionData.sourceInstrument || '']
    const targetInst = COMMON_INSTRUMENTS[transpositionData.targetInstrument || '']
    
    if (sourceInst?.transposition !== undefined && targetInst?.transposition !== undefined) {
      return targetInst.transposition - sourceInst.transposition
    }
    
    return 0
  }

  // Load student submission - can be from file path or from answer.answer.musicXML
  const loadStudentSubmission = async (): Promise<string | null> => {
    // First try to get MusicXML from answer.answer if available
    try {
      const answerData = typeof studentAnswer.answer === 'string' 
        ? JSON.parse(studentAnswer.answer) 
        : studentAnswer.answer
      
      if (answerData?.musicXML) {
        console.log('Found MusicXML in answer.answer')
        return answerData.musicXML
      }
    } catch (e) {
      // Ignore parsing errors, continue to try file path
    }

    // Fallback to loading from submission file path
    const filePath = studentAnswer.submissionFilePath || studentAnswer.submission_file_path
    if (!filePath) {
      return null
    }

    try {
      const response = await api.getSubmissionUrl(filePath)
      const fileUrl = response.data.url
      
      const fetchResponse = await fetch(fileUrl)
      if (!fetchResponse.ok) {
        throw new Error('Failed to fetch submission file')
      }

      const contentType = fetchResponse.headers.get('content-type') || ''
      const isBinary = contentType.includes('zip') || 
                      contentType.includes('octet-stream') ||
                      filePath.toLowerCase().endsWith('.mxl')

      if (isBinary) {
        const arrayBuffer = await fetchResponse.arrayBuffer()
        const bytes = new Uint8Array(arrayBuffer)
        return Array.from(bytes, byte => String.fromCharCode(byte)).join('')
      } else {
        return await fetchResponse.text()
      }
    } catch (error) {
      console.error('Error loading submission file:', error)
      return null
    }
  }

  // Load reference answer
  const loadReferenceAnswer = async (): Promise<string | null> => {
    // First try reference answer path
    if (transpositionData.referenceAnswerPath) {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        if (!supabaseUrl) return null
        
        const referenceUrl = `${supabaseUrl}/storage/v1/object/public/notation-files/${transpositionData.referenceAnswerPath}`
        const response = await fetch(referenceUrl)
        
        if (response.ok) {
          const contentType = response.headers.get('content-type') || ''
          const isBinary = contentType.includes('zip') || 
                          contentType.includes('octet-stream') ||
                          transpositionData.referenceAnswerPath.toLowerCase().endsWith('.mxl')
          
          let fileContent: string
          
          if (isBinary) {
            const arrayBuffer = await response.arrayBuffer()
            const bytes = new Uint8Array(arrayBuffer)
            fileContent = Array.from(bytes, byte => String.fromCharCode(byte)).join('')
          } else {
            fileContent = await response.text()
          }
          
          if (!fileContent.trim().startsWith('%PDF')) {
            return fileContent
          }
        }
      } catch (error) {
        console.error('Error loading reference answer:', error)
      }
    }
    
    // Fallback to original notation file
    if (transpositionData.notationFilePath) {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        if (supabaseUrl) {
          const originalUrl = `${supabaseUrl}/storage/v1/object/public/notation-files/${transpositionData.notationFilePath}`
          const response = await fetch(originalUrl)
          if (response.ok) {
            const contentType = response.headers.get('content-type') || ''
            const isBinary = contentType.includes('zip') || 
                            contentType.includes('octet-stream') ||
                            transpositionData.notationFilePath.toLowerCase().endsWith('.mxl')
            
            let fileContent: string
            
            if (isBinary) {
              const arrayBuffer = await response.arrayBuffer()
              const bytes = new Uint8Array(arrayBuffer)
              fileContent = Array.from(bytes, byte => String.fromCharCode(byte)).join('')
            } else {
              fileContent = await response.text()
            }
            
            if (!fileContent.trim().startsWith('%PDF')) {
              return fileContent
            }
          }
        }
      } catch (error) {
        console.error('Error loading original notation file:', error)
      }
    }
    
    return null
  }

  const handleEvaluate = async () => {
    const filePath = studentAnswer.submissionFilePath || studentAnswer.submission_file_path
    if (!filePath && !studentAnswer.answer) {
      alert('No submission found')
      return
    }

    setEvaluating(true)
    setEvaluationResult(null)

    try {
      // Load student submission (from answer.answer.musicXML or file path)
      const studentMusicXML = await loadStudentSubmission()
      if (!studentMusicXML) {
        alert('Failed to load student submission. Please ensure the student submitted a MusicXML file.')
        setEvaluating(false)
        return
      }

      // Check if it's PDF
      if (studentMusicXML.trim().startsWith('%PDF')) {
        alert('Student submission is a PDF. Automatic evaluation requires MusicXML format.')
        setEvaluating(false)
        return
      }

      // Load reference answer
      const referenceXML = await loadReferenceAnswer()
      if (!referenceXML) {
        alert('No reference answer available in MusicXML format. Cannot evaluate automatically.')
        setEvaluating(false)
        return
      }

      if (referenceXML.trim().startsWith('%PDF')) {
        alert('Reference answer is a PDF. Automatic evaluation requires MusicXML format.')
        setEvaluating(false)
        return
      }

      // Calculate transposition semitones
      const semitones = calculateTranspositionSemitones()

      // Call evaluation API
      const response = await api.evaluateTransposition({
        questionId: question.id,
        studentMusicXML: studentMusicXML,
        referenceMusicXML: referenceXML,
        transpositionSemitones: semitones
      })

      if (response.success && response.data) {
        setEvaluationResult(response.data)
        if (onEvaluationComplete) {
          onEvaluationComplete(response.data)
        }
      } else {
        alert('Error evaluating transposition: ' + (response.error || 'Unknown error'))
      }
    } catch (error: any) {
      console.error('Error evaluating transposition:', error)
      alert('Error evaluating transposition: ' + (error.message || 'Unknown error'))
    } finally {
      setEvaluating(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Automatic Evaluation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Use automatic evaluation to compare the student's transposition with the reference answer.
            This will analyze note accuracy and provide a detailed score breakdown.
          </p>
          
          <Button
            onClick={handleEvaluate}
            disabled={evaluating || (!studentAnswer.submissionFilePath && !studentAnswer.submission_file_path && !studentAnswer.answer)}
            className="w-full"
          >
            {evaluating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Evaluating...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Evaluate Transposition
              </>
            )}
          </Button>

          {evaluationResult && (
            <div className="mt-4">
              <EvaluationResults
                result={evaluationResult}
                onClose={() => setEvaluationResult(null)}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

