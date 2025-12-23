import { supabaseAdmin } from '@/lib/supabase/admin'

class AttemptService {
  /**
   * Start a new exam attempt
   */
  async startAttempt(examId: string, studentId: string) {
    // Check if exam is assigned to student
    const { data: assignment } = await supabaseAdmin
      .from('exam_assignments')
      .select('*')
      .eq('exam_id', examId)
      .eq('student_id', studentId)
      .single()

    if (!assignment) {
      throw new Error('Exam not assigned to this student')
    }

    // Check if there's already an in-progress attempt
    const { data: existingAttempt } = await supabaseAdmin
      .from('exam_attempts')
      .select('*')
      .eq('exam_id', examId)
      .eq('student_id', studentId)
      .eq('status', 'IN_PROGRESS')
      .single()

    if (existingAttempt) {
      return existingAttempt
    }

    // Get exam total points
    const { data: exam } = await supabaseAdmin
      .from('exams')
      .select('total_points')
      .eq('id', examId)
      .single()

    // Create new attempt
    const { data, error } = await supabaseAdmin
      .from('exam_attempts')
      .insert({
        exam_id: examId,
        student_id: studentId,
        total_points: exam?.total_points || 0,
        status: 'IN_PROGRESS'
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Get attempt by ID with all answers
   */
  async getAttemptById(attemptId: string) {
    const { data, error } = await supabaseAdmin
      .from('exam_attempts')
      .select(`
        *,
        exam:exams(*),
        student:profiles!student_id(id, first_name, last_name, email),
        answers:student_answers(
          *,
          question:questions(
            *,
            section:exam_sections(section_type),
            true_false:true_false_questions(*),
            multiple_choice:multiple_choice_questions(*),
            listening:listening_questions(*),
            transposition:transposition_questions(*),
            orchestration:orchestration_questions(*),
            listen_and_write:listen_and_write_questions(*),
            listen_and_repeat:listen_and_repeat_questions(*),
            listen_and_complete:listen_and_complete_questions(*)
          )
        )
      `)
      .eq('id', attemptId)
      .single()

    if (error) throw error
    return data
  }

  /**
   * Get all attempts for an exam
   */
  async getExamAttempts(examId: string) {
    const { data, error } = await supabaseAdmin
      .from('exam_attempts')
      .select(`
        *,
        student:profiles!student_id(id, first_name, last_name, email)
      `)
      .eq('exam_id', examId)
      .order('started_at', { ascending: false })

    if (error) throw error
    return data
  }

  /**
   * Get student's attempts
   */
  async getStudentAttempts(studentId: string) {
    const { data, error } = await supabaseAdmin
      .from('exam_attempts')
      .select(`
        *,
        exam:exams(*)
      `)
      .eq('student_id', studentId)
      .order('started_at', { ascending: false })

    if (error) throw error
    return data
  }

  /**
   * Submit an answer
   */
  async submitAnswer(answerData: any) {
    const { attemptId, questionId, answer, submissionFilePath, maxPoints } = answerData

    // Check if answer already exists
    const { data: existing } = await supabaseAdmin
      .from('student_answers')
      .select('*')
      .eq('attempt_id', attemptId)
      .eq('question_id', questionId)
      .single()

    if (existing) {
      // Update existing answer
      const { data, error } = await supabaseAdmin
        .from('student_answers')
        .update({
          answer,
          submission_file_path: submissionFilePath || (existing as any).submission_file_path,
          is_graded: false // Reset graded status on re-submission
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) throw error
      return data
    }

    // Create new answer
    const { data, error } = await supabaseAdmin
      .from('student_answers')
      .insert({
        attempt_id: attemptId,
        question_id: questionId,
        answer,
        submission_file_path: submissionFilePath,
        max_points: maxPoints,
        is_graded: false
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Submit exam attempt
   */
  async submitAttempt(attemptId: string, timeSpentSeconds: number) {
    const { data, error } = await supabaseAdmin
      .from('exam_attempts')
      .update({
        status: 'SUBMITTED',
        submitted_at: new Date().toISOString(),
        time_spent_seconds: timeSpentSeconds
      })
      .eq('id', attemptId)
      .select()
      .single()

    if (error) throw error

    // Trigger auto-grading for objective questions
    await this.autoGradeObjectiveQuestions(attemptId)

    return data
  }

  /**
   * Auto-grade objective questions (True/False, Multiple Choice, Listen and Complete)
   */
  async autoGradeObjectiveQuestions(attemptId: string) {
    // Get all answers for the attempt
    const { data: answers } = await supabaseAdmin
      .from('student_answers')
      .select(`
        *,
        question:questions(
          *,
          section:exam_sections(section_type),
          true_false:true_false_questions(*),
          multiple_choice:multiple_choice_questions(*),
          listen_and_complete:listen_and_complete_questions(*),
          listen_and_write:listen_and_write_questions(*)
        )
      `)
      .eq('attempt_id', attemptId)
      .eq('is_graded', false)

    if (!answers || answers.length === 0) return

    const gradingPromises = answers.map(async (answer: any) => {
      const question = answer.question
      const sectionType = question?.section?.section_type
      let pointsEarned = 0
      let isCorrect = false

      if (sectionType === 'TRUE_FALSE') {
        const correctAnswer = question.true_false?.[0]?.correct_answer
        isCorrect = answer.answer?.value === correctAnswer
        pointsEarned = isCorrect ? question.points : 0
      } else if (sectionType === 'MULTIPLE_CHOICE') {
        const correctIndex = question.multiple_choice?.[0]?.correct_option_index
        isCorrect = answer.answer?.selectedIndex === correctIndex
        pointsEarned = isCorrect ? question.points : 0
      } else if (sectionType === 'LISTEN_AND_COMPLETE') {
        // Auto-grade Listen and Complete questions using MusicXML evaluation
        const questionData = question.listen_and_complete?.[0]
        const studentCompletedXML = answer.answer?.completedScore || answer.answer?.musicXML
        
        if (!studentCompletedXML || !questionData?.complete_score_path) {
          // Cannot auto-grade without complete score reference - skip
          return
        }

        try {
          // Load complete score reference
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
          if (!supabaseUrl) {
            console.error('Supabase URL not configured')
            return
          }

          const completeScoreUrl = `${supabaseUrl}/storage/v1/object/public/notation-files/${questionData.complete_score_path}`
          const response = await fetch(completeScoreUrl)
          
          if (!response.ok) {
            console.error('Failed to load complete score reference')
            return
          }

          const completeScoreXML = await response.text()
          
          // Use notation evaluator to compare (similar to transposition evaluation)
          // For now, use simple comparison - can be enhanced with partial credit logic
          // Import the evaluator function
          const { evaluateTransposition } = await import('@/lib/notation/evaluator')
          const evaluation = evaluateTransposition(completeScoreXML, studentCompletedXML, 0)
          
          // Calculate points based on percentage (round to nearest integer)
          pointsEarned = Math.round((evaluation.percentage / 100) * question.points)
          isCorrect = evaluation.percentage >= 90 // Consider 90%+ as correct
        } catch (error) {
          console.error('Error auto-grading Listen and Complete:', error)
          // Skip this answer if evaluation fails
          return
        }
      } else if (sectionType === 'LISTEN_AND_WRITE') {
        // Auto-grade Listen and Write questions using MusicXML evaluation
        const questionData = question.listen_and_write?.[0]
        const studentMusicXML = answer.answer?.musicXML
        
        // Check if we have a reference score for auto-grading
        const hasReferenceScore = questionData?.reference_score_path || questionData?.reference_score_music_xml
        if (!studentMusicXML || !hasReferenceScore) {
          // Cannot auto-grade without student MusicXML or reference score - skip
          return
        }

        try {
          // Load reference score
          let referenceMusicXML: string
          
          if (questionData.reference_score_music_xml) {
            // Use inline MusicXML from editor
            referenceMusicXML = questionData.reference_score_music_xml
          } else if (questionData.reference_score_path) {
            // Load from file path
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
            if (!supabaseUrl) {
              console.error('Supabase URL not configured')
              return
            }

            const referenceScoreUrl = `${supabaseUrl}/storage/v1/object/public/notation-files/${questionData.reference_score_path}`
            const response = await fetch(referenceScoreUrl)
            
            if (!response.ok) {
              console.error('Failed to load reference score')
              return
            }

            referenceMusicXML = await response.text()
          } else {
            return // No reference score available
          }
          
          // Use notation evaluator to compare (0 semitones - no transposition)
          const { evaluateTransposition } = await import('@/lib/notation/evaluator')
          const evaluation = evaluateTransposition(referenceMusicXML, studentMusicXML, 0)
          
          // Calculate points based on percentage (round to nearest integer)
          pointsEarned = Math.round((evaluation.percentage / 100) * question.points)
          isCorrect = evaluation.percentage >= 90 // Consider 90%+ as correct
        } catch (error) {
          console.error('Error auto-grading Listen and Write:', error)
          return // Skip this question if evaluation fails
        }
      } else if (sectionType === 'INTERVAL_DICTATION') {
        // Auto-grade Interval Dictation questions
        const questionData = question.interval_dictation?.[0]
        const studentAnswer = answer.answer?.selectedInterval
        
        if (!studentAnswer || !questionData?.correct_interval) {
          return
        }

        isCorrect = studentAnswer === questionData.correct_interval
        pointsEarned = isCorrect ? question.points : 0
      } else if (sectionType === 'CHORD_DICTATION') {
        // Auto-grade Chord Dictation questions
        const questionData = question.chord_dictation?.[0]
        const studentAnswer = answer.answer?.selectedChord
        
        if (!studentAnswer || !questionData?.correct_chord) {
          return
        }

        // Normalize chord names for comparison (case-insensitive, trim)
        const normalizedStudent = studentAnswer.trim().toLowerCase()
        const normalizedCorrect = questionData.correct_chord.trim().toLowerCase()
        
        isCorrect = normalizedStudent === normalizedCorrect
        pointsEarned = isCorrect ? question.points : 0
      } else if (sectionType === 'PROGRESSION_DICTATION') {
        // Auto-grade Progression Dictation questions
        const questionData = question.progression_dictation?.[0]
        const studentAnswer = answer.answer?.selectedProgression
        
        if (!studentAnswer || !questionData?.correct_progression) {
          return
        }

        // Compare arrays (order matters for progressions)
        const correctProg = questionData.correct_progression || []
        const studentProg = Array.isArray(studentAnswer) ? studentAnswer : []
        
        if (correctProg.length !== studentProg.length) {
          isCorrect = false
          pointsEarned = 0
        } else {
          isCorrect = correctProg.every((chord: string, index: number) => 
            chord.toLowerCase() === studentProg[index]?.toLowerCase()
          )
          pointsEarned = isCorrect ? question.points : 0
        }
      } else {
        // Skip non-objective questions
        return
      }

      // Update answer with grade
      await supabaseAdmin
        .from('student_answers')
        .update({
          points_earned: pointsEarned,
          is_graded: true,
          graded_at: new Date().toISOString()
        })
        .eq('id', answer.id)
    })

    await Promise.all(gradingPromises)

    // Calculate total score
    await this.calculateAttemptScore(attemptId)
  }

  /**
   * Calculate and update attempt score
   */
  async calculateAttemptScore(attemptId: string) {
    const { data: answers } = await supabaseAdmin
      .from('student_answers')
      .select('points_earned, is_graded, max_points')
      .eq('attempt_id', attemptId)

    if (!answers || answers.length === 0) return

    const allGraded = answers.every((a: any) => a.is_graded)
    const totalScore = answers.reduce((sum: number, a: any) => sum + (a.points_earned || 0), 0)
    const totalPoints = answers.reduce((sum: number, a: any) => sum + (a.max_points || 0), 0)

    await supabaseAdmin
      .from('exam_attempts')
      .update({
        score: totalScore,
        total_points: totalPoints,
        status: allGraded ? 'GRADED' : 'SUBMITTED'
      })
      .eq('id', attemptId)
  }

  /**
   * Grade a subjective answer (transposition, orchestration, listening)
   */
  async gradeAnswer(answerId: string, pointsEarned: number, feedback: string | null, graderId: string) {
    const { data, error } = await supabaseAdmin
      .from('student_answers')
      .update({
        points_earned: pointsEarned,
        feedback: feedback,
        is_graded: true,
        graded_at: new Date().toISOString(),
        graded_by: graderId
      })
      .eq('id', answerId)
      .select()
      .single()

    if (error) throw error

    // Recalculate attempt score
    const { data: answer } = await supabaseAdmin
      .from('student_answers')
      .select('attempt_id')
      .eq('id', answerId)
      .single()

    if (answer) {
      await this.calculateAttemptScore(answer.attempt_id)
    }

    return data
  }
}

export const attemptService = new AttemptService()



