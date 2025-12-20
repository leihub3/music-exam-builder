const express = require('express');
const router = express.Router();
const examController = require('../controllers/examController');
const { authenticateUser } = require('../middleware/auth');
const { requireTeacher } = require('../middleware/roleCheck');

// All routes require authentication
router.use(authenticateUser);

// Student routes
router.get('/student/assigned', examController.getStudentExams);

// Teacher routes (require teacher role)
router.post('/', requireTeacher, examController.createExam);
router.get('/teacher', requireTeacher, examController.getTeacherExams);
router.get('/institution/:institutionId', requireTeacher, examController.getInstitutionExams);
router.get('/students', requireTeacher, examController.getStudents);
router.put('/:id', requireTeacher, examController.updateExam);
router.delete('/:id', requireTeacher, examController.deleteExam);
router.post('/:id/publish', requireTeacher, examController.publishExam);
router.post('/:id/assign', requireTeacher, examController.assignExam);

// Section routes
router.get('/sections/:sectionId', requireTeacher, examController.getSection);
router.post('/:examId/sections', requireTeacher, examController.createSection);
router.put('/sections/:sectionId', requireTeacher, examController.updateSection);
router.delete('/sections/:sectionId', requireTeacher, examController.deleteSection);

// Shared routes (anyone can get exam by ID if they have access)
router.get('/:id', examController.getExam);

module.exports = router;

