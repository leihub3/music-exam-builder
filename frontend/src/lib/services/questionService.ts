import { supabaseAdmin } from '@/lib/supabase/admin'
import { examService } from './examService'

class QuestionService {
  /**
   * Create a question with type-specific data
   */
  async createQuestion(questionData: any) {
    const { sectionId, questionText, points, orderIndex, type, typeData } = questionData

    // Get section to determine type if not provided
    let questionType = type
    if (!questionType) {
      const { data: section } = await supabaseAdmin
        .from('exam_sections')
        .select('section_type')
        .eq('id', sectionId)
        .single()
      
      if (!section) {
        throw new Error('Section not found')
      }
      questionType = section.section_type
    }

    // If orderIndex not provided, calculate it
    let finalOrderIndex = orderIndex
    if (finalOrderIndex === undefined || finalOrderIndex === null) {
      const { data: existingQuestions } = await supabaseAdmin
        .from('questions')
        .select('order_index')
        .eq('section_id', sectionId)
        .order('order_index', { ascending: false })
        .limit(1)
      
      finalOrderIndex = existingQuestions && existingQuestions.length > 0
        ? existingQuestions[0].order_index + 1
        : 0
    }

    // Insert main question
    const { data: question, error: questionError } = await supabaseAdmin
      .from('questions')
      .insert({
        section_id: sectionId,
        question_text: questionText,
        points: points,
        order_index: finalOrderIndex
      })
      .select()
      .single()

    if (questionError) throw questionError

    // Insert type-specific data
    let typeTable: string
    let typeRecord: any
    let intervalItems: any[] | null = null // For INTERVAL_DICTATION
    let chordItems: any[] | null = null // For CHORD_DICTATION

    switch (questionType) {
      case 'TRUE_FALSE':
        typeTable = 'true_false_questions'
        // Ensure correctAnswer is always a boolean (default to true if not provided)
        const correctAnswer = typeData.correctAnswer !== undefined 
          ? Boolean(typeData.correctAnswer) 
          : true
        typeRecord = {
          question_id: question.id,
          correct_answer: correctAnswer,
          audio_file_path: typeData.audioFilePath || null,
          notation_file_path: typeData.notationFilePath || null
        }
        break

      case 'MULTIPLE_CHOICE':
        typeTable = 'multiple_choice_questions'
        typeRecord = {
          question_id: question.id,
          options: typeData.options,
          correct_option_index: typeData.correctOptionIndex,
          audio_file_path: typeData.audioFilePath || null,
          option_notation_file_paths: typeData.optionNotationFilePaths || null
        }
        break

      case 'LISTENING':
        typeTable = 'listening_questions'
        typeRecord = {
          question_id: question.id,
          audio_file_path: typeData.audioFilePath,
          question_type: typeData.questionType,
          options: typeData.options || null,
          correct_answer: typeData.correctAnswer
        }
        break

      case 'TRANSPOSITION':
        typeTable = 'transposition_questions'
        typeRecord = {
          question_id: question.id,
          source_instrument: typeData.sourceInstrument,
          target_instrument: typeData.targetInstrument,
          notation_file_path: typeData.notationFilePath,
          reference_answer_path: typeData.referenceAnswerPath || null
        }
        break

      case 'ORCHESTRATION':
        typeTable = 'orchestration_questions'
        typeRecord = {
          question_id: question.id,
          piano_score_path: typeData.pianoScorePath,
          target_ensemble: typeData.targetEnsemble,
          ensemble_instruments: typeData.ensembleInstruments,
          rubric: typeData.rubric
        }
        break

      case 'LISTEN_AND_WRITE':
        typeTable = 'listen_and_write_questions'
        typeRecord = {
          question_id: question.id,
          audio_file_path: typeData.audioFilePath,
          correct_answer: typeData.correctAnswer || null,
          answer_format: typeData.answerFormat || 'notes',
          concert_a_play_limit: typeData.concertAPlayLimit ?? 3,
          reference_score_path: typeData.referenceScorePath || null,
          reference_score_music_xml: typeData.referenceScoreMusicXML || null
        }
        break

      case 'LISTEN_AND_REPEAT':
        typeTable = 'listen_and_repeat_questions'
        typeRecord = {
          question_id: question.id,
          audio_file_path: typeData.audioFilePath,
          expected_notes: typeData.expectedNotes || [],
          note_format: typeData.noteFormat || 'solfege',
          tolerance: typeData.tolerance || 'strict'
        }
        break

      case 'LISTEN_AND_COMPLETE':
        typeTable = 'listen_and_complete_questions'
        typeRecord = {
          question_id: question.id,
          audio_file_path: typeData.audioFilePath,
          incomplete_score_path: typeData.incompleteScorePath || null,
          complete_score_path: typeData.completeScorePath || null,
          blank_positions: typeData.blankPositions || null
        }
        break

      case 'INTERVAL_DICTATION':
        typeTable = 'interval_dictation_questions'
        // Store shared settings in interval_dictation_questions
        typeRecord = {
          question_id: question.id,
          example_play_limit: typeData.examplePlayLimit ?? 5,
          tempo: typeData.tempo ?? 120,
          note_duration: typeData.noteDuration ?? 1.0,
          instrument: typeData.instrument || 'sine'
        }
        // Store interval items separately
        const intervals = (typeData as any)?.intervals || []
        intervalItems = intervals.map((interval: any, index: number) => ({
          question_id: question.id,
          root_note: interval.rootNote || 'C4',
          correct_interval: interval.correctInterval,
          interval_direction: interval.intervalDirection || 'ascending',
          order_index: interval.orderIndex ?? index
        }))
        break

      case 'CHORD_DICTATION':
        typeTable = 'chord_dictation_questions'
        // Store shared settings in chord_dictation_questions
        typeRecord = {
          question_id: question.id,
          example_play_limit: typeData.examplePlayLimit ?? 5,
          tempo: typeData.tempo ?? 120,
          duration: typeData.duration ?? 2.0,
          instrument: typeData.instrument || 'sine'
        }
        // Store chord items separately
        const chords = (typeData as any)?.chords || []
        chordItems = chords.map((chord: any, index: number) => ({
          question_id: question.id,
          correct_chord: chord.correctChord,
          chord_voicing: chord.chordVoicing || 'root',
          chord_type: chord.chordType || 'triad',
          octave: chord.octave ?? 4,
          order_index: chord.orderIndex ?? index
        }))
        break

      case 'PROGRESSION_DICTATION':
        typeTable = 'progression_dictation_questions'
        typeRecord = {
          question_id: question.id,
          correct_progression: typeData.correctProgression || [],
          progression_key: typeData.progressionKey || 'C major',
          progression_notation: typeData.progressionNotation || 'roman',
          example_play_limit: typeData.examplePlayLimit ?? 3,
          tempo: typeData.tempo ?? 120,
          chord_duration: typeData.chordDuration ?? 2.0,
          instrument: typeData.instrument || 'sine'
        }
        break

      default:
        throw new Error(`Invalid question type: ${type}`)
    }

    const { data: typeDataResult, error: typeError } = await supabaseAdmin
      .from(typeTable)
      .insert(typeRecord)
      .select()
      .single()

    if (typeError) {
      // Rollback question creation
      await supabaseAdmin.from('questions').delete().eq('id', question.id)
      throw typeError
    }

    // Insert interval items for INTERVAL_DICTATION
    if (questionType === 'INTERVAL_DICTATION' && intervalItems && intervalItems.length > 0) {
      const { error: itemsError } = await supabaseAdmin
        .from('interval_dictation_items')
        .insert(intervalItems)

      if (itemsError) {
        // Cleanup: delete the question and type data if items insert fails
        await supabaseAdmin.from(typeTable).delete().eq('question_id', question.id)
        await supabaseAdmin.from('questions').delete().eq('id', question.id)
        throw itemsError
      }
    }

    // Insert chord items for CHORD_DICTATION
    if (questionType === 'CHORD_DICTATION' && chordItems && chordItems.length > 0) {
      const { error: itemsError } = await supabaseAdmin
        .from('chord_dictation_items')
        .insert(chordItems)

      if (itemsError) {
        // Cleanup: delete the question and type data if items insert fails
        await supabaseAdmin.from(typeTable).delete().eq('question_id', question.id)
        await supabaseAdmin.from('questions').delete().eq('id', question.id)
        throw itemsError
      }
    }

    // Recalculate exam total points
    const { data: section } = await supabaseAdmin
      .from('exam_sections')
      .select('exam_id')
      .eq('id', sectionId)
      .single()
    
    if (section) {
      await examService.calculateTotalPoints(section.exam_id)
    }

    return {
      ...question,
      typeData: typeDataResult
    }
  }

  /**
   * Get question by ID with type-specific data
   */
  async getQuestionById(questionId: string) {
    const { data: question, error } = await supabaseAdmin
      .from('questions')
      .select(`
        *,
        section:exam_sections(section_type),
        true_false:true_false_questions(*),
        multiple_choice:multiple_choice_questions(*),
        listening:listening_questions(*),
        transposition:transposition_questions(*),
        orchestration:orchestration_questions(*),
        listen_and_write:listen_and_write_questions(*),
        listen_and_repeat:listen_and_repeat_questions(*),
        listen_and_complete:listen_and_complete_questions(*),
        interval_dictation:interval_dictation_questions(*),
        interval_dictation_items:interval_dictation_items(*),
        chord_dictation:chord_dictation_questions(*),
        chord_dictation_items:chord_dictation_items(*),
        progression_dictation:progression_dictation_questions(*)
      `)
      .eq('id', questionId)
      .single()

    if (error) {
      console.error('Error fetching question:', error)
      throw error
    }

    if (!question) {
      throw new Error('Question not found')
    }

    // Log for debugging
    console.log('Question fetched:', {
      id: question.id,
      sectionType: (question as any).section?.section_type,
      hasTrueFalse: !!(question as any).true_false,
      hasMultipleChoice: !!(question as any).multiple_choice,
      hasListening: !!(question as any).listening,
      hasTransposition: !!(question as any).transposition,
      hasOrchestration: !!(question as any).orchestration
    })

    return question
  }

  /**
   * Update question
   */
  async updateQuestion(questionId: string, updates: any) {
    // First get the question with its section to know the type
    const { data: existingQuestion, error: fetchError } = await supabaseAdmin
      .from('questions')
      .select(`
        *,
        section:exam_sections(section_type)
      `)
      .eq('id', questionId)
      .single()

    if (fetchError) throw fetchError
    
    if (!existingQuestion) {
      throw new Error('Question not found')
    }
    
    // Get the question type from the section
    const questionType = (existingQuestion as any).section?.section_type || updates.type
    
    if (!questionType) {
      throw new Error('Could not determine question type')
    }

    // Update basic question fields
    const dbUpdates: any = {}
    if (updates.questionText !== undefined) {
      dbUpdates.question_text = updates.questionText
    }
    if (updates.points !== undefined) {
      dbUpdates.points = updates.points
    }
    if (updates.orderIndex !== undefined) {
      dbUpdates.order_index = updates.orderIndex
    }

    if (Object.keys(dbUpdates).length > 0) {
      const { data, error } = await supabaseAdmin
        .from('questions')
        .update(dbUpdates)
        .eq('id', questionId)
        .select()
        .single()

      if (error) throw error
    }

    // Update type-specific data if provided
    if (updates.typeData && questionType) {
      await this.updateQuestionTypeData(questionId, questionType, updates.typeData)
    }

    // Return updated question with all related data
    return await this.getQuestionById(questionId)
  }

  /**
   * Update type-specific data
   */
  async updateQuestionTypeData(questionId: string, type: string, typeData: any) {
    let typeTable: string
    let updateData: any

    switch (type) {
      case 'TRUE_FALSE':
        typeTable = 'true_false_questions'
        updateData = { 
          question_id: questionId,
          correct_answer: typeData.correctAnswer !== undefined ? typeData.correctAnswer : true,
          audio_file_path: typeData.audioFilePath !== undefined ? typeData.audioFilePath : null,
          notation_file_path: typeData.notationFilePath !== undefined ? typeData.notationFilePath : null
        }
        break

      case 'MULTIPLE_CHOICE':
        typeTable = 'multiple_choice_questions'
        updateData = {
          question_id: questionId,
          options: typeData.options || [],
          correct_option_index: typeData.correctOptionIndex !== undefined ? typeData.correctOptionIndex : 0,
          audio_file_path: typeData.audioFilePath !== undefined ? typeData.audioFilePath : null,
          option_notation_file_paths: typeData.optionNotationFilePaths !== undefined ? typeData.optionNotationFilePaths : null
        }
        break

      case 'LISTENING':
        typeTable = 'listening_questions'
        updateData = {
          question_id: questionId,
          audio_file_path: typeData.audioFilePath || null,
          question_type: typeData.questionType || 'interval',
          options: typeData.options || [],
          correct_answer: typeData.correctAnswer || ''
        }
        break

      case 'TRANSPOSITION':
        typeTable = 'transposition_questions'
        updateData = {
          question_id: questionId,
          source_instrument: typeData.sourceInstrument || '',
          target_instrument: typeData.targetInstrument || '',
          notation_file_path: typeData.notationFilePath || null,
          reference_answer_path: typeData.referenceAnswerPath || null
        }
        break

      case 'ORCHESTRATION':
        typeTable = 'orchestration_questions'
        updateData = {
          question_id: questionId,
          piano_score_path: typeData.pianoScorePath || null,
          target_ensemble: typeData.targetEnsemble || '',
          ensemble_instruments: typeData.ensembleInstruments || [],
          rubric: typeData.rubric || []
        }
        break

      case 'LISTEN_AND_WRITE':
        typeTable = 'listen_and_write_questions'
        updateData = {
          question_id: questionId,
          audio_file_path: typeData.audioFilePath || null,
          correct_answer: typeData.correctAnswer || null,
          answer_format: typeData.answerFormat || 'notes',
          concert_a_play_limit: typeData.concertAPlayLimit ?? 3,
          reference_score_path: typeData.referenceScorePath || null,
          reference_score_music_xml: typeData.referenceScoreMusicXML || null
        }
        break

      case 'LISTEN_AND_REPEAT':
        typeTable = 'listen_and_repeat_questions'
        updateData = {
          question_id: questionId,
          audio_file_path: typeData.audioFilePath || null,
          expected_notes: typeData.expectedNotes || [],
          note_format: typeData.noteFormat || 'solfege',
          tolerance: typeData.tolerance || 'strict'
        }
        break

      case 'LISTEN_AND_COMPLETE':
        typeTable = 'listen_and_complete_questions'
        updateData = {
          question_id: questionId,
          audio_file_path: typeData.audioFilePath || null,
          incomplete_score_path: typeData.incompleteScorePath || null,
          complete_score_path: typeData.completeScorePath || null,
          blank_positions: typeData.blankPositions || null
        }
        break

      case 'INTERVAL_DICTATION':
        typeTable = 'interval_dictation_questions'
        updateData = {
          question_id: questionId,
          example_play_limit: typeData.examplePlayLimit ?? 5,
          tempo: typeData.tempo ?? 120,
          note_duration: typeData.noteDuration ?? 1.0,
          instrument: typeData.instrument || 'sine'
        }
        // Update interval items separately
        const intervals = (typeData as any)?.intervals || []
        if (intervals.length > 0) {
          // Delete existing items
          await supabaseAdmin
            .from('interval_dictation_items')
            .delete()
            .eq('question_id', questionId)
          
          // Insert new items
          const intervalItems = intervals.map((interval: any, index: number) => ({
            question_id: questionId,
            root_note: interval.rootNote || 'C4',
            correct_interval: interval.correctInterval,
            interval_direction: interval.intervalDirection || 'ascending',
            order_index: interval.orderIndex ?? index
          }))
          
          const { error: itemsError } = await supabaseAdmin
            .from('interval_dictation_items')
            .insert(intervalItems)
          
          if (itemsError) throw itemsError
        }
        break

      case 'CHORD_DICTATION':
        typeTable = 'chord_dictation_questions'
        updateData = {
          question_id: questionId,
          example_play_limit: typeData.examplePlayLimit ?? 5,
          tempo: typeData.tempo ?? 120,
          duration: typeData.duration ?? 2.0,
          instrument: typeData.instrument || 'sine'
        }
        // Update chord items separately
        const chords = (typeData as any)?.chords || []
        if (chords.length > 0) {
          // Delete existing items
          await supabaseAdmin
            .from('chord_dictation_items')
            .delete()
            .eq('question_id', questionId)
          
          // Insert new items
          const chordItems = chords.map((chord: any, index: number) => ({
            question_id: questionId,
            correct_chord: chord.correctChord,
            chord_voicing: chord.chordVoicing || 'root',
            chord_type: chord.chordType || 'triad',
            octave: chord.octave ?? 4,
            order_index: chord.orderIndex ?? index
          }))
          
          const { error: itemsError } = await supabaseAdmin
            .from('chord_dictation_items')
            .insert(chordItems)
          
          if (itemsError) throw itemsError
        }
        break

      case 'PROGRESSION_DICTATION':
        typeTable = 'progression_dictation_questions'
        updateData = {
          question_id: questionId,
          correct_progression: typeData.correctProgression || [],
          progression_key: typeData.progressionKey || 'C major',
          progression_notation: typeData.progressionNotation || 'roman',
          example_play_limit: typeData.examplePlayLimit ?? 3,
          tempo: typeData.tempo ?? 120,
          chord_duration: typeData.chordDuration ?? 2.0,
          instrument: typeData.instrument || 'sine'
        }
        break

      default:
        throw new Error(`Invalid question type: ${type}`)
    }

    // Check if record exists
    const { data: existing, error: checkError } = await supabaseAdmin
      .from(typeTable)
      .select('*')
      .eq('question_id', questionId)
      .maybeSingle()

    let result: any
    if (existing && !checkError) {
      // Update existing record - only update fields that are explicitly provided
      // Preserve existing values for fields not in typeData (to avoid setting NOT NULL fields to null)
      const { question_id, ...updateFields } = updateData
      
      // Build update object with only fields that are explicitly provided in typeData
      const filteredUpdates: any = {}
      if (type === 'TRANSPOSITION') {
        if (typeData.sourceInstrument !== undefined) filteredUpdates.source_instrument = updateFields.source_instrument
        if (typeData.targetInstrument !== undefined) filteredUpdates.target_instrument = updateFields.target_instrument
        // Only update notation_file_path if it's explicitly provided AND not empty
        // If empty string, preserve existing value to avoid violating NOT NULL constraint
        if (typeData.notationFilePath !== undefined && typeData.notationFilePath !== '') {
          filteredUpdates.notation_file_path = updateFields.notation_file_path
        }
        if (typeData.referenceAnswerPath !== undefined) filteredUpdates.reference_answer_path = updateFields.reference_answer_path
      } else if (type === 'ORCHESTRATION') {
        if (typeData.pianoScorePath !== undefined) filteredUpdates.piano_score_path = updateFields.piano_score_path
        if (typeData.targetEnsemble !== undefined) filteredUpdates.target_ensemble = updateFields.target_ensemble
        if (typeData.ensembleInstruments !== undefined) filteredUpdates.ensemble_instruments = updateFields.ensemble_instruments
        if (typeData.rubric !== undefined) filteredUpdates.rubric = updateFields.rubric
      } else {
        // For other types, use all updateFields
        Object.keys(updateFields).forEach(key => {
          if ((updateFields as any)[key] !== undefined) {
            filteredUpdates[key] = (updateFields as any)[key]
          }
        })
      }
      
      if (Object.keys(filteredUpdates).length > 0) {
        const { data, error } = await supabaseAdmin
          .from(typeTable)
          .update(filteredUpdates)
          .eq('question_id', questionId)
          .select()
          .single()

        if (error) throw error
        result = data
      } else {
        result = existing
      }
    } else {
      // Insert new record
      const { data, error } = await supabaseAdmin
        .from(typeTable)
        .insert(updateData)
        .select()
        .single()

      if (error) throw error
      result = data
    }

    return result
  }

  /**
   * Delete question
   */
  async deleteQuestion(questionId: string) {
    // Get section to recalculate exam points
    const { data: question } = await supabaseAdmin
      .from('questions')
      .select(`
        section_id,
        section:exam_sections(exam_id)
      `)
      .eq('id', questionId)
      .single()

    const { error } = await supabaseAdmin
      .from('questions')
      .delete()
      .eq('id', questionId)

    if (error) throw error

    // Recalculate exam total points
    if (question && (question as any).section && (question as any).section.exam_id) {
      await examService.calculateTotalPoints((question as any).section.exam_id)
    }

    return true
  }

  /**
   * Get all questions for a section
   */
  async getQuestionsBySection(sectionId: string) {
    const { data, error } = await supabaseAdmin
      .from('questions')
      .select(`
        *,
        true_false:true_false_questions(*),
        multiple_choice:multiple_choice_questions(*),
        listening:listening_questions(*),
        transposition:transposition_questions(*),
        orchestration:orchestration_questions(*),
        listen_and_write:listen_and_write_questions(*),
        listen_and_repeat:listen_and_repeat_questions(*),
        listen_and_complete:listen_and_complete_questions(*),
        interval_dictation:interval_dictation_questions(*),
        interval_dictation_items:interval_dictation_items(*),
        chord_dictation:chord_dictation_questions(*),
        chord_dictation_items:chord_dictation_items(*),
        progression_dictation:progression_dictation_questions(*)
      `)
      .eq('section_id', sectionId)
      .order('order_index', { ascending: true })

    if (error) throw error
    return data
  }

  /**
   * Reorder questions in a section
   */
  async reorderQuestions(sectionId: string, questionIds: string[]) {
    const updates = questionIds.map((id, index) => ({
      id,
      order_index: index
    }))

    const promises = updates.map(update =>
      supabaseAdmin
        .from('questions')
        .update({ order_index: update.order_index })
        .eq('id', update.id)
    )

    await Promise.all(promises)
    return true
  }
}

export const questionService = new QuestionService()



