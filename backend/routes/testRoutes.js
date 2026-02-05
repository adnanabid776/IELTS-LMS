const express = require('express');
const router = express.Router();
const testController = require('../controllers/testController');
const authMiddleware = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');


//All routes require authentication

router.use(authMiddleware);

//create test (teacher/admin only)

router.post('/', roleCheck('admin', 'teacher') , testController.createTest);

//get all tests
router.get('/', testController.getAllTests);

//get tests by module
router.get('/module/:module', testController.getTestsByModule);

//get single test
router.get('/:id', testController.getTestById);

//updating test
router.put('/:id', roleCheck('admin', 'teacher'), testController.updateTest);

//delete test
router.delete('/:id', roleCheck('admin'), testController.deleteTest);

module.exports = router;