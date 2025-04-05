
const Course = require('../models/course');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all courses
// @route   GET /api/courses
// @access  Public
exports.getCourses = async (req, res, next) => {
  try {
    // Filtering
    let query;
    const reqQuery = { ...req.query };
    
    // Fields to exclude
    const removeFields = ['select', 'sort', 'page', 'limit'];
    removeFields.forEach(param => delete reqQuery[param]);
    
    // Advanced filtering
    let queryStr = JSON.stringify(reqQuery);
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);
    
    query = Course.find(JSON.parse(queryStr))
    //   .populate('teacher', 'firstName lastName email')
    //   .populate('prerequisites', 'courseCode title');
    
    // Select fields
    if (req.query.select) {
      const fields = req.query.select.split(',').join(' ');
      query = query.select(fields);
    }
    
    // Sort
    if (req.query.sort) {
      const sortBy = req.query.sort.split(',').join(' ');
      query = query.sort(sortBy);
    } else {
      query = query.sort('-createdAt');
    }
    
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 25;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Course.countDocuments();
    
    query = query.skip(startIndex).limit(limit);
    
    // Execute query
    const courses = await query;
    
    // Pagination result
    const pagination = {};
    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit
      };
    }
    
    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit
      };
    }
    
    res.status(200).json({
      success: true,
      count: courses.length,
      pagination,
      data: courses
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single course
// @route   GET /api/courses/:id
// @access  Public
exports.getCourse = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id)
      // .populate('teacher', 'firstName lastName email')
      // .populate('prerequisites', 'courseCode title');
    
    if (!course) {
      return next(new ErrorResponse(`Course not found with id of ${req.params.id}`, 404));
    }
    
    res.status(200).json({
      success: true,
      data: course
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create new course
// @route   POST /api/courses
// @access  Private/Admin
exports.createCourse = async (req, res, next) => {
  try {
    // Check if course code already exists
    console.log(req.body);
    console.log(req.body.code);
    const existingCourse = await Course.findOne({ courseCode: req.body.code});
    if (existingCourse) {
      return next(new ErrorResponse(`Course with code ${req.body.courseCode} already exists`, 400));
    }
    
    const course = await Course.create(req.body);
    
    res.status(201).json({
      success: true,
      data: course
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update course
// @route   PUT /api/courses/:id
// @access  Private/Admin
exports.updateCourse = async (req, res, next) => {
  try {
    let course = await Course.findById(req.params.id);
    
    if (!course) {
      return next(new ErrorResponse(`Course not found with id of ${req.params.id}`, 404));
    }
    
    if (req.body.courseCode && req.body.courseCode !== course.courseCode) {
      const existingCourse = await Course.findOne({ courseCode: req.body.courseCode });
      if (existingCourse) {
        return next(new ErrorResponse(`Course with code ${req.body.courseCode} already exists`, 400));
      }
    }
    
    course = await Course.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    
    res.status(200).json({
      success: true,
      data: course
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete course
// @route   DELETE /api/courses/:id
// @access  Private/Admin
exports.deleteCourse = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return next(new ErrorResponse(`Course not found with id of ${req.params.id}`, 404));
    }
    
    await course.deleteOne();
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Search courses
// @route   GET /api/courses/search
// @access  Public
exports.searchCourses = async (req, res, next) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return next(new ErrorResponse('Please provide a search query', 400));
    }
    
    const courses = await Course.find(
      { $text: { $search: q } },
      { score: { $meta: 'textScore' } }
    ).sort({ score: { $meta: 'textScore' } });
    
    res.status(200).json({
      success: true,
      count: courses.length,
      data: courses
    });
  } catch (err) {
    next(err);
  }
};