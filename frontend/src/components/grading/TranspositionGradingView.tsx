'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { FileMusic } from 'lucide-react'
import { MusicXMLViewer } from '@/components/notation/MusicXMLViewer'
import { api } from '@/lib/api'
import JSZip from 'jszip'

interface TranspositionGradingViewProps {
  answer: any
  question: any
  onLoadMusicXML: (filePath: string, bucket?: 'notation-files' | 'student-submissions') => Promise<string | null>
}

export function TranspositionGradingView({ answer, question, onLoadMusicXML }: TranspositionGradingViewProps) {
  const [studentXML, setStudentXML] = useState<string | null>(null)
  const [originalXML, setOriginalXML] = useState<string | null>(null)
  const [referenceXML, setReferenceXML] = useState<string | null>(null)
  const [loadingStudent, setLoadingStudent] = useState(false)
  const [loadingOriginal, setLoadingOriginal] = useState(false)
  const [loadingReference, setLoadingReference] = useState(false)

  // Get transposition data
  const transData = (() => {
    console.log('TranspositionGradingView - question data:', question)
    if (question.transposition) {
      const data = Array.isArray(question.transposition) ? question.transposition[0] : question.transposition
      console.log('TranspositionGradingView - extracted transposition data:', data)
      return data
    }
    console.log('TranspositionGradingView - No transposition data found')
    return null
  })()

  // Load student submission MusicXML
  useEffect(() => {
    const loadStudentSubmission = async () => {
      // First try to get from answer.answer.musicXML
      try {
        const answerData = typeof answer.answer === 'string' 
          ? JSON.parse(answer.answer) 
          : answer.answer
        
        if (answerData?.musicXML) {
          setStudentXML(answerData.musicXML)
          return
        }
      } catch (e) {
        // Continue to try file path
      }

      // Try to load from submission file
      const filePath = answer.submissionFilePath || answer.submission_file_path
      if (!filePath) return

      setLoadingStudent(true)
      try {
        const xml = await onLoadMusicXML(filePath, 'student-submissions')
        if (xml) {
          setStudentXML(xml)
        }
      } catch (error) {
        console.error('Error loading student submission:', error)
      } finally {
        setLoadingStudent(false)
      }
    }

    loadStudentSubmission()
  }, [answer, onLoadMusicXML])

  // Load original score MusicXML
  useEffect(() => {
    if (!transData?.notation_file_path) {
      console.log('No notation_file_path found in transData:', transData)
      return
    }

    console.log('Loading original score from path:', transData.notation_file_path)
    setLoadingOriginal(true)
    onLoadMusicXML(transData.notation_file_path, 'notation-files')
      .then(xml => {
        if (xml) {
          console.log('Successfully loaded original score XML, length:', xml.length)
          setOriginalXML(xml)
        } else {
          console.warn('Original score XML is null or empty')
        }
      })
      .catch(error => {
        console.error('Error loading original score:', error)
        console.error('Error stack:', error.stack)
      })
      .finally(() => setLoadingOriginal(false))
  }, [transData?.notation_file_path, onLoadMusicXML])

  // Load reference answer MusicXML
  useEffect(() => {
    // First check if referenceAnswerMusicXML is available directly
    if (transData?.referenceAnswerMusicXML) {
      console.log('Found referenceAnswerMusicXML directly in transData')
      setReferenceXML(transData.referenceAnswerMusicXML)
      return
    }

    // Also check in question metadata
    const questionMetadata = question?.metadata || {}
    if (questionMetadata.referenceAnswerMusicXML) {
      console.log('Found referenceAnswerMusicXML in question metadata')
      setReferenceXML(questionMetadata.referenceAnswerMusicXML)
      return
    }

    // Fall back to loading from file path
    if (!transData?.reference_answer_path) {
      console.log('No reference_answer_path found in transData:', transData)
      return
    }

    console.log('Loading reference answer from path:', transData.reference_answer_path)
    setLoadingReference(true)
    onLoadMusicXML(transData.reference_answer_path, 'notation-files')
      .then(xml => {
        if (xml) {
          console.log('Successfully loaded reference answer XML, length:', xml.length)
          setReferenceXML(xml)
        } else {
          console.warn('Reference answer XML is null or empty')
        }
      })
      .catch(error => {
        console.error('Error loading reference answer:', error)
        console.error('Error stack:', error.stack)
      })
      .finally(() => setLoadingReference(false))
  }, [transData?.reference_answer_path, transData?.referenceAnswerMusicXML, question?.metadata, onLoadMusicXML])

  return (
    <div className="space-y-6">
      {/* Student's Submission */}
      <div>
        <h4 className="text-sm font-semibold mb-2">Student's Transposition:</h4>
        {loadingStudent ? (
          <div className="p-4 border rounded bg-gray-50 text-center">
            <p className="text-sm text-gray-600">Loading student submission...</p>
          </div>
        ) : studentXML ? (
          <div className="border rounded bg-white p-4">
            <MusicXMLViewer 
              musicXML={studentXML} 
              width={800}
              height={300}
              className="w-full"
            />
          </div>
        ) : (
          <div className="p-4 border rounded bg-gray-50">
            <p className="text-sm text-gray-600">No MusicXML submission available</p>
            {(answer.submissionFilePath || answer.submission_file_path) && (
              <Button
                variant="link"
                size="sm"
                className="p-0 h-auto mt-2"
                onClick={async () => {
                  try {
                    const filePath = answer.submissionFilePath || answer.submission_file_path
                    const response = await api.getSubmissionUrl(filePath)
                    window.open(response.data.url, '_blank')
                  } catch (err) {
                    alert('Failed to load submission')
                  }
                }}
              >
                View Submission File
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Original Score */}
      {transData && (
        <div>
          <h4 className="text-sm font-semibold mb-2">Original Score:</h4>
          <p className="text-xs text-gray-600 mb-2">
            <strong>From:</strong> {transData.source_instrument || 'N/A'} → <strong>To:</strong> {transData.target_instrument || 'N/A'}
          </p>
          {loadingOriginal ? (
            <div className="p-4 border rounded bg-gray-50 text-center">
              <p className="text-sm text-gray-600">Loading original score...</p>
            </div>
          ) : originalXML ? (
            <div className="border rounded bg-white p-4">
              <MusicXMLViewer 
                musicXML={originalXML} 
                width={800}
                height={300}
                className="w-full"
              />
            </div>
          ) : (
            <div className="p-4 border rounded bg-gray-50">
              <p className="text-sm text-gray-600">Original score not available</p>
            </div>
          )}
        </div>
      )}

      {/* Reference Answer */}
      {(transData?.reference_answer_path || transData?.referenceAnswerMusicXML || referenceXML) && (
        <div>
          <h4 className="text-sm font-semibold mb-2">Reference Answer (Correct Transposition):</h4>
          {loadingReference ? (
            <div className="p-4 border rounded bg-gray-50 text-center">
              <p className="text-sm text-gray-600">Loading reference answer...</p>
            </div>
          ) : referenceXML ? (
            <div className="border rounded bg-white p-4">
              <MusicXMLViewer 
                musicXML={referenceXML} 
                width={800}
                height={300}
                className="w-full"
              />
            </div>
          ) : (
            <div className="p-4 border rounded bg-gray-50">
              <p className="text-sm text-gray-600">Reference answer not available</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

