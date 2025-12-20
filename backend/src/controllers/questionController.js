const questionService = require('../services/questionService');
const storageService = require('../services/storageService');

class QuestionController {
  /**
   * Create question
   */
  async createQuestion(req, res) {
    try {
      const questionData = req.body;
      const question = await questionService.createQuestion(questionData);
      
      res.status(201).json({
        success: true,
        data: question
      });
    } catch (error) {
      console.error('Error creating question:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Upload audio file for listening question
   */
  async uploadAudio(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No audio file provided'
        });
      }

      const { questionId } = req.body;
      const result = await storageService.uploadAudioFile(req.file, questionId || 'temp');
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error uploading audio:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Upload notation file for transposition/orchestration question
   */
  async uploadNotation(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No notation file provided'
        });
      }

      const { questionId } = req.body;
      const result = await storageService.uploadNotationFile(req.file, questionId || 'temp');
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error uploading notation:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get question by ID
   */
  async getQuestion(req, res) {
    try {
      const { id } = req.params;
      const question = await questionService.getQuestionById(id);
      
      res.json({
        success: true,
        data: question
      });
    } catch (error) {
      console.error('Error getting question:', error);
      res.status(404).json({
        success: false,
        error: 'Question not found'
      });
    }
  }

  /**
   * Get questions by section
   */
  async getSectionQuestions(req, res) {
    try {
      const { sectionId } = req.params;
      const questions = await questionService.getQuestionsBySection(sectionId);
      
      res.json({
        success: true,
        data: questions
      });
    } catch (error) {
      console.error('Error getting section questions:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Update question
   */
  async updateQuestion(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;
      const question = await questionService.updateQuestion(id, updates);
      
      res.json({
        success: true,
        data: question
      });
    } catch (error) {
      console.error('Error updating question:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Delete question
   */
  async deleteQuestion(req, res) {
    try {
      const { id } = req.params;
      await questionService.deleteQuestion(id);
      
      res.json({
        success: true,
        message: 'Question deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting question:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Reorder questions in section
   */
  async reorderQuestions(req, res) {
    try {
      const { sectionId } = req.params;
      const { questionIds } = req.body;
      
      await questionService.reorderQuestions(sectionId, questionIds);
      
      res.json({
        success: true,
        message: 'Questions reordered successfully'
      });
    } catch (error) {
      console.error('Error reordering questions:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new QuestionController();

