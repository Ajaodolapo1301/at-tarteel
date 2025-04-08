


const Student = require('../models/student');
const sendEmail = require('../utils/sendEmail');
const ErrorResponse = require('../utils/errorResponse');
// @desc    Get all students
// @route   GET /api/students
// @access  Public
exports.getStudents = async (req, res) => {
  try {
    const students = await Student.find()
    .populate({
      path: 'courses',
      select: 'code title _id'
  
    });
    res.status(200).json({
      success: true,
      count: students.length,
      data: students
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Get single student
// @route   GET /api/students/:id
// @access  Public
exports.getStudent = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id);
    
    if (!student) {
      return next(new ErrorResponse(`Student not found with id of ${req.params.id}`, 404));
    }

    res.status(200).json({
      success: true,
      data: student
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create student
// @route   POST /api/students
// @access  Private
exports.createStudent = async (req, res) => {
  try {
    const student = await Student.create(req.body);
    
    res.status(201).json({
      success: true,
      data: student
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        error: messages
      });
    } else {
      return res.status(500).json({
        success: false,
        error: 'Server Error'
      });
    }
  }
};

// @desc    Update student
// @route   PUT /api/students/:id
// @access  Private
exports.updateStudent = async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'No student found'
      });
    }

    res.status(200).json({
      success: true,
      data: student
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        error: messages
      });
    } else {
      return res.status(500).json({
        success: false,
        error: 'Server Error'
      });
    }
  }
};

// @desc    Delete student
// @route   DELETE /api/students/:id
// @access  Private
exports.deleteStudent = async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'No student found'
      });
    }

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};





// @desc    Approve student registration (Admin only)
// @route   PUT /api/students/:id/approve
// @access  Private/Admin
exports.approveRegistration = async (req, res, next) => {
  try {
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { registrationStatus: 'approved', status: 'Active' },
      { new: true, runValidators: true }
    );

    if (!student) {
      return next(new ErrorResponse('Student not found', 404));
    }

    // Send approval email
    const message = `Dear ${student.firstName},\n\nYour registration has been approved!\n\nStudent ID: ${student.studentId}\n\nYou can now login to the student portal using your credentials.`;
    
    await sendEmail({
      email: student.email,
      subject: 'Registration Approved',
      message
    });

    res.status(200).json({
      success: true,
      data: student
    });
  } catch (err) {
    next(err);
  }
};


// controllers/studentController.js
exports.getMyAvailability = async (req, res, next) => {
  try {
    const student = await Student.findOne({ user: req.user.id })
      .select('weeklyAvailability availabilityRequest');
    
    res.status(200).json({
      success: true,
      data: {
        activeSlots: student.weeklyAvailability,
        lastRequestStatus: student.availabilityRequest?.status
      }
    });
  } catch (err) {
    next(err);
  }
};