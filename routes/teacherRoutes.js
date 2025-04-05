const express = require('express');
const {
  getTeachers,
  getTeacher,
  createTeacher,
  updateTeacher,
  deleteTeacher
} = require('../controllers/teacherController');

const router = express.Router();

router.route('/')
  .get(getTeachers)
  .post(createTeacher);

router.route('/:id')
  .get(getTeacher)
  .put(updateTeacher)
  .delete(deleteTeacher);

module.exports = router;