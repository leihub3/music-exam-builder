'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { MusicXMLViewer } from '@/components/notation/MusicXMLViewer'
import { EvaluationResults } from '@/components/notation/EvaluationResults'
import { api } from '@/lib/api'
import JSZip from 'jszip'
import type { Question, QuestionBackendResponse, Answer } from '@music-exam-builder/shared/types'

interface ListenAndWriteEvaluatorProps {
  question: Question
  studentAnswer: Answer
  onEvaluationComplete?: (score: number, feedback: string, details: unknown) => void
}

export function ListenAndWriteEvaluator({
  question,
  studentAnswer,
  onEvaluationComplete
}: ListenAndWriteEvaluatorProps) {
  const [referenceMusicXML, setReferenceMusicXML] = useState<string | null>(null)
  const [studentMusicXML, setStudentMusicXML] = useState<string | null>(null)
  const [loadingReference, setLoadingReference] = useState(false)
  const [loadingStudent, setLoadingStudent] = useState(false)
  const [evaluating, setEvaluating] = useState(false)
  const [evaluationResult, setEvaluationResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  // Get Listen and Write data from question
  const lawData = (() => {
    const questionBackend = question as QuestionBackendResponse
    if (questionBackend.listen_and_write) {
      const lawRaw = questionBackend.listen_and_write
      return Array.isArray(lawRaw) ? lawRaw[0] : lawRaw
    }
    return null
  })()

  // Load reference score
  useEffect(() => {
    const loadReferenceScore = async () => {
      if (!lawData) {
        setError('No reference score data found in question')
        return
      }

      const referencePath = lawData.reference_score_path
      const referenceMusicXMLInline = lawData.reference_score_music_xml

      if (referenceMusicXMLInline) {
        console.log('ListenAndWriteEvaluator: Using inline reference MusicXML')
        setReferenceMusicXML(referenceMusicXMLInline)
        return
      }

      if (!referencePath) {
        setError('No reference complete score available. Please add a reference score to enable auto-grading.')
        return
      }

      setLoadingReference(true)
      setError(null)

      try {
        console.log('ListenAndWriteEvaluator: Loading reference score from:', referencePath)
        
        // Construct public URL for notation files
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        if (!supabaseUrl) {
          throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured')
        }
        
        const publicUrl = `${supabaseUrl}/storage/v1/object/public/notation-files/${referencePath}`
        console.log('ListenAndWriteEvaluator: Loading from URL:', publicUrl)

        const response = await fetch(publicUrl)
        if (!response.ok) {
          throw new Error(`Failed to load reference score: ${response.statusText}`)
        }

        // Check if it's a zip file (MXL)
        const contentType = response.headers.get('content-type') || ''
        const isMXL = referencePath.toLowerCase().endsWith('.mxl') || 
                     contentType.includes('zip') || 
                     contentType.includes('application/octet-stream')

        let xmlContent: string

        if (isMXL) {
          console.log('ListenAndWriteEvaluator: Detected MXL file, extracting...')
          const arrayBuffer = await response.arrayBuffer()
          const zip = await JSZip.loadAsync(arrayBuffer)
          
          // Find the MusicXML file in the zip (usually the first .xml file or a specific name)
          const xmlFile = Object.keys(zip.files).find(name => 
            name.toLowerCase().endsWith('.xml') || name.toLowerCase().endsWith('.musicxml')
          )
          
          if (!xmlFile) {
            throw new Error('No MusicXML file found in MXL archive')
          }
          
          xmlContent = await zip.file(xmlFile)!.async('string')
          console.log('ListenAndWriteEvaluator: Extracted MusicXML from MXL, length:', xmlContent.length)
        } else {
          xmlContent = await response.text()
          console.log('ListenAndWriteEvaluator: Loaded plain MusicXML, length:', xmlContent.length)
        }

        setReferenceMusicXML(xmlContent)
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load reference score'
        console.error('ListenAndWriteEvaluator: Error loading reference score:', err)
        setError(`Error loading reference score: ${errorMessage}`)
      } finally {
        setLoadingReference(false)
      }
    }

    loadReferenceScore()
  }, [lawData])

  // Load student submission
  useEffect(() => {
    const loadStudentSubmission = async () => {
      const answerData = studentAnswer.answer
      
      // Try to get MusicXML from answer directly
      if (answerData?.musicXML) {
        console.log('ListenAndWriteEvaluator: Found MusicXML in answer.answer')
        setStudentMusicXML(answerData.musicXML)
        return
      }

      // Try submission file path
      const submissionPath = studentAnswer.submissionFilePath
      if (!submissionPath) {
        setError('No student submission found')
        return
      }

      setLoadingStudent(true)
      setError(null)

      try {
        console.log('ListenAndWriteEvaluator: Loading student submission from:', submissionPath)
        
        const response = await api.getSubmissionUrl(submissionPath, 'student-submissions')
        const submissionUrl = response.data.url

        // Check if it's a zip file (MXL)
        const isMXL = submissionPath.toLowerCase().endsWith('.mxl')

        let xmlContent: string

        if (isMXL) {
          console.log('ListenAndWriteEvaluator: Detected MXL file, extracting...')
          const fetchResponse = await fetch(submissionUrl)
          const arrayBuffer = await fetchResponse.arrayBuffer()
          const zip = await JSZip.loadAsync(arrayBuffer)
          
          const xmlFile = Object.keys(zip.files).find(name => 
            name.toLowerCase().endsWith('.xml') || name.toLowerCase().endsWith('.musicxml')
          )
          
          if (!xmlFile) {
            throw new Error('No MusicXML file found in MXL archive')
          }
          
          xmlContent = await zip.file(xmlFile)!.async('string')
          console.log('ListenAndWriteEvaluator: Extracted MusicXML from MXL, length:', xmlContent.length)
        } else {
          const fetchResponse = await fetch(submissionUrl)
          xmlContent = await fetchResponse.text()
          console.log('ListenAndWriteEvaluator: Loaded plain MusicXML, length:', xmlContent.length)
        }

        setStudentMusicXML(xmlContent)
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load student submission'
        console.error('ListenAndWriteEvaluator: Error loading student submission:', err)
        setError(`Error loading student submission: ${errorMessage}`)
      } finally {
        setLoadingStudent(false)
      }
    }

    if (referenceMusicXML) {
      loadStudentSubmission()
    }
  }, [studentAnswer, referenceMusicXML])

  const handleEvaluate = async () => {
    if (!referenceMusicXML || !studentMusicXML) {
      setError('Both reference score and student submission are required')
      return
    }

    setEvaluating(true)
    setError(null)

    try {
      console.log('ListenAndWriteEvaluator: Calling evaluateListenAndWrite API...')
      const response = await api.evaluateListenAndWrite({
        questionId: question.id,
        studentMusicXML,
        referenceMusicXML
      })

      console.log('ListenAndWriteEvaluator: Evaluation response:', response)
      if (response.success && response.data) {
        console.log('ListenAndWriteEvaluator: Evaluation data:', response.data)
        setEvaluationResult(response.data)
        
        // Call callback if provided
        if (onEvaluationComplete) {
          const feedback = `Automatic evaluation: ${response.data.correctNotes}/${response.data.totalNotes} notes correct. Score: ${response.data.score}%`
          onEvaluationComplete(
            response.data.score,
            feedback,
            response.data
          )
        }
      } else {
        throw new Error(response.error || 'Evaluation failed')
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to evaluate submission'
      console.error('ListenAndWriteEvaluator: Error details:', err)
      setError(`Error: ${errorMessage}`)
    } finally {
      setEvaluating(false)
    }
  }

  if (loadingReference || loadingStudent) {
    return (
      <div className="border rounded-lg p-6 text-center">
        <p className="text-gray-600">Loading scores...</p>
      </div>
    )
  }

  if (error && !referenceMusicXML && !studentMusicXML) {
    return (
      <div className="border rounded-lg p-6 bg-red-50 border-red-200">
        <p className="text-red-800">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="border rounded-lg p-4 bg-blue-50">
        <h3 className="font-semibold mb-2">Automatic Evaluation for Listen and Write</h3>
        <p className="text-sm text-gray-600 mb-4">
          Compare the student's transcription with the reference score. Click "Run Automatic Evaluation" to generate a detailed analysis.
        </p>
        
        {referenceMusicXML && studentMusicXML ? (
          <Button
            onClick={handleEvaluate}
            disabled={evaluating}
            className="w-full"
          >
            {evaluating ? 'Evaluating...' : 'Run Automatic Evaluation'}
          </Button>
        ) : (
          <p className="text-sm text-gray-600">Loading scores...</p>
        )}
      </div>

      {error && (
        <div className="border rounded-lg p-4 bg-red-50 border-red-200">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Reference Score */}
        <div className="border rounded-lg p-4">
          <h4 className="font-semibold mb-3">Reference Score</h4>
          {referenceMusicXML ? (
            <MusicXMLViewer
              musicXML={referenceMusicXML}
              width={600}
              height={400}
              className="w-full border rounded bg-white p-2"
            />
          ) : (
            <p className="text-gray-500 text-sm">Loading reference score...</p>
          )}
        </div>

        {/* Student Submission */}
        <div className="border rounded-lg p-4">
          <h4 className="font-semibold mb-3">Student Submission</h4>
          {studentMusicXML ? (
            <MusicXMLViewer
              musicXML={studentMusicXML}
              width={600}
              height={400}
              className="w-full border rounded bg-white p-2"
            />
          ) : (
            <p className="text-gray-500 text-sm">Loading student submission...</p>
          )}
        </div>
      </div>

      {/* Evaluation Results */}
      {evaluationResult && (
        <div className="border rounded-lg p-4 bg-gray-50">
          <EvaluationResults result={evaluationResult} />
        </div>
      )}
    </div>
  )
}

