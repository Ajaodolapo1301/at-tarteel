
const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema({

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
  teacherId: {
    type: String,
    required: true,
    unique: true
  },
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', ]
  },
  coursesTeaching: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  }],
  maxCourseLoad: {
    type: Number,
    default: 4
  },
  joiningDate: {
    type: Date,
    default: Date.now
  },

  status: {
    type: String,
    enum: ['Active', 'Inactive', 'On Leave'],
    default: 'Active'
  }



}, { timestamps: true });


// teacherSchema.pre('save', function(next) {
//   if (!this.teacherId) {
//     this.teacherId = `TCH${Date.now().toString().slice(-6)}`;
//   }
//   next();
// });

module.exports = mongoose.model('Teacher', teacherSchema);