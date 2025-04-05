
const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  // pendingApprovals: [{
  //   student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  //   requestDate: Date
  // }],
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  permissions: {
    studentManagement: Boolean,
    teacherManagement: Boolean,
    staffManagement: Boolean,
    courseManagement: Boolean,
    classManagement: Boolean,
    financialManagement: Boolean,
    systemSettings: Boolean
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active'
  }
}, { timestamps: true });

module.exports = mongoose.model('Admin', adminSchema);