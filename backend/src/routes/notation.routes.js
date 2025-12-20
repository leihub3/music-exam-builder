const express = require('express');
const router = express.Router();
const notationController = require('../controllers/notationController');
const { authenticateUser } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateUser);

// Evaluation routes
router.post('/evaluate-transposition', notationController.evaluateTransposition);

module.exports = router;



