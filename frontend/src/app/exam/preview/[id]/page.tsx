'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Eye, Clock, FileText } from 'lucide-react'
import Link from 'next/link'
import type { Exam, Question } from '@music-exam-builder/shared/types'

export default function PreviewExamPage() {
  const router = useRouter()
  const params = useParams()
  const examId = params.id as string

  const [loading, setLoading] = useState(true)
  const [exam, setExam] = useState<Exam | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadExam()
  }, [examId])

  const loadExam = async () => {
    try {
      const response = await api.getExam(examId)
      setExam(response.data)
    } catch (err: any) {
      console.error('Error loading exam:', err)
      setError('Failed to load exam')
    } finally {
      setLoading(false)
    }
  }

  const getAllQuestions = (): Question[] => {
    if (!exam?.sections) return []
    return exam.sections.flatMap(section => section.questions || [])
  }

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading exam preview...</p>
      </div>
    )
  }

  if (error || !exam) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Exam not found'}</p>
          <Link href="/dashboard/teacher">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    )
  }

  const questions = getAllQuestions()
  const sections = exam.sections || []

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link href={`/exam/edit/${examId}`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Edit
              </Button>
            </Link>
            
            <div className="flex items-center space-x-4">
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium flex items-center">
                <Eye className="h-4 w-4 mr-1" />
                Preview Mode
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Exam Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-2xl">{exam.title}</CardTitle>
            {exam.description && (
              <p className="text-gray-600 mt-2">{exam.description}</p>
            )}
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              {exam.durationMinutes && (
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span>{formatTime(exam.durationMinutes)}</span>
                </div>
              )}
              {exam.totalPoints > 0 && (
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4" />
                  <span>{exam.totalPoints} points</span>
                </div>
              )}
              {exam.passingScore && (
                <div>
                  <span>Passing: {exam.passingScore}%</span>
                </div>
              )}
              <div>
                <span>{questions.length} {questions.length === 1 ? 'question' : 'questions'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sections and Questions */}
        {sections.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-600">No sections or questions yet.</p>
              <Link href={`/exam/edit/${examId}`}>
                <Button className="mt-4">Add Sections and Questions</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {sections
              .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
              .map((section, sectionIndex) => {
                const sectionQuestions = section.questions || []
                const sectionType = section.sectionType

                return (
                  <div key={section.id} className="space-y-4">
                    {/* Section Header */}
                    <Card>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-xl">
                              Section {sectionIndex + 1}: {section.title}
                            </CardTitle>
                            {section.description && (
                              <p className="text-gray-600 mt-1 text-sm">{section.description}</p>
                            )}
                          </div>
                          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                            {sectionType?.replace(/_/g, ' ') || 'Unknown'}
                          </span>
                        </div>
                      </CardHeader>
                    </Card>

                    {/* Questions in Section */}
                    {sectionQuestions.length === 0 ? (
                      <Card>
                        <CardContent className="py-8 text-center text-gray-600">
                          No questions in this section yet.
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="space-y-4">
                        {sectionQuestions
                          .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
                          .map((question, questionIndex) => {
                            const globalIndex = questions.findIndex(q => q.id === question.id) + 1

                            return (
                              <Card key={question.id}>
                                <CardHeader>
                                  <div className="flex justify-between items-start">
                                    <CardTitle className="text-lg">
                                      Question {globalIndex}
                                    </CardTitle>
                                    <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
                                      {question.points} {question.points === 1 ? 'point' : 'points'}
                                    </span>
                                  </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                  <p className="text-gray-900 whitespace-pre-wrap text-base">
                                    {(question as any).question_text || question.questionText}
                                  </p>

                                  {/* Question Type Preview */}
                                  <div className="border-t pt-4">
                                    {sectionType === 'TRUE_FALSE' && (
                                      <div className="space-y-2">
                                        <p className="text-sm font-medium text-gray-700">Answer Type: True/False</p>
                                        <div className="flex space-x-4">
                                          <label className="flex items-center space-x-2 p-3 border-2 border-gray-200 rounded-lg">
                                            <input type="radio" disabled className="cursor-not-allowed" />
                                            <span>True</span>
                                          </label>
                                          <label className="flex items-center space-x-2 p-3 border-2 border-gray-200 rounded-lg">
                                            <input type="radio" disabled className="cursor-not-allowed" />
                                            <span>False</span>
                                          </label>
                                        </div>
                                        {(() => {
                                          const tfData = Array.isArray((question as any).true_false)
                                            ? (question as any).true_false[0]
                                            : (question as any).true_false;
                                          return tfData && (
                                            <p className="text-sm text-gray-600 mt-2">
                                              <span className="font-medium">Correct Answer:</span>{' '}
                                              {tfData.correct_answer ? 'True' : 'False'}
                                            </p>
                                          );
                                        })()}
                                      </div>
                                    )}

                                    {sectionType === 'MULTIPLE_CHOICE' && (
                                      <div className="space-y-2">
                                        <p className="text-sm font-medium text-gray-700">Answer Type: Multiple Choice</p>
                                        {(() => {
                                          // multiple_choice can be an object or an array with one element
                                          const mcData = Array.isArray((question as any).multiple_choice) 
                                            ? (question as any).multiple_choice[0]
                                            : (question as any).multiple_choice;
                                          
                                          if (!mcData) {
                                            return <p className="text-sm text-gray-500 italic">Multiple choice data not loaded</p>;
                                          }
                                          
                                          // Options can be stored as JSONB array or already parsed
                                          let options: string[] = [];
                                          if (Array.isArray(mcData.options)) {
                                            options = mcData.options;
                                          } else if (typeof mcData.options === 'string') {
                                            try {
                                              options = JSON.parse(mcData.options);
                                            } catch (e) {
                                              console.error('Error parsing options:', e, mcData.options);
                                            }
                                          }
                                          
                                          if (options.length === 0) {
                                            return <p className="text-sm text-gray-500 italic">No options available</p>;
                                          }
                                          
                                          return (
                                            <div className="space-y-2">
                                              {options.map((option: string, idx: number) => (
                                                <label
                                                  key={idx}
                                                  className="flex items-center space-x-2 p-3 border-2 border-gray-200 rounded-lg"
                                                >
                                                  <input type="radio" disabled className="cursor-not-allowed" />
                                                  <span className="flex-1">{option || `Option ${idx + 1}`}</span>
                                                  {mcData.correct_option_index === idx && (
                                                    <span className="text-sm text-green-600 font-medium">
                                                      ✓ Correct
                                                    </span>
                                                  )}
                                                </label>
                                              ))}
                                            </div>
                                          );
                                        })()}
                                      </div>
                                    )}

                                    {sectionType === 'LISTENING' && (
                                      <div className="space-y-2">
                                        <p className="text-sm font-medium text-gray-700">Answer Type: Listening</p>
                                        {(() => {
                                          const listenData = Array.isArray((question as any).listening)
                                            ? (question as any).listening[0]
                                            : (question as any).listening;
                                          return listenData && (
                                            <>
                                              {listenData.audio_file_path && (
                                                <div className="p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                                                  <p className="text-sm text-gray-600 mb-2">Audio file will be played here</p>
                                                  <p className="text-xs text-gray-500">
                                                    File: {listenData.audio_file_path}
                                                  </p>
                                                </div>
                                              )}
                                              {listenData.question_type && (
                                                <p className="text-sm text-gray-600">
                                                  <span className="font-medium">Question Type:</span>{' '}
                                                  {listenData.question_type}
                                                </p>
                                              )}
                                            </>
                                          );
                                        })()}
                                      </div>
                                    )}

                                    {sectionType === 'TRANSPOSITION' && (
                                      <div className="space-y-2">
                                        <p className="text-sm font-medium text-gray-700">Answer Type: Transposition</p>
                                        {(() => {
                                          const transData = Array.isArray((question as any).transposition)
                                            ? (question as any).transposition[0]
                                            : (question as any).transposition;
                                          return transData && (
                                            <div className="space-y-2 text-sm">
                                              {transData.source_instrument && (
                                                <p>
                                                  <span className="font-medium">From:</span>{' '}
                                                  {transData.source_instrument}
                                                </p>
                                              )}
                                              {transData.target_instrument && (
                                                <p>
                                                  <span className="font-medium">To:</span>{' '}
                                                  {transData.target_instrument}
                                                </p>
                                              )}
                                              {transData.notation_file_path && (
                                                <div className="p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 mt-2">
                                                  <p className="text-sm text-gray-600 mb-2">Notation file will be displayed here</p>
                                                  <p className="text-xs text-gray-500">
                                                    File: {transData.notation_file_path}
                                                  </p>
                                                </div>
                                              )}
                                              <p className="text-gray-600 mt-2">
                                                Students will upload their transposed score.
                                              </p>
                                            </div>
                                          );
                                        })()}
                                      </div>
                                    )}

                                    {sectionType === 'ORCHESTRATION' && (
                                      <div className="space-y-2">
                                        <p className="text-sm font-medium text-gray-700">Answer Type: Orchestration</p>
                                        {(() => {
                                          const orchData = Array.isArray((question as any).orchestration)
                                            ? (question as any).orchestration[0]
                                            : (question as any).orchestration;
                                          return orchData && (
                                            <div className="space-y-2 text-sm">
                                              {orchData.piano_score_path && (
                                                <div className="p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                                                  <p className="text-sm text-gray-600 mb-2">Piano score will be displayed here</p>
                                                  <p className="text-xs text-gray-500">
                                                    File: {orchData.piano_score_path}
                                                  </p>
                                                </div>
                                              )}
                                              {orchData.target_ensemble && (
                                                <p>
                                                  <span className="font-medium">Target Ensemble:</span>{' '}
                                                  {String(orchData.target_ensemble).replace(/_/g, ' ')}
                                                </p>
                                              )}
                                              {orchData.ensemble_instruments && 
                                               Array.isArray(orchData.ensemble_instruments) &&
                                               orchData.ensemble_instruments.length > 0 && (
                                                <div className="mt-2">
                                                  <p className="font-medium mb-1">Required Instruments:</p>
                                                  <div className="flex flex-wrap gap-2">
                                                    {(orchData.ensemble_instruments as string[]).map((inst: string, idx: number) => (
                                                      <span
                                                        key={idx}
                                                        className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs"
                                                      >
                                                        {inst}
                                                      </span>
                                                    ))}
                                                  </div>
                                                </div>
                                              )}
                                              {orchData.rubric && 
                                               Array.isArray(orchData.rubric) &&
                                               orchData.rubric.length > 0 && (
                                                <div className="mt-3 pt-3 border-t">
                                                  <p className="font-medium mb-2">Grading Rubric:</p>
                                                  <ul className="space-y-1">
                                                    {(orchData.rubric as any[]).map((item: any, idx: number) => (
                                                      <li key={idx} className="text-sm text-gray-600">
                                                        • {item.criteria} ({item.points} {item.points === 1 ? 'point' : 'points'})
                                                      </li>
                                                    ))}
                                                  </ul>
                                                </div>
                                              )}
                                              <p className="text-gray-600 mt-2">
                                                Students will upload their orchestrated score.
                                              </p>
                                            </div>
                                          );
                                        })()}
                                      </div>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            )
                          })}
                      </div>
                    )}
                  </div>
                )
              })}
          </div>
        )}

        {/* Footer Actions */}
        <div className="mt-8 flex justify-center">
          <Link href={`/exam/edit/${examId}`}>
            <Button size="lg">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Edit Exam
            </Button>
          </Link>
        </div>
      </main>
    </div>
  )
}

