// models/Course.js
const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  code: {
    type: String,
    required: true,
    unique: true
  },
  description: String,

  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher'
  },

  enrolledStudents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  }],

}, { timestamps: true });

module.exports = mongoose.model('Course', courseSchema);