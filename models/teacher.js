
const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema({
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
  dateOfBirth: Date,
  gender: {
    type: String,
    enum: ['Male', 'Female', ]
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
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

module.exports = mongoose.model('Teacher', teacherSchema);