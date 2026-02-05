const express = require('express');
const router = express.Router();
const questionController = require('../controllers/questionController')
const authMiddleware= require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck')

//for all routes authentication
router.use(authMiddleware);

// ==========================================
// ADMIN ROUTES - ADD THESE
// ==========================================

// Get all questions with filters (admin only)
router.get('/admin/all', roleCheck('admin'), questionController.getAllQuestions);

// Get question statistics (admin only)
router.get('/admin/stats', roleCheck('admin'), questionController.getQuestionStats);

// Get sections for dropdown (admin/teacher)
router.get('/admin/sections', roleCheck('admin', 'teacher'), questionController.getSectionsForDropdown);

//creating quesiton 
router.post('/',roleCheck('admin', 'teacher'), questionController.createQuestion);

//bulk create questions
router.post('/bulk', roleCheck('admin', 'teacher'), questionController.bulkCreateQuestions);

//get questions by sectionID
router.get('/section/:sectionId', questionController.getQuestionsBySectionId);

//get single quesiton
router.get('/:id', questionController.getQuestionById);

//update question
router.put('/:id',roleCheck('admin', 'teacher'), questionController.updateQuestion);

//delete question
router.delete('/:id', roleCheck('admin') , questionController.deleteQuestion);


module.exports = router;