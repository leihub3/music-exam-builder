const supabaseAdmin = require('../config/supabase');
const examService = require('./examService');

class QuestionService {
  /**
   * Create a question with type-specific data
   */
  async createQuestion(questionData) {
    const { sectionId, questionText, points, orderIndex, type, typeData } = questionData;

    // Get section to determine type if not provided
    let questionType = type;
    if (!questionType) {
      const { data: section } = await supabaseAdmin
        .from('exam_sections')
        .select('section_type')
        .eq('id', sectionId)
        .single();
      
      if (!section) {
        throw new Error('Section not found');
      }
      questionType = section.section_type;
    }

    // If orderIndex not provided, calculate it
    let finalOrderIndex = orderIndex;
    if (finalOrderIndex === undefined || finalOrderIndex === null) {
      const { data: existingQuestions } = await supabaseAdmin
        .from('questions')
        .select('order_index')
        .eq('section_id', sectionId)
        .order('order_index', { ascending: false })
        .limit(1);
      
      finalOrderIndex = existingQuestions && existingQuestions.length > 0
        ? existingQuestions[0].order_index + 1
        : 0;
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
      .single();

    if (questionError) throw questionError;

    // Insert type-specific data
    let typeTable;
    let typeRecord;

    switch (questionType) {
      case 'TRUE_FALSE':
        typeTable = 'true_false_questions';
        // Ensure correctAnswer is always a boolean (default to true if not provided)
        const correctAnswer = typeData.correctAnswer !== undefined 
          ? Boolean(typeData.correctAnswer) 
          : true;
        typeRecord = {
          question_id: question.id,
          correct_answer: correctAnswer
        };
        break;

      case 'MULTIPLE_CHOICE':
        typeTable = 'multiple_choice_questions';
        typeRecord = {
          question_id: question.id,
          options: typeData.options,
          correct_option_index: typeData.correctOptionIndex
        };
        break;

      case 'LISTENING':
        typeTable = 'listening_questions';
        typeRecord = {
          question_id: question.id,
          audio_file_path: typeData.audioFilePath,
          question_type: typeData.questionType,
          options: typeData.options || null,
          correct_answer: typeData.correctAnswer
        };
        break;

      case 'TRANSPOSITION':
        typeTable = 'transposition_questions';
        typeRecord = {
          question_id: question.id,
          source_instrument: typeData.sourceInstrument,
          target_instrument: typeData.targetInstrument,
          notation_file_path: typeData.notationFilePath,
          reference_answer_path: typeData.referenceAnswerPath || null
        };
        break;

      case 'ORCHESTRATION':
        typeTable = 'orchestration_questions';
        typeRecord = {
          question_id: question.id,
          piano_score_path: typeData.pianoScorePath,
          target_ensemble: typeData.targetEnsemble,
          ensemble_instruments: typeData.ensembleInstruments,
          rubric: typeData.rubric
        };
        break;

      default:
        throw new Error(`Invalid question type: ${type}`);
    }

    const { data: typeDataResult, error: typeError } = await supabaseAdmin
      .from(typeTable)
      .insert(typeRecord)
      .select()
      .single();

    if (typeError) {
      // Rollback question creation
      await supabaseAdmin.from('questions').delete().eq('id', question.id);
      throw typeError;
    }

    // Recalculate exam total points
    const { data: section } = await supabaseAdmin
      .from('exam_sections')
      .select('exam_id')
      .eq('id', sectionId)
      .single();
    
    if (section) {
      await examService.calculateTotalPoints(section.exam_id);
    }

    return {
      ...question,
      typeData: typeDataResult
    };
  }

  /**
   * Get question by ID with type-specific data
   */
  async getQuestionById(questionId) {
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
      .single();

    if (error) {
      console.error('Error fetching question:', error);
      throw error;
    }

    if (!question) {
      throw new Error('Question not found');
    }

    // Log for debugging
    console.log('Question fetched:', {
      id: question.id,
      sectionType: question.section?.section_type,
      hasTrueFalse: !!question.true_false,
      hasMultipleChoice: !!question.multiple_choice,
      hasListening: !!question.listening,
      hasTransposition: !!question.transposition,
      hasOrchestration: !!question.orchestration,
      hasIntervalDictation: !!question.interval_dictation,
      hasIntervalDictationItems: !!question.interval_dictation_items,
      intervalDictationItemsCount: Array.isArray(question.interval_dictation_items) ? question.interval_dictation_items.length : 0,
      hasChordDictation: !!question.chord_dictation,
      hasChordDictationItems: !!question.chord_dictation_items,
      chordDictationItemsCount: Array.isArray(question.chord_dictation_items) ? question.chord_dictation_items.length : 0
    });

    return question;
  }

  /**
   * Update question
   */
  async updateQuestion(questionId, updates) {
    // First get the question with its section to know the type
    const { data: existingQuestion, error: fetchError } = await supabaseAdmin
      .from('questions')
      .select(`
        *,
        section:exam_sections(section_type)
      `)
      .eq('id', questionId)
      .single();

    if (fetchError) throw fetchError;
    
    if (!existingQuestion) {
      throw new Error('Question not found');
    }
    
    // Get the question type from the section
    const questionType = existingQuestion.section?.section_type || updates.type;
    
    if (!questionType) {
      throw new Error('Could not determine question type');
    }

    // Update basic question fields
    const dbUpdates = {};
    if (updates.questionText !== undefined) {
      dbUpdates.question_text = updates.questionText;
    }
    if (updates.points !== undefined) {
      dbUpdates.points = updates.points;
    }
    if (updates.orderIndex !== undefined) {
      dbUpdates.order_index = updates.orderIndex;
    }

    if (Object.keys(dbUpdates).length > 0) {
      const { data, error } = await supabaseAdmin
        .from('questions')
        .update(dbUpdates)
        .eq('id', questionId)
        .select()
        .single();

      if (error) throw error;
    }

    // Update type-specific data if provided
    if (updates.typeData && questionType) {
      await this.updateQuestionTypeData(questionId, questionType, updates.typeData);
    }

    // Return updated question with all related data
    return await this.getQuestionById(questionId);
  }

  /**
   * Update type-specific data
   */
  async updateQuestionTypeData(questionId, type, typeData) {
    let typeTable;
    let updateData;

    switch (type) {
      case 'TRUE_FALSE':
        typeTable = 'true_false_questions';
        updateData = { 
          question_id: questionId,
          correct_answer: typeData.correctAnswer !== undefined ? typeData.correctAnswer : true
        };
        break;

      case 'MULTIPLE_CHOICE':
        typeTable = 'multiple_choice_questions';
        updateData = {
          question_id: questionId,
          options: typeData.options || [],
          correct_option_index: typeData.correctOptionIndex !== undefined ? typeData.correctOptionIndex : 0
        };
        break;

      case 'LISTENING':
        typeTable = 'listening_questions';
        updateData = {
          question_id: questionId,
          audio_file_path: typeData.audioFilePath || null,
          question_type: typeData.questionType || 'interval',
          options: typeData.options || [],
          correct_answer: typeData.correctAnswer || ''
        };
        break;

      case 'TRANSPOSITION':
        typeTable = 'transposition_questions';
        updateData = {
          question_id: questionId,
          source_instrument: typeData.sourceInstrument || '',
          target_instrument: typeData.targetInstrument || '',
          notation_file_path: typeData.notationFilePath || null,
          reference_answer_path: typeData.referenceAnswerPath || null
        };
        break;

      case 'ORCHESTRATION':
        typeTable = 'orchestration_questions';
        updateData = {
          question_id: questionId,
          piano_score_path: typeData.pianoScorePath || null,
          target_ensemble: typeData.targetEnsemble || '',
          ensemble_instruments: typeData.ensembleInstruments || [],
          rubric: typeData.rubric || []
        };
        break;

      default:
        throw new Error(`Invalid question type: ${type}`);
    }

    // Check if record exists
    const { data: existing, error: checkError } = await supabaseAdmin
      .from(typeTable)
      .select('*')
      .eq('question_id', questionId)
      .maybeSingle();

    let result;
    if (existing && !checkError) {
      // Update existing record - only update fields that are explicitly provided
      // Preserve existing values for fields not in typeData (to avoid setting NOT NULL fields to null)
      const { question_id, ...updateFields } = updateData;
      
      // Build update object with only fields that are explicitly provided in typeData
      const filteredUpdates = {};
      if (type === 'TRANSPOSITION') {
        if (typeData.sourceInstrument !== undefined) filteredUpdates.source_instrument = updateFields.source_instrument;
        if (typeData.targetInstrument !== undefined) filteredUpdates.target_instrument = updateFields.target_instrument;
        // Only update notation_file_path if it's explicitly provided AND not empty
        // If empty string, preserve existing value to avoid violating NOT NULL constraint
        if (typeData.notationFilePath !== undefined && typeData.notationFilePath !== '') {
          filteredUpdates.notation_file_path = updateFields.notation_file_path;
        }
        if (typeData.referenceAnswerPath !== undefined) filteredUpdates.reference_answer_path = updateFields.reference_answer_path;
      } else if (type === 'ORCHESTRATION') {
        if (typeData.pianoScorePath !== undefined) filteredUpdates.piano_score_path = updateFields.piano_score_path;
        if (typeData.targetEnsemble !== undefined) filteredUpdates.target_ensemble = updateFields.target_ensemble;
        if (typeData.ensembleInstruments !== undefined) filteredUpdates.ensemble_instruments = updateFields.ensemble_instruments;
        if (typeData.rubric !== undefined) filteredUpdates.rubric = updateFields.rubric;
      } else {
        // For other types, use all updateFields
        Object.keys(updateFields).forEach(key => {
          if (updateFields[key] !== undefined) {
            filteredUpdates[key] = updateFields[key];
          }
        });
      }
      
      if (Object.keys(filteredUpdates).length > 0) {
        const { data, error } = await supabaseAdmin
          .from(typeTable)
          .update(filteredUpdates)
          .eq('question_id', questionId)
          .select()
          .single();

        if (error) throw error;
        result = data;
      } else {
        result = existing;
      }
    } else {
      // Insert new record
      const { data, error } = await supabaseAdmin
        .from(typeTable)
        .insert(updateData)
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    return result;
  }

  /**
   * Delete question
   */
  async deleteQuestion(questionId) {
    // Get section to recalculate exam points
    const { data: question } = await supabaseAdmin
      .from('questions')
      .select(`
        section_id,
        section:exam_sections(exam_id)
      `)
      .eq('id', questionId)
      .single();

    const { error } = await supabaseAdmin
      .from('questions')
      .delete()
      .eq('id', questionId);

    if (error) throw error;

    // Recalculate exam total points
    if (question && question.section && question.section.exam_id) {
      await examService.calculateTotalPoints(question.section.exam_id);
    }

    return true;
  }

  /**
   * Get all questions for a section
   */
  async getQuestionsBySection(sectionId) {
    const { data, error } = await supabaseAdmin
      .from('questions')
      .select(`
        *,
        true_false:true_false_questions(*),
        multiple_choice:multiple_choice_questions(*),
        listening:listening_questions(*),
        transposition:transposition_questions(*),
        orchestration:orchestration_questions(*)
      `)
      .eq('section_id', sectionId)
      .order('order_index', { ascending: true });

    if (error) throw error;
    return data;
  }

  /**
   * Reorder questions in a section
   */
  async reorderQuestions(sectionId, questionIds) {
    const updates = questionIds.map((id, index) => ({
      id,
      order_index: index
    }));

    const promises = updates.map(update =>
      supabaseAdmin
        .from('questions')
        .update({ order_index: update.order_index })
        .eq('id', update.id)
    );

    await Promise.all(promises);
    return true;
  }
}

module.exports = new QuestionService();

