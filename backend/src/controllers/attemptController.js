const attemptService = require('../services/attemptService');
const storageService = require('../services/storageService');

class AttemptController {
  /**
   * Start exam attempt
   */
  async startAttempt(req, res) {
    try {
      const { examId } = req.body;
      const attempt = await attemptService.startAttempt(examId, req.profile.id);
      
      res.status(201).json({
        success: true,
        data: attempt
      });
    } catch (error) {
      console.error('Error starting attempt:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get attempt by ID
   */
  async getAttempt(req, res) {
    try {
      const { id } = req.params;
      const attempt = await attemptService.getAttemptById(id);
      
      res.json({
        success: true,
        data: attempt
      });
    } catch (error) {
      console.error('Error getting attempt:', error);
      res.status(404).json({
        success: false,
        error: 'Attempt not found'
      });
    }
  }

  /**
   * Get exam attempts (for teachers)
   */
  async getExamAttempts(req, res) {
    try {
      const { examId } = req.params;
      const attempts = await attemptService.getExamAttempts(examId);
      
      res.json({
        success: true,
        data: attempts
      });
    } catch (error) {
      console.error('Error getting exam attempts:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get student's attempts
   */
  async getStudentAttempts(req, res) {
    try {
      const attempts = await attemptService.getStudentAttempts(req.profile.id);
      
      res.json({
        success: true,
        data: attempts
      });
    } catch (error) {
      console.error('Error getting student attempts:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Submit answer
   */
  async submitAnswer(req, res) {
    try {
      const { attemptId, questionId, answer, maxPoints } = req.body;
      
      let submissionFilePath = null;
      
      // Handle file upload if present
      if (req.file) {
        const result = await storageService.uploadStudentSubmission(
          req.file,
          attemptId,
          questionId,
          req.profile.id
        );
        submissionFilePath = result.path;
      }

      const answerData = {
        attemptId,
        questionId,
        answer,
        submissionFilePath,
        maxPoints
      };

      const savedAnswer = await attemptService.submitAnswer(answerData);
      
      res.json({
        success: true,
        data: savedAnswer
      });
    } catch (error) {
      console.error('Error submitting answer:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Submit exam attempt
   */
  async submitAttempt(req, res) {
    try {
      const { id } = req.params;
      const { timeSpentSeconds } = req.body;
      
      const attempt = await attemptService.submitAttempt(id, timeSpentSeconds);
      
      res.json({
        success: true,
        data: attempt
      });
    } catch (error) {
      console.error('Error submitting attempt:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Grade answer (for teachers)
   */
  async gradeAnswer(req, res) {
    try {
      const { answerId } = req.params;
      const { pointsEarned, feedback } = req.body;
      
      const answer = await attemptService.gradeAnswer(
        answerId,
        pointsEarned,
        feedback,
        req.profile.id
      );
      
      res.json({
        success: true,
        data: answer
      });
    } catch (error) {
      console.error('Error grading answer:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get signed URL for student submission
   */
  async getSubmissionUrl(req, res) {
    try {
      const { path } = req.query;
      
      if (!path) {
        return res.status(400).json({
          success: false,
          error: 'File path required'
        });
      }

      const url = await storageService.getSignedUrl('student-submissions', path);
      
      res.json({
        success: true,
        data: { url }
      });
    } catch (error) {
      console.error('Error getting submission URL:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new AttemptController();

