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

  teachers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher'
  }],

  enrolledStudents: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student'
    },
    enrollmentDate: {
      type: Date,
      default: Date.now
    },
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    completed: {
      type: Boolean,
      default: false
    },
    lastAccessed: Date
  }],

}, { timestamps: true });



// Method to update student progress
courseSchema.methods.updateStudentProgress = async function(studentId, progress) {
  console.log('Updating progress for student:', studentId, 'with progress:', progress);
  const enrollment = this.enrolledStudents.find(e => e.student.equals(studentId));
  
  if (!enrollment) {
    throw new Error('Student is not enrolled in this course');
  }

  enrollment.progress = Math.min(100, Math.max(0, progress));
  enrollment.lastAccessed = new Date();
  
  if (progress >= 100) {
    enrollment.completed = true;
  }

  await this.save();
  return enrollment;
};
courseSchema.virtual('totalEnrollments').get(function() {
  return this.enrolledStudents.length;
});

module.exports = mongoose.model('Course', courseSchema);