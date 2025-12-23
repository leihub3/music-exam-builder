'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react'
import { TrueFalseAnswer } from '@/components/answers/TrueFalseAnswer'
import { MultipleChoiceAnswer } from '@/components/answers/MultipleChoiceAnswer'
import { ListeningAnswer } from '@/components/answers/ListeningAnswer'
import { TranspositionAnswer } from '@/components/answers/TranspositionAnswer'
import { OrchestrationAnswer } from '@/components/answers/OrchestrationAnswer'
import { ListenAndWriteAnswer } from '@/components/answers/ListenAndWriteAnswer'
import { ListenAndRepeatAnswer } from '@/components/answers/ListenAndRepeatAnswer'
import { ListenAndCompleteAnswer } from '@/components/answers/ListenAndCompleteAnswer'
import type { Exam, ExamAttempt, Question } from '@music-exam-builder/shared/types'

export default function TakeExamPage() {
  const router = useRouter()
  const params = useParams()
  const examId = params.id as string

  const [loading, setLoading] = useState(true)
  const [exam, setExam] = useState<Exam | null>(null)
  const [attempt, setAttempt] = useState<ExamAttempt | null>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [savedAnswers, setSavedAnswers] = useState<Set<string>>(new Set())
  const [savingAnswer, setSavingAnswer] = useState<string | null>(null)
  const [timeStarted, setTimeStarted] = useState<Date>(new Date())
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    startExam()
  }, [examId])

  // Timer
  useEffect(() => {
    // Get durationMinutes - handle both snake_case and camelCase
    const durationMinutes = exam?.durationMinutes ?? exam?.duration_minutes
    
    if (!durationMinutes || durationMinutes <= 0) {
      // No time limit - hide timer
      setTimeRemaining(null)
      return
    }

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - timeStarted.getTime()) / 1000)
      const total = durationMinutes * 60
      const remaining = Math.max(0, total - elapsed)
      
      setTimeRemaining(remaining)

      if (remaining === 0) {
        handleSubmit()
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [exam, timeStarted])

  const startExam = async () => {
    try {
      // Get exam details
      const examResponse = await api.getExam(examId)
      const examData = examResponse.data
      
      // Ensure durationMinutes is set correctly (handle both formats)
      if (examData && !examData.durationMinutes && examData.duration_minutes !== undefined) {
        examData.durationMinutes = examData.duration_minutes
      }
      
      setExam(examData)

      // Start or resume attempt
      const attemptResponse = await api.startAttempt(examId)
      setAttempt(attemptResponse.data)
      
      // Parse startedAt - handle both ISO string and Date object
      const startedAt = attemptResponse.data.startedAt || attemptResponse.data.started_at
      setTimeStarted(new Date(startedAt))
      
      // Initialize timer if exam has duration
      const durationMinutes = examData?.durationMinutes ?? examData?.duration_minutes
      if (durationMinutes && durationMinutes > 0) {
        setTimeRemaining(durationMinutes * 60) // Initialize with full duration
      }
    } catch (err: any) {
      console.error('Error starting exam:', err)
      alert('Failed to start exam')
    } finally {
      setLoading(false)
    }
  }

  const getAllQuestions = (): Question[] => {
    if (!exam?.sections) return []
    return exam.sections.flatMap(section => section.questions || [])
  }

  const currentQuestion = getAllQuestions()[currentQuestionIndex]

  const handleAnswerChange = (questionId: string, answer: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }))
    // Remove from saved answers if answer changes after being saved
    setSavedAnswers(prev => {
      const newSet = new Set(prev)
      newSet.delete(questionId)
      return newSet
    })
  }

  const handleSaveAnswer = async (questionId: string) => {
    if (!attempt || !answers[questionId]) {
      alert('Please provide an answer before saving.')
      return
    }
    
    const question = getAllQuestions().find(q => q.id === questionId)
    if (!question) return

    setSavingAnswer(questionId)
    
    try {
      const answerData = answers[questionId]
      
      // Validate that we have actual answer content
      const hasTextAnswer = answerData.answer && answerData.answer.trim().length > 0
      const hasMusicXML = answerData.musicXML || answerData.completedScore
      const hasFile = answerData.file
      
      if (!hasTextAnswer && !hasMusicXML && !hasFile) {
        alert('Please provide an answer before saving. The answer appears to be empty.')
        setSavingAnswer(null)
        return
      }
      
      // If answer has MusicXML, convert to file for upload
      // Handle both musicXML (from Transposition) and completedScore (from Listen and Complete)
      let fileToUpload = answerData.file
      const musicXMLContent = answerData.musicXML || answerData.completedScore
      if (musicXMLContent && !fileToUpload) {
        // Validate MusicXML content is not empty
        if (musicXMLContent.trim().length === 0) {
          alert('The MusicXML content is empty. Please complete your answer before saving.')
          setSavingAnswer(null)
          return
        }
        
        // Create a Blob from MusicXML string
        const blob = new Blob([musicXMLContent], { type: 'application/xml' })
        fileToUpload = new File([blob], answerData.fileName || 'score.musicxml', { type: 'application/xml' })
      }
      
      console.log('Saving answer:', {
        questionId,
        hasTextAnswer,
        hasMusicXML: !!musicXMLContent,
        hasFile: !!fileToUpload,
        musicXMLLength: musicXMLContent?.length || 0
      })
      
      await api.submitAnswer({
        attemptId: attempt.id,
        questionId: question.id,
        answer: answerData,
        maxPoints: question.points,
        file: fileToUpload || undefined,
      })
      
      // Mark as saved
      setSavedAnswers(prev => new Set(prev).add(questionId))
    } catch (err: any) {
      console.error('Error saving answer:', err)
      alert('Failed to save answer: ' + (err.message || 'Please try again.'))
    } finally {
      setSavingAnswer(null)
    }
  }

  const handleNext = () => {
    if (currentQuestionIndex < getAllQuestions().length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
    }
  }

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1)
    }
  }

  const handleSubmit = async () => {
    if (!attempt) return

    const unanswered = getAllQuestions().filter(q => !answers[q.id])
    if (unanswered.length > 0) {
      const confirm = window.confirm(
        `You have ${unanswered.length} unanswered question(s). Are you sure you want to submit?`
      )
      if (!confirm) return
    }

    setSubmitting(true)

    try {
      // Submit all answers
      const questions = getAllQuestions()
      for (const question of questions) {
        if (answers[question.id]) {
          const answerData = answers[question.id]
          
          // If answer has MusicXML, convert to file for upload
          // Handle both musicXML (from Transposition) and completedScore (from Listen and Complete)
          let fileToUpload = answerData.file
          const musicXMLContent = answerData.musicXML || answerData.completedScore
          if (musicXMLContent && !fileToUpload) {
            // Create a Blob from MusicXML string
            const blob = new Blob([musicXMLContent], { type: 'application/xml' })
            fileToUpload = new File([blob], answerData.fileName || 'score.musicxml', { type: 'application/xml' })
          }
          
          await api.submitAnswer({
            attemptId: attempt.id,
            questionId: question.id,
            answer: answerData,
            maxPoints: question.points,
            file: fileToUpload || undefined, // Include file if present (for transposition/orchestration)
          })
        }
      }

      // Submit attempt
      const timeSpent = Math.floor((Date.now() - timeStarted.getTime()) / 1000)
      await api.submitAttempt(attempt.id, timeSpent)

      // Redirect to results
      router.push(`/exam/results/student/${attempt.id}`)
    } catch (err: any) {
      console.error('Error submitting exam:', err)
      alert('Failed to submit exam')
    } finally {
      setSubmitting(false)
    }
  }

  const formatTime = (seconds: number | null) => {
    if (seconds === null || isNaN(seconds) || seconds < 0) {
      return '--:--'
    }
    
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading exam...</p>
      </div>
    )
  }

  if (!exam || !attempt) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Exam not found or not accessible</p>
          <Button onClick={() => router.push('/dashboard/student')}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  const questions = getAllQuestions()
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Timer */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{exam.title}</h1>
              <p className="text-sm text-gray-600">
                Question {currentQuestionIndex + 1} of {questions.length}
              </p>
            </div>
            {timeRemaining !== null && exam?.durationMinutes && (
              <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                timeRemaining < 300 ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
              }`}>
                <Clock className="h-5 w-5" />
                <span className="font-mono text-lg">{formatTime(timeRemaining)}</span>
              </div>
            )}
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {currentQuestion && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">
                  Question {currentQuestionIndex + 1}
                </CardTitle>
                <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
                  {currentQuestion.points} {currentQuestion.points === 1 ? 'point' : 'points'}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Render appropriate answer component based on section type */}
              {exam.sections?.map(section => {
                if (!section.questions?.some(q => q.id === currentQuestion.id)) return null
                
                // Handle both camelCase and snake_case
                const sectionType = section.sectionType || section.section_type
                
                // Debug logging
                if (!sectionType) {
                  console.warn('Section type not found for section:', section.id, section)
                }
                
                // Hide question text for TRANSPOSITION and ORCHESTRATION questions
                // as they have their own instruction displays
                const shouldShowQuestionText = sectionType !== 'TRANSPOSITION' && sectionType !== 'ORCHESTRATION' && sectionType !== 'LISTEN_AND_COMPLETE'
                
                return (
                  <div key={section.id}>
                    {shouldShowQuestionText && (
                      <p className="text-gray-900 whitespace-pre-wrap text-lg">
                        {currentQuestion.questionText}
                      </p>
                    )}
                    
                    {sectionType === 'TRUE_FALSE' && (
                      <TrueFalseAnswer
                        value={answers[currentQuestion.id]}
                        onChange={(val) => handleAnswerChange(currentQuestion.id, val)}
                      />
                    )}
                    {sectionType === 'MULTIPLE_CHOICE' && (
                      <MultipleChoiceAnswer
                        question={currentQuestion}
                        value={answers[currentQuestion.id]}
                        onChange={(val) => handleAnswerChange(currentQuestion.id, val)}
                      />
                    )}
                    {sectionType === 'LISTENING' && (
                      <ListeningAnswer
                        question={currentQuestion}
                        value={answers[currentQuestion.id]}
                        onChange={(val) => handleAnswerChange(currentQuestion.id, val)}
                      />
                    )}
                    {sectionType === 'TRANSPOSITION' && (
                      <TranspositionAnswer
                        question={currentQuestion}
                        value={answers[currentQuestion.id]}
                        onChange={(val) => handleAnswerChange(currentQuestion.id, val)}
                      />
                    )}
                    {sectionType === 'ORCHESTRATION' && (
                      <OrchestrationAnswer
                        question={currentQuestion}
                        value={answers[currentQuestion.id]}
                        onChange={(val) => handleAnswerChange(currentQuestion.id, val)}
                      />
                    )}
                    {sectionType === 'LISTEN_AND_WRITE' && (
                      <ListenAndWriteAnswer
                        question={currentQuestion}
                        value={answers[currentQuestion.id]}
                        onChange={(val) => handleAnswerChange(currentQuestion.id, val)}
                      />
                    )}
                    {sectionType === 'LISTEN_AND_REPEAT' && (
                      <ListenAndRepeatAnswer
                        question={currentQuestion}
                        value={answers[currentQuestion.id]}
                        onChange={(val) => handleAnswerChange(currentQuestion.id, val)}
                      />
                    )}
                    {sectionType === 'LISTEN_AND_COMPLETE' && (
                      <ListenAndCompleteAnswer
                        question={currentQuestion}
                        value={answers[currentQuestion.id]}
                        onChange={(val) => handleAnswerChange(currentQuestion.id, val)}
                      />
                    )}
                    {!sectionType && (
                      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
                        <p className="text-yellow-800 text-sm">
                          Warning: Section type not found. Unable to render question component.
                        </p>
                        <p className="text-yellow-600 text-xs mt-1">
                          Section ID: {section.id}
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )}

        {/* Save Answer Button */}
        {answers[currentQuestion.id] && (
          <div className="flex justify-center my-4">
            <Button
              onClick={() => handleSaveAnswer(currentQuestion.id)}
              disabled={savingAnswer === currentQuestion.id || savedAnswers.has(currentQuestion.id)}
              variant={savedAnswers.has(currentQuestion.id) ? "outline" : "default"}
              className={savedAnswers.has(currentQuestion.id) ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-100" : ""}
            >
              {savingAnswer === currentQuestion.id ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Saving...
                </>
              ) : savedAnswers.has(currentQuestion.id) ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Answer Saved
                </>
              ) : (
                <>
                  Save Answer
                </>
              )}
            </Button>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          {currentQuestionIndex === questions.length - 1 ? (
            <Button onClick={handleSubmit} disabled={submitting} size="lg">
              {submitting ? (
                'Submitting...'
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Submit Exam
                </>
              )}
            </Button>
          ) : (
            <Button onClick={handleNext}>
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>

        {/* Question Overview */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-base">Question Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-10 gap-2">
              {questions.map((q, index) => (
                <button
                  key={q.id}
                  onClick={() => setCurrentQuestionIndex(index)}
                  className={`p-2 rounded border-2 transition-colors ${
                    index === currentQuestionIndex
                      ? 'border-blue-600 bg-blue-50'
                      : savedAnswers.has(q.id)
                      ? 'border-green-600 bg-green-50'
                      : answers[q.id]
                      ? 'border-yellow-500 bg-yellow-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {index + 1}
                </button>
              ))}
            </div>
            <div className="flex items-center space-x-4 mt-4 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-blue-600 bg-blue-50 rounded" />
                <span>Current</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-green-600 bg-green-50 rounded" />
                <span>Saved</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-yellow-500 bg-yellow-50 rounded" />
                <span>Unsaved</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-gray-300 rounded" />
                <span>Unanswered</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

