// controllers/enrollmentController.js
const Enrollment = require('../models/enrollment');
const Course = require('../models/course');
const Student = require('../models/student');
const ErrorResponse = require('../utils/errorResponse');
const mongoose = require('mongoose');
const Teacher = require('../models/teacher');


// @desc    Enroll student in course
// @route   POST /api/enrollments
// @access  Private (Student)
// exports.enrollStudent = async (req, res, next) => {
//   const session = await mongoose.startSession();
//   session.startTransaction();
  
//   try {
//     const { courseId } = req.body;
//     const userId = req.user.id;

//     // 1. Get student profile
//     const student = await Student.findOne({ user: userId }).session(session);
//     if (!student) {
//       await session.abortTransaction();
//       return next(new ErrorResponse('Student profile not found', 404));
//     }

//     // 2. Check current enrollments (max 2 courses)
//     const activeEnrollments = await Enrollment.countDocuments({
//       student: student._id,
//       status: 'active'
//     }).session(session);
    
//     if (activeEnrollments >= 2) {
//       await session.abortTransaction();
//       return next(new ErrorResponse('Maximum enrollment limit reached (2 courses)', 400));
//     }

//     // 3. Check if course exists and has capacity
//     const course = await Course.findById(courseId).session(session);
//     if (!course) {
//       await session.abortTransaction();
//       return next(new ErrorResponse('Course not found', 404));
//     }

//     if (course.enrolledStudents.length >= course.maxStudents) {
//       await session.abortTransaction();
//       return next(new ErrorResponse('Course has reached maximum capacity', 400));
//     }

//     // 4. Check if already enrolled
//     const existingEnrollment = await Enrollment.findOne({
//       student: student._id,
//       course: courseId
//     }).session(session);
    
//     if (existingEnrollment) {
//       await session.abortTransaction();
//       return next(new ErrorResponse('Already enrolled in this course', 400));
//     }

//     // 5. Create enrollment record
//     const enrollment = await Enrollment.create([{
//       student: student._id,
//       course: courseId
//     }], { session });

//     // 6. Add to course's enrolled students
//     course.enrolledStudents.push(student._id);
//     await course.save({ session });

//     // 7. Add to student's courses
//     student.courses.push(courseId);
//     await student.save({ session });

//     await session.commitTransaction();
    
//     res.status(201).json({
//       success: true,
//       data: enrollment[0]
//     });

//   } catch (err) {
//     await session.abortTransaction();
//     next(err);
//   } finally {
//     session.endSession();
//   }
// };


const useTransactions = process.env.NODE_ENV === 'production';

exports.enrollStudent = async (req, res, next) => {
  const session = useTransactions ? await mongoose.startSession() : null;
  if (session) session.startTransaction();
  
  try {
    const { courseId } = req.body;

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      throw new ErrorResponse('Course not found', 404);
    }
    const userId = req.user.id;

    // Find student (with session if using transactions)
    const student = await Student.findOne({ user: userId })
      .session(useTransactions ? session : null);
    console.log(student);
    // Check enrollment limit
    const activeEnrollments = await Enrollment.countDocuments({
      student: student._id,
      status: 'active'
    }).session(useTransactions ? session : null);

    if (activeEnrollments >= 2) {
      throw new ErrorResponse('Maximum enrollment limit reached (2 courses)', 400);
    }

    // Create enrollment
    const enrollment = await Enrollment.create(
      useTransactions 
        ? [{ student: student._id, course: courseId }, { session }]
        : { student: student._id, course: courseId }
    );

    // Update course and student
    await Course.findByIdAndUpdate(
      courseId,
      { $push: { enrolledStudents: student._id } },
      useTransactions ? { session } : {}
    );

    await Student.findByIdAndUpdate(
      student._id,
      { $push: { courses: courseId } },
      useTransactions ? { session } : {}
    );

    if (useTransactions) await session.commitTransaction();
    res.status(201).json({ success: true, data: useTransactions ? enrollment[0] : enrollment });

  } catch (err) {
    if (useTransactions) {
      await session.abortTransaction();
    }
    next(err);
  } finally {
    if (useTransactions) session.endSession();
  }
};
// @desc    Get student's enrolled courses
// @route   GET /api/students/me/courses
// @access  Private (Student)
exports.getMyCourses = async (req, res, next) => {
  try {
    const student = await Student.findOne({ user: req.user.id })
      .populate({
        path: 'courses',
        select: 'code title, _id',
      });
    
    if (!student) {
      return next(new ErrorResponse('Student profile not found', 404));
    }

    res.status(200).json({
      success: true,
      count: student.courses.length,
      data: student.courses
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Drop a course
// @route   DELETE /api/enrollments/:courseId
// @access  Private (Student)
exports.dropCourse = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const student = await Student.findOne({ user: req.user.id }).session(session);
    if (!student) {
      await session.abortTransaction();
      return next(new ErrorResponse('Student profile not found', 404));
    }

    // 1. Update enrollment status
    const enrollment = await Enrollment.findOneAndUpdate(
      {
        student: student._id,
        course: req.params.courseId,
        status: 'active'
      },
      { status: 'dropped' },
      { new: true, session }
    );

    if (!enrollment) {
      await session.abortTransaction();
      return next(new ErrorResponse('Active enrollment not found', 404));
    }

    // 2. Remove from course's enrolled students
    await Course.findByIdAndUpdate(
      req.params.courseId,
      { $pull: { enrolledStudents: student._id } },
      { session }
    );

    // 3. Remove from student's courses
    await Student.findByIdAndUpdate(
      student._id,
      { $pull: { courses: req.params.courseId } },
      { session }
    );

    await session.commitTransaction();
    
    res.status(200).json({
      success: true,
      data: {}
    });

  } catch (err) {
    await session.abortTransaction();
    next(err);
  } finally {
    session.endSession();
  }
};



// @desc    Set teacher's courses
// @route   PUT /api/teachers/courses
// @access  Private (Admin or Teacher)
exports.setTeacherCourses = async (req, res, next) => {
  try {
    console.log(req.body);
    const { courseIds } = req.body;
    const teacherId = req.params.teacherId || req.user.id;

    // Validate input
    if (!courseIds || !Array.isArray(courseIds)) {
      return next(new ErrorResponse('Please provide an array of course IDs', 400));
    }
// console.log(courseIds);
    // Check if courses exist
    const existingCourses = await Course.find({ _id: { $in: courseIds } });
    console.log(`existingCourses`, existingCourses);
    if (existingCourses.length !== courseIds.length) {
      const missingCourses = courseIds.filter(
        id => !existingCourses.some(c => c._id.toString() === id)
      );
      return next(new ErrorResponse(
        `These courses don't exist: ${missingCourses.join(', ')}`, 
        404
      ));
    }

    // Find teacher
    const teacher = await Teacher.findOne({ user: teacherId });
    if (!teacher) {
      return next(new ErrorResponse('Teacher not found', 404));
    }

    // // Check if teacher is qualified for these courses
    // const unqualifiedCourses = [];
    // for (const course of existingCourses) {
    //   if (course.requiredQualifications && teacher.qualifications) {
    //     const hasQualification = course.requiredQualifications.some(q =>
    //       teacher.qualifications.includes(q)
    //     );
    //     if (!hasQualification) {
    //       unqualifiedCourses.push(course.name);
    //     }
    //   }
    // }

    // if (unqualifiedCourses.length > 0) {
    //   return next(new ErrorResponse(
    //     `Teacher lacks qualifications for: ${unqualifiedCourses.join(', ')}`,
    //     403
    //   ));
    // }

    // Update teacher's courses
    teacher.courses = courseIds;
    await teacher.save();

    // Update courses with this teacher
    await Course.updateMany(
      { _id: { $in: courseIds } },
      { $addToSet: { teachers: teacher._id } }
    );

    // Remove teacher from courses they're no longer assigned to
    await Course.updateMany(
      { _id: { $nin: courseIds }, teachers: teacher._id },
      { $pull: { teachers: teacher._id } }
    );

    res.status(200).json({
      success: true,
      data: teacher.courses
    });

  } catch (err) {
    console.error(err);
    next(err);
  }
};

// @desc    Get teacher's courses
// @route   GET /api/teachers/:teacherId/courses
// @access  Public
exports.getTeacherCourses = async (req, res, next) => {
  try {
    const teacher = await Teacher.findOne({ user: req.params.teacherId })
    .populate({
      path: 'courses',
      select: '-__v -createdAt -updatedAt',
      populate: [
        {
          path: 'subject',
          select: 'name code department'
        },
        {
          path: 'schedule',
          select: 'dayOfWeek startTime endTime room'
        }
      ]
    });
      // .populate({
      //   path: 'courses',
      //   select: 'code, title, _id',
      // });

    if (!teacher) {
      return next(new ErrorResponse('Teacher not found', 404));
    }

    res.status(200).json({
      success: true,
      count: teacher.courses.length,
      data: teacher.courses
    });
  } catch (err) {
    next(err);
  }
};