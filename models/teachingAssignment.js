
const mongoose = require('mongoose');
const teachingAssignmentSchema = new mongoose.Schema({
    student: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Student',
      required: true 
    },
    teacher: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Teacher',
      required: true 
    },
    schedule: [{
      day: { 
        type: String, 
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
        required: true
      },
      startTime: { type: String, required: true },
      endTime: { type: String, required: true }
    }],
    assignedBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User',
      required: true 
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'cancelled'],
      default: 'active'
    }
  }, { timestamps: true });