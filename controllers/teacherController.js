

const Teacher = require('../models/teacher');

// @desc    Get all teachers
// @route   GET /api/teachers
// @access  Public
exports.getTeachers = async (req, res) => {
  try {
    const teachers = await Teacher.find().populate('subjects');
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
    const teacher = await Teacher.findById(req.params.id).populate('subjects');

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
    const teacher = await Teacher.create(req.body);
    res.status(201).json({
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
      data: {}
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};