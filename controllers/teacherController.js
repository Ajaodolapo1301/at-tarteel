
const Teacher = require('../models/teacher');
const User = require('../models/user');
// @desc    Get all teachers
// @route   GET /api/teachers
// @access  Public
exports.getTeachers = async (req, res) => {
  try {
    const teachers = await Teacher.find().populate(
      "user",
      "email role _id"
    )  ;
    res.status(200).json({
      success: true,
      count: teachers.length,
      data: teachers
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Get single teacher
// @route   GET /api/teachers/:id
// @access  Public
exports.getTeacher = async (req, res) => {

  try {
    const teacher = await Teacher.findById(req.params.id);

    if (!teacher) {
      return res.status(404).json({
        success: false,
        error: 'No teacher found'
      });
    }

    res.status(200).json({
      success: true,
      data: teacher
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Create teacher
// @route   POST /api/teachers
// @access  Private
exports.createTeacher = async (req, res) => {

  try {
    const { firstName, lastName, email, } = req.body;

    const existingTeacher = await Teacher.findOne({ email: req.body.email });
console.log(existingTeacher);
    if (existingTeacher) {
      return res.status(400).json({
      success: false,
      error: 'Teacher with this email already exists'
      });
    }

    const user = await User.create({
      email: req.body.email,
      password: firstName,
      role: 'teacher',
    });
console.log(user);
    const teacher = await Teacher.create({
      firstName,
      lastName,
      email,
      user: user._id,
      teacherId: `TCH${Date.now().toString().slice(-6)}`
    });
    res.status(201).json({
      success: true,
      data: teacher
    });
  } catch (err) {
    console.log(err);
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

// @desc    Update teacher
// @route   PUT /api/teachers/:id
// @access  Private
exports.updateTeacher = async (req, res) => {
  try {
    const teacher = await Teacher.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        error: 'No teacher found'
      });
    }

    res.status(200).json({
      success: true,
      data: teacher
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

// @desc    Delete teacher
// @route   DELETE /api/teachers/:id
// @access  Private
exports.deleteTeacher = async (req, res) => {
  try {
    const teacher = await Teacher.findByIdAndDelete(req.params.id);

    if (!teacher) {
      return res.status(404).json({
        success: false,
        error: 'No teacher found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Teacher deleted successfully',
      data: {}
    });
  } catch (err) {
    res.status(500).json({
      success: false,
    
      error: 'Server Error'
    });
  }
};