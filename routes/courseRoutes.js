// routes/courseRoutes.js
const express = require('express');
const {
  getCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  searchCourses,
  updateProgressCourse
} = require('../controllers/courseController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.get('/', getCourses);
router.get('/:id', getCourse);
router.get('/search', searchCourses);

// Protected routes (require authentication)
router.use(protect);

// Admin-only routes
router.use(authorize('admin', 'superadmin'));

router.post('/', createCourse);
router.put('/:id', updateCourse);
router.delete('/:id', deleteCourse);
router.put('/:courseId/students/:studentId/progress', updateProgressCourse);

module.exports = router;