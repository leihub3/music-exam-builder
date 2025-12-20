const express = require('express');
const router = express.Router();
const attemptController = require('../controllers/attemptController');
const { authenticateUser } = require('../middleware/auth');
const { requireTeacher } = require('../middleware/roleCheck');
const { uploadSubmission } = require('../middleware/upload');

// All routes require authentication
router.use(authenticateUser);

// Student routes
router.post('/start', attemptController.startAttempt);
router.get('/student', attemptController.getStudentAttempts);
router.post('/answer', uploadSubmission, attemptController.submitAnswer);
router.post('/:id/submit', attemptController.submitAttempt);
router.get('/submission-url', attemptController.getSubmissionUrl);

// Teacher routes
router.get('/exam/:examId', requireTeacher, attemptController.getExamAttempts);
router.post('/answer/:answerId/grade', requireTeacher, attemptController.gradeAnswer);

// Shared routes
router.get('/:id', attemptController.getAttempt);

module.exports = router;

