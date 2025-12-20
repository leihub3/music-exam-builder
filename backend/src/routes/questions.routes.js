const express = require('express');
const router = express.Router();
const questionController = require('../controllers/questionController');
const { authenticateUser } = require('../middleware/auth');
const { requireTeacher } = require('../middleware/roleCheck');
const { uploadAudio, uploadNotation } = require('../middleware/upload');

// All routes require authentication
router.use(authenticateUser);

// Teacher routes
router.post('/', requireTeacher, questionController.createQuestion);
router.post('/upload/audio', requireTeacher, uploadAudio, questionController.uploadAudio);
router.post('/upload/notation', requireTeacher, uploadNotation, questionController.uploadNotation);
router.get('/section/:sectionId', requireTeacher, questionController.getSectionQuestions);
router.put('/:id', requireTeacher, questionController.updateQuestion);
router.delete('/:id', requireTeacher, questionController.deleteQuestion);
router.post('/section/:sectionId/reorder', requireTeacher, questionController.reorderQuestions);

// Shared routes
router.get('/:id', questionController.getQuestion);

module.exports = router;

