'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrueFalseEditor } from './TrueFalseEditor'
import { MultipleChoiceEditor } from './MultipleChoiceEditor'
import { ListeningEditor } from './ListeningEditor'
import { TranspositionEditor } from './TranspositionEditor'
import { OrchestrationEditor } from './OrchestrationEditor'
import { ListenAndWriteEditor } from './ListenAndWriteEditor'
import { ListenAndRepeatEditor } from './ListenAndRepeatEditor'
import { ListenAndCompleteEditor } from './ListenAndCompleteEditor'
import type { SectionType, QuestionTypeData, QuestionBackendResponse } from '@music-exam-builder/shared/types'

interface QuestionEditorProps {
  sectionId: string
  sectionType: SectionType
  sectionCategory?: string
  questionId?: string
  onSaved: () => void
  onCancel: () => void
}

export function QuestionEditor({ 
  sectionId, 
  sectionType,
  sectionCategory,
  questionId,
  onSaved, 
  onCancel 
}: QuestionEditorProps) {
  const [loading, setLoading] = useState(false)
  const [loadingQuestion, setLoadingQuestion] = useState(false)
  const [questionText, setQuestionText] = useState('')
  const [points, setPoints] = useState('1')
  
  // Debug: Log sectionType to help troubleshoot
  useEffect(() => {
    console.log('QuestionEditor - sectionType:', sectionType)
  }, [sectionType])
  
  // Initialize typeData based on section type
  const getInitialTypeData = () => {
    switch (sectionType) {
      case 'TRUE_FALSE':
        return { correctAnswer: true }
      case 'MULTIPLE_CHOICE':
        return { options: ['', ''], correctOptionIndex: 0 }
      case 'LISTENING':
        return { questionType: 'interval', options: [], correctAnswer: '' }
      case 'TRANSPOSITION':
        return { sourceInstrument: '', targetInstrument: '', notationFilePath: '' }
      case 'ORCHESTRATION':
        return { pianoScorePath: '', targetEnsemble: '', ensembleInstruments: [], rubric: [] }
      case 'LISTEN_AND_WRITE':
        return { audioFilePath: '', correctAnswer: '', answerFormat: 'notes' }
      case 'LISTEN_AND_REPEAT':
        return { audioFilePath: '', expectedNotes: [''], noteFormat: 'solfege', tolerance: 'strict' }
      case 'LISTEN_AND_COMPLETE':
        return { audioFilePath: '', incompleteScorePath: '', completeScorePath: '', blankPositions: undefined }
      default:
        return {}
    }
  }
  
  const [typeData, setTypeData] = useState<QuestionTypeData | Record<string, unknown>>(getInitialTypeData())

  // Load question data if editing
  useEffect(() => {
    if (questionId) {
      loadQuestion()
    }
  }, [questionId])

  const loadQuestion = async () => {
    if (!questionId) return
    
    setLoadingQuestion(true)
    try {
      console.log('Loading question:', questionId)
      const response = await api.getQuestion(questionId)
      const question = response.data
      console.log('Question loaded:', question)
      
      // Set basic fields
      const questionBackend = question as QuestionBackendResponse
      setQuestionText(questionBackend.question_text || questionBackend.questionText || question.questionText || '')
      setPoints(String(question.points || 1))
      
      // Helper to get first item from array or object
      const getFirstItem = <T,>(data: T | T[] | null | undefined): T | null => {
        if (Array.isArray(data)) {
          return data.length > 0 ? data[0] : null
        }
        if (data && typeof data === 'object') {
          // If it's an object with data, return it
          return Object.keys(data).length > 0 ? data : null
        }
        return null
      }
      
      // Try to get from nested structure (backend format)
      let loadedTypeData: QuestionTypeData | Record<string, unknown> | null = null
      
      if (questionBackend.true_false) {
        const tf = getFirstItem(questionBackend.true_false)
        if (tf) {
          loadedTypeData = { 
            correctAnswer: tf.correct_answer !== undefined ? tf.correct_answer : true,
            audioFilePath: tf.audio_file_path || undefined,
            notationFilePath: tf.notation_file_path || undefined
          }
        }
      } else if (questionBackend.multiple_choice) {
        const mc = getFirstItem(questionBackend.multiple_choice)
        if (mc) {
          loadedTypeData = { 
            options: Array.isArray(mc.options) ? mc.options : (mc.options || []), 
            correctOptionIndex: mc.correct_option_index !== undefined ? mc.correct_option_index : 0,
            audioFilePath: mc.audio_file_path || undefined,
            optionNotationFilePaths: Array.isArray(mc.option_notation_file_paths) ? mc.option_notation_file_paths : (mc.option_notation_file_paths || [])
          }
        }
      } else if (questionBackend.listening) {
        const li = getFirstItem(questionBackend.listening)
        if (li) {
          loadedTypeData = {
            questionType: li.question_type || 'interval',
            audioFilePath: li.audio_file_path || '',
            options: Array.isArray(li.options) ? li.options : (li.options || []),
            correctAnswer: li.correct_answer || ''
          }
        }
      } else if (questionBackend.transposition) {
        const tr = getFirstItem(questionBackend.transposition)
        if (tr) {
          loadedTypeData = {
            sourceInstrument: tr.source_instrument || '',
            targetInstrument: tr.target_instrument || '',
            notationFilePath: tr.notation_file_path || '',
            referenceAnswerPath: tr.reference_answer_path || ''
          }
        }
      } else if (questionBackend.orchestration) {
        const or = getFirstItem(questionBackend.orchestration)
        if (or) {
          loadedTypeData = {
            pianoScorePath: or.piano_score_path || '',
            targetEnsemble: or.target_ensemble || '',
            ensembleInstruments: Array.isArray(or.ensemble_instruments) ? or.ensemble_instruments : (or.ensemble_instruments || []),
            rubric: Array.isArray(or.rubric) ? or.rubric : (or.rubric || [])
          }
        }
      } else if (questionBackend.listen_and_write) {
        const law = getFirstItem(questionBackend.listen_and_write)
        if (law) {
          loadedTypeData = {
            audioFilePath: law.audio_file_path || '',
            correctAnswer: law.correct_answer || '',
            answerFormat: law.answer_format || 'notes'
          }
        }
      } else if (questionBackend.listen_and_repeat) {
        const lar = getFirstItem(questionBackend.listen_and_repeat)
        if (lar) {
          loadedTypeData = {
            audioFilePath: lar.audio_file_path || '',
            expectedNotes: Array.isArray(lar.expected_notes) ? lar.expected_notes : (lar.expected_notes || ['']),
            noteFormat: lar.note_format || 'solfege',
            tolerance: lar.tolerance || 'strict'
          }
        }
      } else if (questionBackend.listen_and_complete) {
        const lac = getFirstItem(questionBackend.listen_and_complete)
        if (lac) {
          loadedTypeData = {
            audioFilePath: lac.audio_file_path || '',
            incompleteScorePath: lac.incomplete_score_path || '',
            completeScorePath: lac.complete_score_path || '',
            blankPositions: Array.isArray(lac.blank_positions) ? lac.blank_positions : undefined
          }
        }
      }
      
      // If we found type data, use it; otherwise use initial defaults
      if (loadedTypeData) {
        console.log('Setting type data:', loadedTypeData)
        setTypeData(loadedTypeData)
      } else {
        console.log('No type data found, using defaults')
        // Keep the initial typeData from getInitialTypeData()
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } }; message?: string }
      console.error('Error loading question:', err)
      console.error('Error details:', error.response?.data || error.message)
      alert('Failed to load question data: ' + (error.response?.data?.error || error.message))
    } finally {
      setLoadingQuestion(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validate True/False Ear Training: if audio is provided, notation is required
      if (sectionType === 'TRUE_FALSE' && typeData?.audioFilePath && !typeData?.notationFilePath) {
        alert('Notation file is required when an audio file is provided for Ear Training questions. Students need a score to compare with the audio.')
        setLoading(false)
        return
      }

      // Validate Ear Training Multiple Choice: audio and notation file for each option are required
      if (sectionType === 'MULTIPLE_CHOICE' && sectionCategory === 'EAR_TRAINING') {
        if (!typeData?.audioFilePath) {
          alert('Audio file is required for Ear Training Multiple Choice questions.')
          setLoading(false)
          return
        }
        const optionNotationPaths = typeData?.optionNotationFilePaths || []
        const options = typeData?.options || []
        if (optionNotationPaths.length !== options.length || optionNotationPaths.some((path: string | null) => !path)) {
          alert('Each option must have a notation file for Ear Training Multiple Choice questions. Please upload a notation file for each option.')
          setLoading(false)
          return
        }
      }

      const questionData = {
        sectionId,
        questionText,
        points: parseInt(points),
        orderIndex: undefined, // Will be calculated on backend for new questions
        type: sectionType,
        typeData,
      }

      let response
      if (questionId) {
        // Update existing question
        response = await api.updateQuestion(questionId, questionData)
      } else {
        // Create new question
        response = await api.createQuestion(questionData)
      }

      if (response.success) {
        onSaved()
      } else {
        throw new Error(response.error || `Failed to ${questionId ? 'update' : 'create'} question`)
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } }; message?: string }
      console.error(`Error ${questionId ? 'updating' : 'creating'} question:`, err)
      alert(error.response?.data?.error || error.message || `Failed to ${questionId ? 'update' : 'create'} question`)
    } finally {
      setLoading(false)
    }
  }

  if (loadingQuestion) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-gray-600">Loading question...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{questionId ? 'Edit' : 'Add'} Question</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="questionText">Question Text *</Label>
            <textarea
              id="questionText"
              className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="Enter your question here..."
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="points">Points *</Label>
            <Input
              id="points"
              type="number"
              min="1"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          {/* Type-specific editors */}
          <div className="border-t pt-4">
            {!sectionType && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm text-yellow-800">
                  Warning: No section type detected. Please ensure the section has a valid exercise type.
                </p>
              </div>
            )}
            {sectionType === 'TRUE_FALSE' && (
              <TrueFalseEditor value={typeData} onChange={setTypeData} />
            )}
            {sectionType === 'MULTIPLE_CHOICE' && (
              <MultipleChoiceEditor value={typeData} onChange={setTypeData} />
            )}
            {sectionType === 'LISTENING' && (
              <ListeningEditor value={typeData} onChange={setTypeData} />
            )}
            {sectionType === 'TRANSPOSITION' && (
              <TranspositionEditor value={typeData} onChange={setTypeData} />
            )}
            {sectionType === 'ORCHESTRATION' && (
              <OrchestrationEditor value={typeData} onChange={setTypeData} />
            )}
            {sectionType === 'LISTEN_AND_WRITE' && (
              <ListenAndWriteEditor value={typeData} onChange={setTypeData} />
            )}
            {sectionType === 'LISTEN_AND_REPEAT' && (
              <ListenAndRepeatEditor value={typeData} onChange={setTypeData} />
            )}
            {sectionType === 'LISTEN_AND_COMPLETE' && (
              <ListenAndCompleteEditor value={typeData} onChange={setTypeData} />
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Question'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

