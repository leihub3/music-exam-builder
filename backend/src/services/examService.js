const supabaseAdmin = require('../config/supabase');

class ExamService {
  /**
   * Create a new exam
   */
  async createExam(examData, creatorId) {
    // Convert camelCase to snake_case for database
    const dbData = {
      title: examData.title,
      description: examData.description,
      institution_id: examData.institutionId || null,
      duration_minutes: examData.durationMinutes || null,
      passing_score: examData.passingScore || null,
      created_by: creatorId
    };

    const { data, error } = await supabaseAdmin
      .from('exams')
      .insert(dbData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get exam by ID with sections and questions
   */
  async getExamById(examId, includeQuestions = true) {
    let query = supabaseAdmin
      .from('exams')
      .select(`
        *,
        sections:exam_sections(
          *,
          questions:questions(
            *,
            true_false:true_false_questions(*),
            multiple_choice:multiple_choice_questions(*),
            listening:listening_questions(*),
            transposition:transposition_questions(*),
            orchestration:orchestration_questions(*)
          )
        )
      `)
      .eq('id', examId)
      .single();

    const { data, error } = await query;

    if (error) throw error;
    return data;
  }

  /**
   * Get all exams for a teacher
   */
  async getTeacherExams(teacherId) {
    const { data, error } = await supabaseAdmin
      .from('exams')
      .select('*, sections:exam_sections(count)')
      .eq('created_by', teacherId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  /**
   * Get exams for institution
   */
  async getInstitutionExams(institutionId) {
    const { data, error } = await supabaseAdmin
      .from('exams')
      .select('*, creator:profiles!created_by(first_name, last_name)')
      .eq('institution_id', institutionId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  /**
   * Update exam
   */
  async updateExam(examId, updates) {
    // Convert camelCase to snake_case for database
    const dbUpdates = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.institutionId !== undefined) dbUpdates.institution_id = updates.institutionId;
    if (updates.durationMinutes !== undefined) dbUpdates.duration_minutes = updates.durationMinutes;
    if (updates.passingScore !== undefined) dbUpdates.passing_score = updates.passingScore;
    if (updates.isPublished !== undefined) dbUpdates.is_published = updates.isPublished;
    if (updates.availableFrom !== undefined) dbUpdates.available_from = updates.availableFrom;
    if (updates.availableUntil !== undefined) dbUpdates.available_until = updates.availableUntil;

    // Ensure we have something to update
    if (Object.keys(dbUpdates).length === 0) {
      throw new Error('No fields to update');
    }

    // Check if exam exists first (without .single() to avoid coercion error)
    const { data: existingExams, error: checkError } = await supabaseAdmin
      .from('exams')
      .select('id')
      .eq('id', examId)
      .limit(1);

    if (checkError) throw checkError;
    if (!existingExams || existingExams.length === 0) {
      throw new Error('Exam not found');
    }

    const { data, error } = await supabaseAdmin
      .from('exams')
      .update(dbUpdates)
      .eq('id', examId)
      .select();

    if (error) {
      console.error('Error updating exam:', error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      throw new Error('Failed to update exam - no rows affected');
    }
    
    // Return the first (and should be only) updated exam
    return data[0];
  }

  /**
   * Delete exam
   */
  async deleteExam(examId) {
    const { error } = await supabaseAdmin
      .from('exams')
      .delete()
      .eq('id', examId);

    if (error) throw error;
    return true;
  }

  /**
   * Publish/unpublish exam
   */
  async publishExam(examId, isPublished) {
    return this.updateExam(examId, { isPublished: isPublished });
  }

  /**
   * Create exam section
   */
  async createSection(sectionData) {
    const { data, error } = await supabaseAdmin
      .from('exam_sections')
      .insert({
        exam_id: sectionData.exam_id,
        title: sectionData.title,
        description: sectionData.description,
        section_type: sectionData.section_type,
        order_index: sectionData.order_index
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update exam section
   */
  async updateSection(sectionId, updates) {
    const { data, error } = await supabaseAdmin
      .from('exam_sections')
      .update(updates)
      .eq('id', sectionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Delete exam section
   */
  async deleteSection(sectionId) {
    const { error } = await supabaseAdmin
      .from('exam_sections')
      .delete()
      .eq('id', sectionId);

    if (error) throw error;
    return true;
  }

  /**
   * Get section by ID with questions
   */
  async getSectionById(sectionId) {
    const { data, error } = await supabaseAdmin
      .from('exam_sections')
      .select(`
        *,
        questions:questions(
          *,
          true_false:true_false_questions(*),
          multiple_choice:multiple_choice_questions(*),
          listening:listening_questions(*),
          transposition:transposition_questions(*),
          orchestration:orchestration_questions(*)
        )
      `)
      .eq('id', sectionId)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Calculate total points for an exam
   */
  async calculateTotalPoints(examId) {
    // Get all sections for this exam
    const { data: sections } = await supabaseAdmin
      .from('exam_sections')
      .select('id')
      .eq('exam_id', examId);

    if (!sections || sections.length === 0) {
      await supabaseAdmin
        .from('exams')
        .update({ total_points: 0 })
        .eq('id', examId);
      return 0;
    }

    // Get all questions for these sections
    const sectionIds = sections.map(s => s.id);
    const { data: allQuestions } = await supabaseAdmin
      .from('questions')
      .select('points')
      .in('section_id', sectionIds);

    // Calculate total
    const total = allQuestions 
      ? allQuestions.reduce((sum, q) => sum + (q.points || 0), 0)
      : 0;

    // Update exam total points
    await supabaseAdmin
      .from('exams')
      .update({ total_points: total })
      .eq('id', examId);

    return total;
  }

  /**
   * Assign exam to students
   */
  async assignExamToStudents(examId, studentIds, assignedBy, dueDate = null) {
    // Check if exam exists and is published
    const { data: exam, error: examError } = await supabaseAdmin
      .from('exams')
      .select('id, is_published')
      .eq('id', examId)
      .single();

    if (examError) throw examError;
    if (!exam) throw new Error('Exam not found');
    if (!exam.is_published) {
      throw new Error('Cannot assign unpublished exam. Please publish the exam first.');
    }

    const assignments = studentIds.map(studentId => ({
      exam_id: examId,
      student_id: studentId,
      assigned_by: assignedBy,
      due_date: dueDate || null
    }));

    // Use upsert to handle duplicates gracefully
    const { data, error } = await supabaseAdmin
      .from('exam_assignments')
      .upsert(assignments, {
        onConflict: 'exam_id,student_id',
        ignoreDuplicates: false
      })
      .select();

    if (error) {
      console.error('Error assigning exam:', error);
      throw error;
    }
    
    console.log(`Assigned exam ${examId} to ${data?.length || 0} student(s)`);
    return data || [];
  }

  /**
   * Get student's assigned exams
   */
  async getStudentAssignedExams(studentId) {
    // First get all assignments for the student with exam details
    const { data: assignments, error: assignmentsError } = await supabaseAdmin
      .from('exam_assignments')
      .select(`
        *,
        exam:exams(*)
      `)
      .eq('student_id', studentId)
      .order('assigned_at', { ascending: false });

    if (assignmentsError) {
      console.error('Error fetching student assignments:', assignmentsError);
      throw assignmentsError;
    }

    // Filter to only include published exams
    const publishedAssignments = (assignments || []).filter(
      assignment => assignment.exam && assignment.exam.is_published === true
    );

    // Get attempts for each assignment separately
    const assignmentsWithAttempts = await Promise.all(
      publishedAssignments.map(async (assignment) => {
        const { data: attempts } = await supabaseAdmin
          .from('exam_attempts')
          .select('*')
          .eq('exam_id', assignment.exam_id)
          .eq('student_id', studentId)
          .order('started_at', { ascending: false });

        return {
          ...assignment,
          attempts: attempts || []
        };
      })
    );
    
    console.log(`Found ${assignmentsWithAttempts.length} published assignments for student ${studentId} (out of ${assignments?.length || 0} total)`);
    return assignmentsWithAttempts;
  }
}

module.exports = new ExamService();

