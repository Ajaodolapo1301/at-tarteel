
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const studentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  studentId: {
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
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  dateOfBirth: {
    type: Date,

  },
  gender: {
    type: String,
    enum: ['Male', 'Female',]
  },
  registrationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  registrationDate: {
    type: Date,
    default: Date.now
  },
  weeklyAvailability: {
    type: [{
      day: {
        type: String,
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        required: true
      },
      startTime: {
        type: String, // Format: "HH:MM" (e.g., "14:30")
        required: true,
        validate: {
          validator: function(v) {
            return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
          },
          message: 'Invalid time format (use HH:MM)'
        }
      },
      endTime: {
        type: String,
        required: true,
        validate: {
          validator: function(v) {
            const start = new Date(`1970-01-01T${this.startTime}:00`);
            const end = new Date(`1970-01-01T${v}:00`);
            return (end - start) === 45*60*1000; // Exactly 45 minutes
          },
          message: 'Session must be exactly 45 minutes'
        }
      }
    }],
    // validate: {
    //   validator: function(v) {
    //     return v.length === 2; 
    //   },
    //   message: 'Must select exactly two 45-minute sessions per week'
    // }
  },
  availabilityRequest: {
    sessions: [{
      day: { type: String, enum: ['Monday','Tuesday','Wednesday','Thursday','Friday'] },
      startTime: String, // Format: "HH:MM"
      endTime: String
    }],
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    submittedAt: Date,
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    reviewedAt: Date,
    feedback: String
  },
  enrollmentDate: {
    type: Date,
    default: Date.now
  },
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class'
  },
  parentGuardian: [{
    name: String,
    relationship: String,
    contact: String,
    email: String
  }],
  courses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  }],
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Suspended', 'Graduated'],
    default: 'Active'
  }
}, { timestamps: true });


studentSchema.pre('save', function(next) {
  if (!this.studentId) {
    this.studentId = `STU${Date.now().toString().slice(-6)}`;
  }
  next();
});



module.exports = mongoose.model('Student', studentSchema);