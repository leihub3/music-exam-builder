const examService = require('../services/examService');
const storageService = require('../services/storageService');
const supabaseAdmin = require('../config/supabase');

class ExamController {
  /**
   * Create new exam
   */
  async createExam(req, res) {
    try {
      const examData = req.body;
      const exam = await examService.createExam(examData, req.profile.id);
      
      res.status(201).json({
        success: true,
        data: exam
      });
    } catch (error) {
      console.error('Error creating exam:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get exam by ID
   */
  async getExam(req, res) {
    try {
      const { id } = req.params;
      const exam = await examService.getExamById(id);
      
      res.json({
        success: true,
        data: exam
      });
    } catch (error) {
      console.error('Error getting exam:', error);
      res.status(404).json({
        success: false,
        error: 'Exam not found'
      });
    }
  }

  /**
   * Get teacher's exams
   */
  async getTeacherExams(req, res) {
    try {
      const exams = await examService.getTeacherExams(req.profile.id);
      
      res.json({
        success: true,
        data: exams
      });
    } catch (error) {
      console.error('Error getting teacher exams:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get institution exams
   */
  async getInstitutionExams(req, res) {
    try {
      const { institutionId } = req.params;
      const exams = await examService.getInstitutionExams(institutionId);
      
      res.json({
        success: true,
        data: exams
      });
    } catch (error) {
      console.error('Error getting institution exams:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Update exam
   */
  async updateExam(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;
      const exam = await examService.updateExam(id, updates);
      
      res.json({
        success: true,
        data: exam
      });
    } catch (error) {
      console.error('Error updating exam:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Delete exam
   */
  async deleteExam(req, res) {
    try {
      const { id } = req.params;
      await examService.deleteExam(id);
      
      res.json({
        success: true,
        message: 'Exam deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting exam:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Publish/unpublish exam
   */
  async publishExam(req, res) {
    try {
      const { id } = req.params;
      const { isPublished } = req.body;
      const exam = await examService.publishExam(id, isPublished);
      
      res.json({
        success: true,
        data: exam
      });
    } catch (error) {
      console.error('Error publishing exam:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Assign exam to students
   */
  async assignExam(req, res) {
    try {
      const { id } = req.params;
      const { studentIds, dueDate } = req.body;
      
      const assignments = await examService.assignExamToStudents(
        id,
        studentIds,
        req.profile.id,
        dueDate
      );
      
      res.status(201).json({
        success: true,
        data: assignments
      });
    } catch (error) {
      console.error('Error assigning exam:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get student's assigned exams
   */
  async getStudentExams(req, res) {
    try {
      const assignments = await examService.getStudentAssignedExams(req.profile.id);
      
      res.json({
        success: true,
        data: assignments
      });
    } catch (error) {
      console.error('Error getting student exams:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Create exam section
   */
  async createSection(req, res) {
    try {
      const { examId } = req.params;
      const sectionData = req.body;

      // Convert camelCase to snake_case
      const dbData = {
        exam_id: examId,
        title: sectionData.title,
        description: sectionData.description || null,
        section_type: sectionData.sectionType,
        order_index: sectionData.orderIndex
      };

      const section = await examService.createSection(dbData);
      
      res.status(201).json({
        success: true,
        data: section
      });
    } catch (error) {
      console.error('Error creating section:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Update exam section
   */
  async updateSection(req, res) {
    try {
      const { sectionId } = req.params;
      const updates = req.body;

      // Convert camelCase to snake_case
      const dbUpdates = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.orderIndex !== undefined) dbUpdates.order_index = updates.orderIndex;

      const section = await examService.updateSection(sectionId, dbUpdates);
      
      res.json({
        success: true,
        data: section
      });
    } catch (error) {
      console.error('Error updating section:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Delete exam section
   */
  async deleteSection(req, res) {
    try {
      const { sectionId } = req.params;
      await examService.deleteSection(sectionId);
      
      res.json({
        success: true,
        message: 'Section deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting section:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get section by ID
   */
  async getSection(req, res) {
    try {
      const { sectionId } = req.params;
      const section = await examService.getSectionById(sectionId);
      
      res.json({
        success: true,
        data: section
      });
    } catch (error) {
      console.error('Error getting section:', error);
      res.status(404).json({
        success: false,
        error: 'Section not found'
      });
    }
  }

  /**
   * Get all students (for assignment)
   */
  async getStudents(req, res) {
    try {
      const { data: students, error } = await supabaseAdmin
        .from('profiles')
        .select('id, email, first_name, last_name')
        .eq('role', 'STUDENT')
        .order('last_name', { ascending: true });

      if (error) throw error;

      res.json({
        success: true,
        data: students || []
      });
    } catch (error) {
      console.error('Error getting students:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new ExamController();

