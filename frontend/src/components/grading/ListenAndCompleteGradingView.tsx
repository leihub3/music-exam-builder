'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { MusicXMLViewer } from '@/components/notation/MusicXMLViewer'
import { api } from '@/lib/api'
import JSZip from 'jszip'

interface ListenAndCompleteGradingViewProps {
  answer: any
  question: any
  onLoadMusicXML: (filePath: string, bucket: 'notation-files' | 'student-submissions') => Promise<string | null>
}

export function ListenAndCompleteGradingView({ answer, question, onLoadMusicXML }: ListenAndCompleteGradingViewProps) {
  const [incompleteXML, setIncompleteXML] = useState<string | null>(null)
  const [studentXML, setStudentXML] = useState<string | null>(null)
  const [completeXML, setCompleteXML] = useState<string | null>(null)
  const [loadingIncomplete, setLoadingIncomplete] = useState(false)
  const [loadingStudent, setLoadingStudent] = useState(false)
  const [loadingComplete, setLoadingComplete] = useState(false)

  // Get listen and complete data
  const lacData = (() => {
    if (question.listen_and_complete) {
      const data = Array.isArray(question.listen_and_complete) 
        ? question.listen_and_complete[0] 
        : question.listen_and_complete
      return data
    }
    return null
  })()

  // Load student submission MusicXML
  useEffect(() => {
    const loadStudentSubmission = async () => {
      // First try to get from answer.answer.completedScore or musicXML
      try {
        const answerData = typeof answer.answer === 'string' 
          ? JSON.parse(answer.answer) 
          : answer.answer
        
        if (answerData?.completedScore) {
          setStudentXML(answerData.completedScore)
          return
        }
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

  // Load incomplete score MusicXML
  useEffect(() => {
    if (!lacData?.incomplete_score_path && !lacData?.incomplete_score_music_xml) return

    setLoadingIncomplete(true)
    
    if (lacData.incomplete_score_music_xml) {
      setIncompleteXML(lacData.incomplete_score_music_xml)
      setLoadingIncomplete(false)
      return
    }

    onLoadMusicXML(lacData.incomplete_score_path, 'notation-files')
      .then(xml => {
        if (xml) {
          setIncompleteXML(xml)
        }
      })
      .catch(error => {
        console.error('Error loading incomplete score:', error)
      })
      .finally(() => setLoadingIncomplete(false))
  }, [lacData?.incomplete_score_path, lacData?.incomplete_score_music_xml, onLoadMusicXML])

  // Load complete score reference MusicXML
  useEffect(() => {
    if (!lacData?.complete_score_path && !lacData?.complete_score_music_xml) return

    setLoadingComplete(true)
    
    if (lacData.complete_score_music_xml) {
      setCompleteXML(lacData.complete_score_music_xml)
      setLoadingComplete(false)
      return
    }

    onLoadMusicXML(lacData.complete_score_path, 'notation-files')
      .then(xml => {
        if (xml) {
          setCompleteXML(xml)
        }
      })
      .catch(error => {
        console.error('Error loading complete score:', error)
      })
      .finally(() => setLoadingComplete(false))
  }, [lacData?.complete_score_path, lacData?.complete_score_music_xml, onLoadMusicXML])

  return (
    <div className="space-y-6">
      {/* Incomplete Score (What student started with) */}
      {lacData && (lacData.incomplete_score_path || lacData.incomplete_score_music_xml) && (
        <div>
          <h4 className="text-sm font-semibold mb-2">Incomplete Score (Starting Point):</h4>
          {loadingIncomplete ? (
            <div className="p-4 border rounded bg-gray-50 text-center">
              <p className="text-sm text-gray-600">Loading incomplete score...</p>
            </div>
          ) : incompleteXML ? (
            <div className="border rounded bg-white p-4">
              <MusicXMLViewer 
                musicXML={incompleteXML} 
                width={800}
                height={300}
                className="w-full"
              />
            </div>
          ) : (
            <div className="p-4 border rounded bg-gray-50">
              <p className="text-sm text-gray-600">Incomplete score not available</p>
            </div>
          )}
        </div>
      )}

      {/* Student's Completed Score */}
      <div>
        <h4 className="text-sm font-semibold mb-2">Student's Completed Score:</h4>
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

      {/* Reference Complete Score */}
      {lacData && (lacData.complete_score_path || lacData.complete_score_music_xml) && (
        <div>
          <h4 className="text-sm font-semibold mb-2">Reference Complete Score (Correct Answer):</h4>
          {loadingComplete ? (
            <div className="p-4 border rounded bg-gray-50 text-center">
              <p className="text-sm text-gray-600">Loading reference score...</p>
            </div>
          ) : completeXML ? (
            <div className="border rounded bg-white p-4">
              <MusicXMLViewer 
                musicXML={completeXML} 
                width={800}
                height={300}
                className="w-full"
              />
            </div>
          ) : (
            <div className="p-4 border rounded bg-gray-50">
              <p className="text-sm text-gray-600">Reference complete score not available</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

