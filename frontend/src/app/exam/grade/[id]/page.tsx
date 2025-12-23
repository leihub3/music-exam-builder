'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Save, CheckCircle, FileMusic, Music } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { TranspositionEvaluator } from '@/components/grading/TranspositionEvaluator'
import { TranspositionGradingView } from '@/components/grading/TranspositionGradingView'
import { ListenAndCompleteGradingView } from '@/components/grading/ListenAndCompleteGradingView'
import { ListenAndCompleteEvaluator } from '@/components/grading/ListenAndCompleteEvaluator'
import JSZip from 'jszip'
import type { ExamAttempt, StudentAnswer } from '@music-exam-builder/shared/types'

export default function GradeAttemptPage() {
  const router = useRouter()
  const params = useParams()
  const attemptId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [attempt, setAttempt] = useState<ExamAttempt | null>(null)
  const [grades, setGrades] = useState<Record<string, { points: number; feedback: string }>>({})

  useEffect(() => {
    loadAttempt()
  }, [attemptId])

  // Load MusicXML files for transposition questions
  const loadMusicXMLFile = async (filePath: string, bucket: 'notation-files' | 'student-submissions' = 'notation-files'): Promise<string | null> => {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      if (!supabaseUrl) {
        console.error('No Supabase URL configured')
        return null
      }

      console.log('Loading MusicXML file:', { filePath, bucket })

      let url: string
      if (bucket === 'student-submissions') {
        // For student submissions, get signed URL
        const response = await api.getSubmissionUrl(filePath)
        url = response.data.url
        console.log('Got signed URL for student submission:', url)
      } else {
        // For notation files, use public URL
        // Ensure filePath doesn't have leading slash
        const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath
        url = `${supabaseUrl}/storage/v1/object/public/${bucket}/${cleanPath}`
        console.log('Constructed public URL:', url)
      }

      console.log('Fetching from URL:', url)
      const response = await fetch(url)
      console.log('Fetch response status:', response.status, response.statusText)
      console.log('Response headers:', Object.fromEntries(response.headers.entries()))
      
      if (!response.ok) {
        console.error('Failed to fetch file:', {
          status: response.status,
          statusText: response.statusText,
          url,
          filePath,
          bucket,
          supabaseUrl
        })
        
        // Try to get error details
        try {
          const errorText = await response.text()
          console.error('Error response body:', errorText)
        } catch (e) {
          console.error('Could not read error response')
        }
        
        // If 404, the file might not exist or the path is wrong
        if (response.status === 404) {
          console.error('File not found. Possible issues:')
          console.error('1. File path might be incorrect:', filePath)
          console.error('2. Bucket might not be public')
          console.error('3. File might not exist in storage')
        }
        
        return null
      }

      const contentType = response.headers.get('content-type') || ''
      console.log('Content-Type:', contentType)
      
      // Check file extension to determine if it's MXL (ZIP) or plain XML
      const fileExt = filePath.toLowerCase()
      const isMXL = fileExt.endsWith('.mxl')
      const isMusicXML = fileExt.endsWith('.musicxml') || fileExt.endsWith('.xml')
      
      // Only treat as binary/ZIP if it's explicitly .mxl or content-type specifically indicates zip
      // Don't treat as binary just because content-type is octet-stream (could be XML)
      const isBinary = isMXL || contentType.includes('application/zip') || contentType.includes('zip')

      console.log('File extension check:', { fileExt, isMXL, isMusicXML, isBinary, contentType })

      let fileContent: string

      if (isBinary) {
        console.log('Processing MXL (ZIP) file...')
        // Handle MXL (ZIP) files
        const arrayBuffer = await response.arrayBuffer()
        
        // Check if it's actually a ZIP by looking at magic bytes (PK signature)
        const bytes = new Uint8Array(arrayBuffer)
        const isZipFile = bytes.length >= 4 && 
                         bytes[0] === 0x50 && bytes[1] === 0x4B && 
                         (bytes[2] === 0x03 || bytes[2] === 0x05 || bytes[2] === 0x07) &&
                         (bytes[3] === 0x04 || bytes[3] === 0x06 || bytes[3] === 0x08)
        
        console.log('ZIP magic bytes check:', { 
          firstBytes: Array.from(bytes.slice(0, 4)), 
          isZipFile 
        })
        
        if (!isZipFile) {
          console.log('Not a valid ZIP file, trying as plain XML...')
          // Try to decode as UTF-8 text
          const decoder = new TextDecoder('utf-8')
          fileContent = decoder.decode(arrayBuffer)
        } else {
          const zip = await JSZip.loadAsync(arrayBuffer)
        
        // Try to find the main XML file
        let scoreFile: JSZip.JSZipObject | null = null
        
        if (zip.files['META-INF/container.xml']) {
          const containerXML = await zip.files['META-INF/container.xml'].async('string')
          const parser = new DOMParser()
          const containerDoc = parser.parseFromString(containerXML, 'text/xml')
          const rootFileEl = containerDoc.querySelector('rootfile')
          if (rootFileEl) {
            const fullPath = rootFileEl.getAttribute('full-path')
            if (fullPath && zip.files[fullPath]) {
              scoreFile = zip.files[fullPath]
            }
          }
        }
        
        if (!scoreFile && zip.files['score.xml']) {
          scoreFile = zip.files['score.xml']
        }
        
        if (!scoreFile) {
          // Find first .xml file
          for (const filename in zip.files) {
            if (filename.endsWith('.xml') && !filename.includes('META-INF')) {
              scoreFile = zip.files[filename]
              break
            }
          }
        }
        
        if (scoreFile) {
          fileContent = await scoreFile.async('string')
        } else {
          console.error('No XML file found in MXL')
          return null
        }
        }
      } else {
        // Plain XML file - read as text
        // Even if content-type is octet-stream, if extension is .musicxml or .xml, read as text
        fileContent = await response.text()
        console.log('Loaded text file, length:', fileContent.length)
      }

      // Check if it's a PDF
      if (fileContent.trim().startsWith('%PDF')) {
        console.error('File is PDF, not MusicXML')
        return null
      }

      // Check if it's valid XML
      if (!fileContent.trim().startsWith('<?xml') && !fileContent.trim().startsWith('<')) {
        console.error('File does not appear to be XML. First 100 chars:', fileContent.substring(0, 100))
        return null
      }

      console.log('Successfully loaded MusicXML, length:', fileContent.length)
      return fileContent
    } catch (error) {
      console.error('Error loading MusicXML file:', error)
      return null
    }
  }

  const loadAttempt = async () => {
    try {
      const response = await api.getAttempt(attemptId)
      console.log('Loaded attempt data:', response.data)
      setAttempt(response.data)

      // Initialize grades from existing data
      const initialGrades: Record<string, { points: number; feedback: string }> = {}
      response.data.answers?.forEach((answer: StudentAnswer) => {
        initialGrades[answer.id] = {
          points: (answer as any).points_earned || answer.pointsEarned || 0,
          feedback: answer.feedback || ''
        }
      })
      setGrades(initialGrades)
    } catch (err: any) {
      console.error('Error loading attempt:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleGradeChange = (answerId: string, field: 'points' | 'feedback', value: any) => {
    setGrades(prev => ({
      ...prev,
      [answerId]: {
        ...prev[answerId],
        [field]: value
      }
    }))
  }

  const handleSaveGrade = async (answerId: string, maxPoints: number) => {
    const grade = grades[answerId]
    if (!grade) return

    if (grade.points > maxPoints) {
      alert(`Points cannot exceed ${maxPoints}`)
      return
    }

    try {
      await api.gradeAnswer(answerId, grade.points, grade.feedback)
      alert('Grade saved successfully')
      await loadAttempt()
    } catch (err: any) {
      console.error('Error saving grade:', err)
      alert('Failed to save grade')
    }
  }

  const handleSaveAll = async () => {
    setSaving(true)
    try {
      const ungradedAnswers = attempt?.answers?.filter(a => !a.isGraded) || []
      
      for (const answer of ungradedAnswers) {
        const grade = grades[answer.id]
        if (grade) {
          await api.gradeAnswer(answer.id, grade.points, grade.feedback)
        }
      }

      alert('All grades saved successfully')
      await loadAttempt()
    } catch (err: any) {
      console.error('Error saving grades:', err)
      alert('Failed to save all grades')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading submission...</p>
      </div>
    )
  }

  if (!attempt) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Attempt not found</p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    )
  }

  const student = (attempt as any).student
  const totalAnswers = attempt.answers?.length || 0
  const gradedAnswers = attempt.answers?.filter(a => a.isGraded).length || 0
  const needsManualGrading = attempt.answers?.filter(a => {
    if (a.isGraded) return false
    const question = a.question as any
    const sectionType = question?.section?.section_type || question?.section?.sectionType
    return sectionType !== 'TRUE_FALSE' && sectionType !== 'MULTIPLE_CHOICE'
  }) || []
  
  // Calculate totalPoints from sum of maxPoints if not set or is 0
  const calculatedTotalPoints = attempt.totalPoints || (attempt as any).total_points || 
    (attempt.answers?.reduce((sum, a) => sum + (a.maxPoints || 0), 0) || 0)
  const actualScore = attempt.score || (attempt as any).score || 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            
            {needsManualGrading.length > 0 && (
              <Button onClick={handleSaveAll} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save All Grades'}
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Student Info */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl">
                  {student?.first_name} {student?.last_name}
                </CardTitle>
                <p className="text-gray-600 mt-1">{student?.email}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Submitted</p>
                <p className="font-medium">{formatDate((attempt as any).submittedAt || (attempt as any).submitted_at || attempt.startedAt || (attempt as any).started_at)}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <p className="font-semibold">
                  <span className={`px-2 py-1 rounded ${
                    attempt.status === 'GRADED' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {attempt.status === 'GRADED' ? 'Graded' : 'Pending'}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Score</p>
                <p className="text-2xl font-bold">
                  {actualScore}/{calculatedTotalPoints}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Percentage</p>
                <p className="text-2xl font-bold">
                  {calculatedTotalPoints > 0 ? Math.round((actualScore / calculatedTotalPoints) * 100) : 0}%
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Progress</p>
                <p className="text-2xl font-bold">
                  {gradedAnswers}/{totalAnswers}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Answers */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">Student Answers</h2>

          {attempt.answers?.map((answer, index) => {
            const question = answer.question
            if (!question) return null

            // Get section type from question.section or question.section_type
            // Also check if question has transposition data to infer type
            const questionAny = question as any
            let sectionType = questionAny.section?.section_type || 
                             questionAny.section?.sectionType ||
                             questionAny.section_type ||
                             questionAny.sectionType
            
            // If sectionType is not found but question has transposition data, assume TRANSPOSITION
            if (!sectionType && (questionAny.transposition || questionAny.typeData)) {
              if (questionAny.transposition || 
                  (questionAny.typeData && (questionAny.typeData.sourceInstrument || questionAny.typeData.source_instrument))) {
                sectionType = 'TRANSPOSITION'
              }
            }
            
            // Debug logging
            console.log('Question data:', {
              questionId: question.id,
              sectionType,
              hasTransposition: !!questionAny.transposition,
              transposition: questionAny.transposition,
              section: questionAny.section,
              typeData: questionAny.typeData
            })

            const isAutoGraded = sectionType === 'TRUE_FALSE' || sectionType === 'MULTIPLE_CHOICE'
            const isGraded = answer.isGraded

            return (
              <Card key={answer.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-base">
                        Question {index + 1}
                      </CardTitle>
                      <p className="text-gray-700 mt-2 whitespace-pre-wrap">
                        {(question as any).question_text || question.questionText}
                      </p>
                    </div>
                    <div className="ml-4 text-right">
                      {isGraded && (
                        <CheckCircle className="h-6 w-6 text-green-600 mb-2" />
                      )}
                      <span className="text-sm text-gray-600">
                        {(answer as any).points_earned || answer.pointsEarned || 0} / {answer.maxPoints} points
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Student's Answer */}
                  <div>
                    <Label className="text-sm font-semibold">Student's Answer:</Label>
                    <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                      {sectionType === 'TRANSPOSITION' ? (
                        <>
                          <TranspositionGradingView 
                            answer={answer}
                            question={question}
                            onLoadMusicXML={loadMusicXMLFile}
                          />
                          
                          {/* Transposition Evaluator for Teachers */}
                          <div className="mt-6 pt-6 border-t">
                            <TranspositionEvaluator
                              question={question}
                              studentAnswer={answer}
                              onEvaluationComplete={(result) => {
                                // Update the grade based on evaluation result
                                const suggestedPoints = Math.round((result.score / 100) * answer.maxPoints)
                                handleGradeChange(answer.id, 'points', suggestedPoints)
                                
                                // Build detailed feedback including all evaluated aspects
                                const feedbackParts = [
                                  `Automatic evaluation: ${result.percentage}% correct.`,
                                  `${result.correctNotes} correct notes, ${result.incorrectNotes} incorrect notes, ${result.missingNotes} missing notes, ${result.extraNotes} extra notes.`
                                ]
                                
                                // Add breakdown of error types if there are incorrect notes
                                if (result.incorrectNotes > 0 && result.details) {
                                  const errorTypes = result.details
                                    .filter(d => !d.isCorrect && d.errorType)
                                    .reduce((acc: Record<string, number>, d) => {
                                      if (d.errorType) {
                                        acc[d.errorType] = (acc[d.errorType] || 0) + 1
                                      }
                                      return acc
                                    }, {})
                                  
                                  const errorLabels: Record<string, string> = {
                                    'pitch': 'pitch errors',
                                    'duration': 'duration errors',
                                    'tie': 'tie errors',
                                    'slur': 'slur errors',
                                    'articulation': 'articulation errors'
                                  }
                                  
                                  const errorBreakdown = Object.entries(errorTypes)
                                    .map(([type, count]) => `${count} ${errorLabels[type] || type}`)
                                    .join(', ')
                                  
                                  if (errorBreakdown) {
                                    feedbackParts.push(`Error breakdown: ${errorBreakdown}.`)
                                  }
                                }
                                
                                handleGradeChange(answer.id, 'feedback', feedbackParts.join(' '))
                              }}
                            />
                          </div>
                        </>
                      ) : answer.submissionFilePath ? (
                        <div className="space-y-3">
                          <div className="flex items-center space-x-3">
                            <FileMusic className="h-8 w-8 text-blue-600" />
                            <div>
                              <p className="font-medium">File Submitted</p>
                              <Button 
                                variant="link" 
                                className="p-0 h-auto"
                                onClick={async () => {
                                  try {
                                    const filePath = answer.submissionFilePath
                                    if (!filePath) {
                                      alert('No submission file available')
                                      return
                                    }
                                    const response = await api.getSubmissionUrl(filePath)
                                    window.open(response.data.url, '_blank')
                                  } catch (err) {
                                    alert('Failed to load submission')
                                  }
                                }}
                              >
                                View Submission
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : sectionType === 'TRUE_FALSE' ? (
                        <p className="font-medium">
                          {answer.answer?.value ? 'True' : 'False'}
                        </p>
                      ) : sectionType === 'MULTIPLE_CHOICE' ? (
                        <p className="font-medium">{answer.answer?.selectedOption}</p>
                      ) : sectionType === 'LISTEN_AND_WRITE' ? (
                        <p className="font-medium">{answer.answer?.answer || 'No answer provided'}</p>
                      ) : sectionType === 'LISTEN_AND_COMPLETE' ? (
                        <>
                          <ListenAndCompleteGradingView 
                            answer={answer}
                            question={question}
                            onLoadMusicXML={loadMusicXMLFile}
                          />
                          
                          {/* Listen and Complete Evaluator for Teachers */}
                          <div className="mt-6 pt-6 border-t">
                            <ListenAndCompleteEvaluator
                              question={question}
                              studentAnswer={answer}
                              onEvaluationComplete={(result) => {
                                // Update the grade based on evaluation result
                                const suggestedPoints = Math.round((result.score / 100) * answer.maxPoints)
                                handleGradeChange(answer.id, 'points', suggestedPoints)
                                
                                // Build detailed feedback including all evaluated aspects
                                const feedbackParts = [
                                  `Automatic evaluation: ${result.percentage}% correct.`,
                                  `${result.correctNotes} correct notes, ${result.incorrectNotes} incorrect notes, ${result.missingNotes} missing notes, ${result.extraNotes} extra notes.`
                                ]
                                
                                // Add breakdown of error types if there are incorrect notes
                                if (result.incorrectNotes > 0 && result.details) {
                                  const errorTypes = result.details
                                    .filter(d => !d.isCorrect && d.errorType)
                                    .reduce((acc: Record<string, number>, d) => {
                                      if (d.errorType) {
                                        acc[d.errorType] = (acc[d.errorType] || 0) + 1
                                      }
                                      return acc
                                    }, {})
                                  
                                  const errorLabels: Record<string, string> = {
                                    'pitch': 'pitch errors',
                                    'duration': 'duration errors',
                                    'tie': 'tie errors',
                                    'slur': 'slur errors',
                                    'articulation': 'articulation errors'
                                  }
                                  
                                  const errorBreakdown = Object.entries(errorTypes)
                                    .map(([type, count]) => `${count} ${errorLabels[type] || type}`)
                                    .join(', ')
                                  
                                  if (errorBreakdown) {
                                    feedbackParts.push(`Error breakdown: ${errorBreakdown}.`)
                                  }
                                }
                                
                                handleGradeChange(answer.id, 'feedback', feedbackParts.join(' '))
                              }}
                            />
                          </div>
                        </>
                      ) : sectionType === 'LISTEN_AND_REPEAT' ? (
                        <div>
                          <p className="font-medium">
                            {answer.answer?.notes ? answer.answer.notes.join(' → ') : 'No answer provided'}
                          </p>
                          {answer.answer?.answer && (
                            <p className="text-sm text-gray-600 mt-1">
                              (as string: {answer.answer.answer})
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="font-medium">{answer.answer?.answer || 'No answer provided'}</p>
                      )}
                    </div>
                  </div>

                  {/* Grading Section */}
                  {!isAutoGraded && (
                    <div className="border-t pt-4 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`points-${answer.id}`}>Points Earned *</Label>
                          <Input
                            id={`points-${answer.id}`}
                            type="number"
                            min="0"
                            max={answer.maxPoints}
                            value={grades[answer.id]?.points || 0}
                            onChange={(e) => handleGradeChange(answer.id, 'points', parseFloat(e.target.value))}
                            disabled={isGraded}
                          />
                          <p className="text-sm text-gray-600">Max: {answer.maxPoints} points</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`feedback-${answer.id}`}>Feedback (Optional)</Label>
                        <textarea
                          id={`feedback-${answer.id}`}
                          className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          placeholder="Provide feedback for the student..."
                          value={grades[answer.id]?.feedback || ''}
                          onChange={(e) => handleGradeChange(answer.id, 'feedback', e.target.value)}
                          disabled={isGraded}
                        />
                      </div>

                      {!isGraded && (
                        <Button 
                          onClick={() => handleSaveGrade(answer.id, answer.maxPoints)}
                          className="w-full"
                        >
                          <Save className="h-4 w-4 mr-2" />
                          Save Grade
                        </Button>
                      )}

                      {answer.feedback && isGraded && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <p className="text-sm font-semibold text-blue-900 mb-1">Your Feedback:</p>
                          <p className="text-sm text-blue-800">{answer.feedback}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {isAutoGraded && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-sm text-green-800">
                        ✓ Automatically graded
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </main>
    </div>
  )
}

