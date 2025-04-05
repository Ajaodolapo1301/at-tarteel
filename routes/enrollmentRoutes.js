
const express = require('express');
const {
  enrollStudent,
  getMyCourses,
  dropCourse
} = require('../controllers/enrollmentController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Protect all routes
router.use(protect);

// Student-only routes
router.use(authorize('student'));

router.post('/', enrollStudent);
router.get('/me/courses', getMyCourses);
router.delete('/:courseId', dropCourse);

module.exports = router;