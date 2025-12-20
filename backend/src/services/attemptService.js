const supabaseAdmin = require('../config/supabase');

class AttemptService {
  /**
   * Start a new exam attempt
   */
  async startAttempt(examId, studentId) {
    // Check if exam is assigned to student
    const { data: assignment } = await supabaseAdmin
      .from('exam_assignments')
      .select('*')
      .eq('exam_id', examId)
      .eq('student_id', studentId)
      .single();

    if (!assignment) {
      throw new Error('Exam not assigned to this student');
    }

    // Check if there's already an in-progress attempt
    const { data: existingAttempt } = await supabaseAdmin
      .from('exam_attempts')
      .select('*')
      .eq('exam_id', examId)
      .eq('student_id', studentId)
      .eq('status', 'IN_PROGRESS')
      .single();

    if (existingAttempt) {
      return existingAttempt;
    }

    // Get exam total points
    const { data: exam } = await supabaseAdmin
      .from('exams')
      .select('total_points')
      .eq('id', examId)
      .single();

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
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get attempt by ID with all answers
   */
  async getAttemptById(attemptId) {
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
            orchestration:orchestration_questions(*)
          )
        )
      `)
      .eq('id', attemptId)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get all attempts for an exam
   */
  async getExamAttempts(examId) {
    const { data, error } = await supabaseAdmin
      .from('exam_attempts')
      .select(`
        *,
        student:profiles!student_id(id, first_name, last_name, email)
      `)
      .eq('exam_id', examId)
      .order('started_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  /**
   * Get student's attempts
   */
  async getStudentAttempts(studentId) {
    const { data, error } = await supabaseAdmin
      .from('exam_attempts')
      .select(`
        *,
        exam:exams(*)
      `)
      .eq('student_id', studentId)
      .order('started_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  /**
   * Submit an answer
   */
  async submitAnswer(answerData) {
    const { attemptId, questionId, answer, submissionFilePath, maxPoints } = answerData;

    // Check if answer already exists
    const { data: existing } = await supabaseAdmin
      .from('student_answers')
      .select('*')
      .eq('attempt_id', attemptId)
      .eq('question_id', questionId)
      .single();

    if (existing) {
      // Update existing answer
      const { data, error } = await supabaseAdmin
        .from('student_answers')
        .update({
          answer,
          submission_file_path: submissionFilePath || existing.submission_file_path,
          is_graded: false // Reset graded status on re-submission
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      return data;
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
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Submit exam attempt
   */
  async submitAttempt(attemptId, timeSpentSeconds) {
    const { data, error } = await supabaseAdmin
      .from('exam_attempts')
      .update({
        status: 'SUBMITTED',
        submitted_at: new Date().toISOString(),
        time_spent_seconds: timeSpentSeconds
      })
      .eq('id', attemptId)
      .select()
      .single();

    if (error) throw error;

    // Trigger auto-grading for objective questions
    await this.autoGradeObjectiveQuestions(attemptId);

    return data;
  }

  /**
   * Auto-grade objective questions (True/False, Multiple Choice)
   */
  async autoGradeObjectiveQuestions(attemptId) {
    // Get all answers for the attempt
    const { data: answers } = await supabaseAdmin
      .from('student_answers')
      .select(`
        *,
        question:questions(
          *,
          section:exam_sections(section_type),
          true_false:true_false_questions(*),
          multiple_choice:multiple_choice_questions(*)
        )
      `)
      .eq('attempt_id', attemptId)
      .eq('is_graded', false);

    if (!answers || answers.length === 0) return;

    const gradingPromises = answers.map(async (answer) => {
      const question = answer.question;
      const sectionType = question.section.section_type;
      let pointsEarned = 0;
      let isCorrect = false;

      if (sectionType === 'TRUE_FALSE') {
        const correctAnswer = question.true_false[0]?.correct_answer;
        isCorrect = answer.answer.value === correctAnswer;
        pointsEarned = isCorrect ? question.points : 0;
      } else if (sectionType === 'MULTIPLE_CHOICE') {
        const correctIndex = question.multiple_choice[0]?.correct_option_index;
        isCorrect = answer.answer.selectedIndex === correctIndex;
        pointsEarned = isCorrect ? question.points : 0;
      } else {
        // Skip non-objective questions
        return;
      }

      // Update answer with grade
      await supabaseAdmin
        .from('student_answers')
        .update({
          points_earned: pointsEarned,
          is_graded: true,
          graded_at: new Date().toISOString()
        })
        .eq('id', answer.id);
    });

    await Promise.all(gradingPromises);

    // Calculate total score
    await this.calculateAttemptScore(attemptId);
  }

  /**
   * Calculate and update attempt score
   */
  async calculateAttemptScore(attemptId) {
    const { data: answers } = await supabaseAdmin
      .from('student_answers')
      .select('points_earned, is_graded, max_points')
      .eq('attempt_id', attemptId);

    if (!answers || answers.length === 0) return;

    const allGraded = answers.every(a => a.is_graded);
    const totalScore = answers.reduce((sum, a) => sum + (a.points_earned || 0), 0);
    const totalPoints = answers.reduce((sum, a) => sum + (a.max_points || 0), 0);

    await supabaseAdmin
      .from('exam_attempts')
      .update({
        score: totalScore,
        total_points: totalPoints,
        status: allGraded ? 'GRADED' : 'SUBMITTED'
      })
      .eq('id', attemptId);
  }

  /**
   * Grade a subjective answer (transposition, orchestration, listening)
   */
  async gradeAnswer(answerId, pointsEarned, feedback, graderId) {
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
      .single();

    if (error) throw error;

    // Recalculate attempt score
    const { data: answer } = await supabaseAdmin
      .from('student_answers')
      .select('attempt_id')
      .eq('id', answerId)
      .single();

    if (answer) {
      await this.calculateAttemptScore(answer.attempt_id);
    }

    return data;
  }
}

module.exports = new AttemptService();

