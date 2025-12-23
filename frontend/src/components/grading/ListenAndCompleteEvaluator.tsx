'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { EvaluationResults } from '@/components/notation/EvaluationResults'
import { api } from '@/lib/api'
import type { EvaluationResult } from '@/lib/notation/evaluator'
import JSZip from 'jszip'

interface ListenAndCompleteEvaluatorProps {
  question: any
  studentAnswer: any
  onEvaluationComplete?: (result: EvaluationResult) => void
}

export function ListenAndCompleteEvaluator({ 
  question, 
  studentAnswer,
  onEvaluationComplete 
}: ListenAndCompleteEvaluatorProps) {
  const [evaluating, setEvaluating] = useState(false)
  const [evaluationResult, setEvaluationResult] = useState<EvaluationResult | null>(null)

  // Get listen and complete data - handle both backend structure and typeData
  const lacData = (() => {
    // First try backend structure (from database)
    if (question.listen_and_complete) {
      const data = Array.isArray(question.listen_and_complete)
        ? question.listen_and_complete[0]
        : question.listen_and_complete
      console.log('ListenAndCompleteEvaluator: Found listen_and_complete in question:', data)
      // Normalize to handle both snake_case and camelCase
      return {
        complete_score_path: data.complete_score_path || data.completeScorePath,
        complete_score_music_xml: data.complete_score_music_xml || data.completeScoreMusicXML,
        incomplete_score_path: data.incomplete_score_path || data.incompleteScorePath,
        incomplete_score_music_xml: data.incomplete_score_music_xml || data.incompleteScoreMusicXML,
        audio_file_path: data.audio_file_path || data.audioFilePath,
        blank_positions: data.blank_positions || data.blankPositions
      }
    }
    // Fallback to typeData (from frontend)
    if (question.typeData) {
      console.log('ListenAndCompleteEvaluator: Found typeData in question:', question.typeData)
      return {
        complete_score_path: question.typeData.completeScorePath || question.typeData.complete_score_path,
        complete_score_music_xml: question.typeData.completeScoreMusicXML || question.typeData.complete_score_music_xml,
        incomplete_score_path: question.typeData.incompleteScorePath || question.typeData.incomplete_score_path,
        incomplete_score_music_xml: question.typeData.incompleteScoreMusicXML || question.typeData.incomplete_score_music_xml,
        audio_file_path: question.typeData.audioFilePath || question.typeData.audio_file_path,
        blank_positions: question.typeData.blankPositions || question.typeData.blank_positions
      }
    }
    console.log('ListenAndCompleteEvaluator: No listen_and_complete or typeData found in question')
    console.log('ListenAndCompleteEvaluator: Full question object:', question)
    return null
  })()

  // Load student submission - can be from file path or from answer.answer.completedScore/musicXML
  const loadStudentSubmission = async (): Promise<string | null> => {
    // First try to get MusicXML from answer.answer if available
    try {
      const answerData = typeof studentAnswer.answer === 'string' 
        ? JSON.parse(studentAnswer.answer) 
        : studentAnswer.answer
      
      if (answerData?.completedScore) {
        console.log('Found completedScore in answer.answer')
        return answerData.completedScore
      }
      if (answerData?.musicXML) {
        console.log('Found musicXML in answer.answer')
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
        const zip = await JSZip.loadAsync(arrayBuffer)
        
        // Try to find the MusicXML file in the zip
        let xmlFile = zip.file('META-INF/container.xml')
        if (xmlFile) {
          const containerContent = await xmlFile.async('text')
          const parser = new DOMParser()
          const containerDoc = parser.parseFromString(containerContent, 'text/xml')
          const rootFileEl = containerDoc.querySelector('rootfile[media-type="application/vnd.recordare.musicxml+xml"]')
          if (rootFileEl) {
            const xmlPath = rootFileEl.getAttribute('full-path') || 'score.xml'
            xmlFile = zip.file(xmlPath)
          }
        }
        if (!xmlFile) {
          xmlFile = zip.file('score.xml') || zip.file('music.xml') || 
                   Object.keys(zip.files).find(f => f.endsWith('.xml') && zip.file(f))
                   ? zip.file(Object.keys(zip.files).find(f => f.endsWith('.xml'))!)
                   : null
        }
        if (!xmlFile) {
          throw new Error('No XML file found in MXL archive')
        }
        return await xmlFile.async('text')
      } else {
        return await fetchResponse.text()
      }
    } catch (error) {
      console.error('Error loading submission file:', error)
      return null
    }
  }

  // Load reference complete score
  const loadReferenceScore = async (): Promise<string | null> => {
    if (!lacData) {
      console.log('ListenAndCompleteEvaluator: No lacData found')
      return null
    }

    console.log('ListenAndCompleteEvaluator: lacData:', lacData)
    console.log('ListenAndCompleteEvaluator: complete_score_path:', lacData.complete_score_path)
    console.log('ListenAndCompleteEvaluator: complete_score_music_xml:', lacData.complete_score_music_xml ? 'present' : 'missing')

    // Check if complete_score_music_xml is available directly
    if (lacData.complete_score_music_xml) {
      console.log('ListenAndCompleteEvaluator: Using complete_score_music_xml directly')
      return lacData.complete_score_music_xml
    }

    // Otherwise load from file path
    if (!lacData.complete_score_path) {
      console.log('ListenAndCompleteEvaluator: No complete_score_path found')
      return null
    }

    try {
      // For notation-files, use public URL (same approach as grading view)
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
      if (!supabaseUrl) {
        throw new Error('Supabase URL not configured')
      }

      // Ensure filePath doesn't have leading slash
      const cleanPath = lacData.complete_score_path.startsWith('/') 
        ? lacData.complete_score_path.slice(1) 
        : lacData.complete_score_path
      
      const completeScoreUrl = `${supabaseUrl}/storage/v1/object/public/notation-files/${cleanPath}`
      
      console.log('ListenAndCompleteEvaluator: Loading from URL:', completeScoreUrl)
      
      const fetchResponse = await fetch(completeScoreUrl)
      
      if (!fetchResponse.ok) {
        console.error('ListenAndCompleteEvaluator: Failed to fetch reference score, status:', fetchResponse.status)
        throw new Error(`Failed to fetch reference score: ${fetchResponse.statusText}`)
      }

      // Only treat as ZIP if it's explicitly .mxl extension
      // .musicxml and .xml files are plain XML, not ZIP archives
      const filePathLower = lacData.complete_score_path.toLowerCase()
      const isMxlFile = filePathLower.endsWith('.mxl')
      
      if (isMxlFile) {
        // Handle MXL (ZIP) files
        const arrayBuffer = await fetchResponse.arrayBuffer()
        try {
          const zip = await JSZip.loadAsync(arrayBuffer)
          
          let xmlFile = zip.file('META-INF/container.xml')
          if (xmlFile) {
            const containerContent = await xmlFile.async('text')
            const parser = new DOMParser()
            const containerDoc = parser.parseFromString(containerContent, 'text/xml')
            const rootFileEl = containerDoc.querySelector('rootfile[media-type="application/vnd.recordare.musicxml+xml"]')
            if (rootFileEl) {
              const xmlPath = rootFileEl.getAttribute('full-path') || 'score.xml'
              xmlFile = zip.file(xmlPath)
            }
          }
          if (!xmlFile) {
            xmlFile = zip.file('score.xml') || zip.file('music.xml') || 
                     Object.keys(zip.files).find(f => f.endsWith('.xml') && zip.file(f))
                     ? zip.file(Object.keys(zip.files).find(f => f.endsWith('.xml'))!)
                     : null
          }
          if (!xmlFile) {
            throw new Error('No XML file found in MXL archive')
          }
          const xml = await xmlFile.async('text')
          console.log('ListenAndCompleteEvaluator: Successfully loaded reference score from MXL, length:', xml.length)
          return xml
        } catch (zipError: any) {
          console.error('ListenAndCompleteEvaluator: Error parsing as ZIP, trying as XML:', zipError)
          // If ZIP parsing fails, try reading as text (might be mislabeled)
          const xml = await fetchResponse.text()
          console.log('ListenAndCompleteEvaluator: Successfully loaded reference score as text, length:', xml.length)
          return xml
        }
      } else {
        // Handle plain XML files (.xml, .musicxml)
        const xml = await fetchResponse.text()
        console.log('ListenAndCompleteEvaluator: Successfully loaded reference score, length:', xml.length)
        return xml
      }
    } catch (error: any) {
      console.error('ListenAndCompleteEvaluator: Error loading reference score:', error)
      console.error('ListenAndCompleteEvaluator: Error details:', error.message, error.stack)
      return null
    }
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
      // Load student submission (from answer.answer.completedScore/musicXML or file path)
      const studentMusicXML = await loadStudentSubmission()
      if (!studentMusicXML) {
        alert('Failed to load student submission. Please ensure the student submitted a MusicXML file.')
        setEvaluating(false)
        return
      }

      console.log('ListenAndCompleteEvaluator: Student MusicXML length:', studentMusicXML.length)
      console.log('ListenAndCompleteEvaluator: Student MusicXML preview:', studentMusicXML.substring(0, 200))

      // Check if it's PDF
      if (studentMusicXML.trim().startsWith('%PDF')) {
        alert('Student submission is a PDF. Automatic evaluation requires MusicXML format.')
        setEvaluating(false)
        return
      }

      // Load reference complete score
      const referenceXML = await loadReferenceScore()
      if (!referenceXML) {
        alert('No reference complete score available. Cannot evaluate automatically.')
        setEvaluating(false)
        return
      }

      console.log('ListenAndCompleteEvaluator: Reference MusicXML length:', referenceXML.length)
      console.log('ListenAndCompleteEvaluator: Reference MusicXML preview:', referenceXML.substring(0, 200))

      if (referenceXML.trim().startsWith('%PDF')) {
        alert('Reference score is a PDF. Automatic evaluation requires MusicXML format.')
        setEvaluating(false)
        return
      }

      // Use evaluateTransposition with 0 semitones (no transposition needed for Listen and Complete)
      console.log('ListenAndCompleteEvaluator: Calling evaluateTransposition API...')
      const response = await api.evaluateTransposition({
        questionId: question.id,
        studentMusicXML: studentMusicXML,
        referenceMusicXML: referenceXML,
        transpositionSemitones: 0
      })

      console.log('ListenAndCompleteEvaluator: Evaluation response:', response)
      console.log('ListenAndCompleteEvaluator: Evaluation data:', response.data)
      if (response.data) {
        console.log('ListenAndCompleteEvaluator: Evaluation result - correct:', response.data.correctNotes, 'total:', response.data.totalNotes, 'score:', response.data.score)
      }

      if (response.success && response.data) {
        const result = response.data as EvaluationResult
        setEvaluationResult(result)
        
        if (onEvaluationComplete) {
          onEvaluationComplete(result)
        }
      } else {
        alert('Evaluation failed. Please try again.')
      }
    } catch (error: any) {
      console.error('Error evaluating:', error)
      alert('Error during evaluation: ' + (error.message || 'Unknown error'))
    } finally {
      setEvaluating(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Automatic Evaluation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!evaluationResult && (
          <Button
            onClick={handleEvaluate}
            disabled={evaluating || !lacData?.complete_score_path && !lacData?.complete_score_music_xml}
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
                Run Automatic Evaluation
              </>
            )}
          </Button>
        )}

        {evaluationResult && (
          <div className="space-y-4">
            <EvaluationResults result={evaluationResult} />
            <Button
              variant="outline"
              onClick={() => {
                setEvaluationResult(null)
                if (onEvaluationComplete) {
                  onEvaluationComplete(evaluationResult)
                }
              }}
              className="w-full"
            >
              Re-run Evaluation
            </Button>
          </div>
        )}

        {!lacData?.complete_score_path && !lacData?.complete_score_music_xml && (
          <p className="text-sm text-yellow-600">
            ⚠️ No reference complete score available. Cannot perform automatic evaluation.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

