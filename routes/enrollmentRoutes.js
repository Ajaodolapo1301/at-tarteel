
const express = require('express');
const {
  enrollStudent,
  getMyCourses,
  dropCourse,
  setTeacherCourses,
  getTeacherCourses
} = require('../controllers/enrollmentController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Protect all routes
router.use(protect);

// Student-only routes
// router.use(authorize('student'));

router.post('/',  protect, authorize('student'), enrollStudent);
router.get('/me/courses',  protect, authorize('student'), getMyCourses);
router.delete('/:courseId',  protect, authorize('student'), dropCourse);



// router.put('/:teacherId/courses', 
//   protect, 
//   authorize('admin'), 
//   setTeacherCourses
// );


router.put('/teachers/courses', 
   protect,
    authorize('teacher'), 
 setTeacherCourses);

// Public access to view teacher's courses
router.get('/:teacherId/courses', getTeacherCourses);

module.exports = router;