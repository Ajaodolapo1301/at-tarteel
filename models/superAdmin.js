
const mongoose = require('mongoose');

const superAdminSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },

  masterKey: {
    type: String,
    required: true,
    select: false
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active'
  }
}, { timestamps: true });

module.exports = mongoose.model('SuperAdmin', superAdminSchema);