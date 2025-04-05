// routes/studentRoutes.js
const express = require('express');
const {
  // registerStudent,
  getStudents,
  getStudent,
  updateStudent,
  deleteStudent,
  approveRegistration
} = require('../controllers/studentController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Public routes
// router.post('/register', registerStudent);

// Protected routes
router.use(protect);

router.get('/', authorize('admin', 'teacher'), getStudents);
router.get('/:id', authorize('admin', 'teacher'), getStudent);
router.put('/:id', authorize('admin'), updateStudent);
router.delete('/:id', authorize('admin'), deleteStudent);
router.put('/:id/approve', authorize('admin'), approveRegistration);

module.exports = router;