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
                                      <div className="space-y-4">
                                        <p className="text-sm font-medium text-gray-700">
                                          Answer Type: Multiple Choice {section?.sectionCategory === 'EAR_TRAINING' ? '(Ear Training)' : ''}
                                        </p>
                                        {(() => {
                                          // multiple_choice can be an object or an array with one element
                                          const mcData = Array.isArray((question as any).multiple_choice) 
                                            ? (question as any).multiple_choice[0]
                                            : (question as any).multiple_choice;
                                          
                                          if (!mcData) {
                                            return <p className="text-sm text-gray-500 italic">Multiple choice data not loaded</p>;
                                          }

                                          // Display audio if present
                                          const audioFilePath = mcData.audio_file_path;
                                          const optionNotationFilePaths = Array.isArray(mcData.option_notation_file_paths) 
                                            ? mcData.option_notation_file_paths 
                                            : [];
                                          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
                                          
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
                                          
                                          return (
                                            <div className="space-y-4">
                                              {/* Audio Preview */}
                                              {audioFilePath && (
                                                <div className="border rounded-lg p-4 bg-gray-50">
                                                  <p className="text-sm font-medium text-gray-700 mb-2">Audio File:</p>
                                                  <audio
                                                    controls
                                                    className="w-full"
                                                    src={supabaseUrl ? `${supabaseUrl}/storage/v1/object/public/audio-files/${audioFilePath}` : ''}
                                                  >
                                                    Your browser does not support the audio element.
                                                  </audio>
                                                </div>
                                              )}
                                          
                                              {/* Options with Notation Files */}
                                              {options.length === 0 ? (
                                                <p className="text-sm text-gray-500 italic">No options available</p>
                                              ) : (
                                                <div className="space-y-3">
                                                  {options.map((option: string, idx: number) => {
                                                    const notationFilePath = optionNotationFilePaths[idx];
                                                    return (
                                                      <div
                                                        key={idx}
                                                        className="border-2 border-gray-200 rounded-lg p-3 space-y-2"
                                                      >
                                                        <div className="flex items-center space-x-2">
                                                          <input type="radio" disabled className="cursor-not-allowed" />
                                                          <span className="flex-1 font-medium">{option || `Option ${idx + 1}`}</span>
                                                          {mcData.correct_option_index === idx && (
                                                            <span className="text-sm text-green-600 font-medium">
                                                              ✓ Correct
                                                            </span>
                                                          )}
                                                        </div>
                                                        {notationFilePath ? (
                                                          <div className="pl-7">
                                                            <p className="text-xs text-gray-600 font-medium mb-1">Notation File:</p>
                                                            <p className="text-xs text-gray-500">{notationFilePath}</p>
                                                          </div>
                                                        ) : (
                                                          <div className="pl-7">
                                                            <p className="text-xs text-yellow-600 italic">No notation file for this option</p>
                                                          </div>
                                                        )}
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                              )}
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

                                    {sectionType === 'LISTEN_AND_WRITE' && (
                                      <div className="space-y-2">
                                        <p className="text-sm font-medium text-gray-700">
                                          Answer Type: Listen and Write
                                          {section?.sectionCategory === 'EAR_TRAINING' && ' (Ear Training)'}
                                        </p>
                                        {(() => {
                                          const lawData = Array.isArray((question as any).listen_and_write)
                                            ? (question as any).listen_and_write[0]
                                            : (question as any).listen_and_write;
                                          return lawData && (
                                            <div className="space-y-2 text-sm">
                                              {lawData.audio_file_path && (
                                                <div className="p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                                                  <p className="text-gray-600 mb-2">Audio file available</p>
                                                  <audio controls className="w-full mt-2" src={(() => {
                                                    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
                                                    if (supabaseUrl && lawData.audio_file_path) {
                                                      return `${supabaseUrl}/storage/v1/object/public/audio-files/${lawData.audio_file_path}`;
                                                    }
                                                    return '';
                                                  })()}>
                                                    Your browser does not support the audio element.
                                                  </audio>
                                                </div>
                                              )}
                                              {lawData.concert_a_play_limit !== undefined && (
                                                <p className="text-gray-600">
                                                  Concert A plays: {lawData.concert_a_play_limit ?? 3}
                                                </p>
                                              )}
                                              {lawData.reference_score_path || lawData.reference_score_music_xml ? (
                                                <p className="text-green-600 font-medium">
                                                  ✓ Reference score available for auto-grading
                                                </p>
                                              ) : (
                                                <p className="text-gray-600">
                                                  Manual grading (no reference score provided)
                                                </p>
                                              )}
                                              {lawData.answer_format && (
                                                <p>
                                                  <span className="font-medium">Answer Format:</span>{' '}
                                                  {lawData.answer_format === 'notes' ? 'Note Names' : 'Free Text'}
                                                </p>
                                              )}
                                            </div>
                                          );
                                        })()}
                                      </div>
                                    )}

                                    {sectionType === 'INTERVAL_DICTATION' && (
                                      <div className="space-y-2">
                                        <p className="text-sm font-medium text-gray-700">Answer Type: Interval Dictation</p>
                                        {(() => {
                                          const intDictData = Array.isArray((question as any).interval_dictation)
                                            ? (question as any).interval_dictation[0]
                                            : (question as any).interval_dictation;
                                          return intDictData && (
                                            <div className="space-y-2 text-sm">
                                              <p className="text-gray-600">
                                                Root Note: {intDictData.root_note || 'C4'} | 
                                                Interval: {intDictData.correct_interval} | 
                                                Direction: {intDictData.interval_direction || 'ascending'}
                                              </p>
                                              <p className="text-gray-600">
                                                Example play limit: {intDictData.example_play_limit ?? 5} times
                                              </p>
                                              <p className="text-green-600 font-medium">
                                                ✓ Audio will be generated automatically from these parameters
                                              </p>
                                            </div>
                                          );
                                        })()}
                                      </div>
                                    )}

                                    {sectionType === 'CHORD_DICTATION' && (
                                      <div className="space-y-2">
                                        <p className="text-sm font-medium text-gray-700">Answer Type: Chord Dictation</p>
                                        {(() => {
                                          const chDictData = Array.isArray((question as any).chord_dictation)
                                            ? (question as any).chord_dictation[0]
                                            : (question as any).chord_dictation;
                                          return chDictData && (
                                            <div className="space-y-2 text-sm">
                                              <p className="text-gray-600">
                                                Correct Chord: {chDictData.correct_chord} | 
                                                Octave: {chDictData.octave ?? 4}
                                              </p>
                                              <p className="text-gray-600">
                                                Example play limit: {chDictData.example_play_limit ?? 5} times
                                              </p>
                                              <p className="text-green-600 font-medium">
                                                ✓ Audio will be generated automatically from these parameters
                                              </p>
                                            </div>
                                          );
                                        })()}
                                      </div>
                                    )}

                                    {sectionType === 'PROGRESSION_DICTATION' && (
                                      <div className="space-y-2">
                                        <p className="text-sm font-medium text-gray-700">Answer Type: Progression Dictation</p>
                                        {(() => {
                                          const progDictData = Array.isArray((question as any).progression_dictation)
                                            ? (question as any).progression_dictation[0]
                                            : (question as any).progression_dictation;
                                          return progDictData && (
                                            <div className="space-y-2 text-sm">
                                              <p className="text-gray-600">
                                                Progression: {progDictData.correct_progression?.join(' → ') || 'N/A'} in {progDictData.progression_key || 'C major'}
                                              </p>
                                              <p className="text-gray-600">
                                                Example play limit: {progDictData.example_play_limit ?? 3} times
                                              </p>
                                              <p className="text-green-600 font-medium">
                                                ✓ Audio will be generated automatically from these parameters
                                              </p>
                                            </div>
                                          );
                                        })()}
                                      </div>
                                    )}

                                    {sectionType === 'LISTEN_AND_REPEAT' && (
                                      <div className="space-y-2">
                                        <p className="text-sm font-medium text-gray-700">Answer Type: Listen and Repeat</p>
                                        {(() => {
                                          const larData = Array.isArray((question as any).listen_and_repeat)
                                            ? (question as any).listen_and_repeat[0]
                                            : (question as any).listen_and_repeat;
                                          return larData && (
                                            <div className="space-y-2 text-sm">
                                              {larData.audio_file_path && (
                                                <p className="text-gray-600">
                                                  Audio file available. Students will repeat the sequence of notes.
                                                </p>
                                              )}
                                              {larData.note_format && (
                                                <p>
                                                  <span className="font-medium">Note Format:</span>{' '}
                                                  {larData.note_format === 'solfege' ? 'Solfege (do, re, mi)' : 
                                                   larData.note_format === 'note_names' ? 'Note Names (C, D, E)' : 'Both'}
                                                </p>
                                              )}
                                              {larData.expected_notes && Array.isArray(larData.expected_notes) && larData.expected_notes.length > 0 && (
                                                <p>
                                                  <span className="font-medium">Expected Sequence:</span>{' '}
                                                  {larData.expected_notes.join(' → ')}
                                                </p>
                                              )}
                                            </div>
                                          );
                                        })()}
                                      </div>
                                    )}

                                    {sectionType === 'LISTEN_AND_COMPLETE' && (
                                      <div className="space-y-2">
                                        <p className="text-sm font-medium text-gray-700">Answer Type: Listen and Complete</p>
                                        {(() => {
                                          const lacData = Array.isArray((question as any).listen_and_complete)
                                            ? (question as any).listen_and_complete[0]
                                            : (question as any).listen_and_complete;
                                          return lacData && (
                                            <div className="space-y-2 text-sm">
                                              {lacData.audio_file_path && (
                                                <p className="text-gray-600">
                                                  Audio file available. Students will listen to the audio.
                                                </p>
                                              )}
                                              {lacData.incomplete_score_path && (
                                                <p className="text-gray-600">
                                                  Incomplete score provided. Students will complete it using the notation editor.
                                                </p>
                                              )}
                                              {lacData.complete_score_path && (
                                                <p className="text-gray-600 text-green-700">
                                                  ✓ Complete score reference available for auto-grading.
                                                </p>
                                              )}
                                              {!lacData.complete_score_path && (
                                                <p className="text-gray-600 text-yellow-700">
                                                  ⚠ No complete score reference - will require manual grading.
                                                </p>
                                              )}
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

