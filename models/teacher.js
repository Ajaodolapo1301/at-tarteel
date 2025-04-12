
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

  

  courses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
 
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
  },
 availability: {
    type: [{
      dayOfWeek: {
        type: String,
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
        required: true
      },
      timeSlots: {
        type: [{
          startTime: {
            type: String,
            required: true,
            validate: {
              validator: function(v) {
                return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
              },
              message: props => `${props.value} is not a valid time (HH:MM 24-hour format)`
            }
          },
          endTime: {
            type: String,
            required: true,
            validate: {
              validator: function(v) {
                return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
              },
              message: props => `${props.value} is not a valid time (HH:MM 24-hour format)`
            }
          },
          isAvailable: {
            type: Boolean,
            default: true
          },
          // Optional metadata
          label: String,  // e.g., "Office Hours", "Class Time"
          maxBookings: Number
        }],
        validate: {
          validator: function(slots) {
            // Validate no overlapping slots
            const timeSlots = slots.map(s => ({
              start: new Date(`1970-01-01T${s.startTime}:00`),
              end: new Date(`1970-01-01T${s.endTime}:00`)
            }));
            
            for (let i = 0; i < timeSlots.length; i++) {
              for (let j = i + 1; j < timeSlots.length; j++) {
                if (timeSlots[i].start < timeSlots[j].end && timeSlots[i].end > timeSlots[j].start) {
                  return false;
                }
              }
            }
            return true;
          },
          message: 'Time slots cannot overlap'
        }
      }
    }],
    validate: {
      validator: function(availability) {
        // Check for duplicate days
        const days = availability.map(a => a.dayOfWeek.toLowerCase());
        return new Set(days).size === days.length;
      },
      message: 'Duplicate days in availability'
    }
  }


}, { timestamps: true });


// teacherSchema.pre('save', function(next) {
//   if (!this.teacherId) {
//     this.teacherId = `TCH${Date.now().toString().slice(-6)}`;
//   }
//   next();
// });

module.exports = mongoose.model('Teacher', teacherSchema);