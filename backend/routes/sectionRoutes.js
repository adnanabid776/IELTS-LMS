const express = require('express');
const router = express.Router();
const sectionController = require('../controllers/sectionController');
const authMiddleware = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');


//all routes' authentication
router.use(authMiddleware);

//create section
router.post('/', roleCheck('admin', 'teacher'), sectionController.createSection);

//Get sections by test ID
router.get('/test/:testId', sectionController.getSectionsByTestId);

//get single section
router.get('/:id', sectionController.getSectionById);

//updating section
router.put('/:id', roleCheck('admin', 'teacher'), sectionController.updateSection);

//delete section
router.delete('/:id', roleCheck('admin','teacher'), sectionController.deleteSection);


module.exports = router;