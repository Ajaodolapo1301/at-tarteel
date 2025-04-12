// controllers/availabilityController.js
const Student = require('../models/student');
const ErrorResponse = require('../utils/errorResponse');
const Teacher = require('../models/teacher');



exports.submitAvailability = async (req, res, next) => {
    try {
      const { sessions } = req.body;
      
      if (!sessions || sessions.length !== 2 || 
          sessions.some(s => {
            const start = new Date(`1970-01-01T${s.startTime}:00`);
            const end = new Date(`1970-01-01T${s.endTime}:00`);
            return (end - start) !== 45*60*1000;
          })) {
        return next(new ErrorResponse('Exactly two 45-minute sessions required', 400));
      }
  
      const student = await Student.findOneAndUpdate(
        { user: req.user.id },
        { 
          availabilityRequest: {
            sessions,
            status: 'pending',
            submittedAt: new Date()
          }
        },
        { new: true }
      );
  
     
      await Admin.updateMany(
        {},
        { $push: { pendingApprovals: { student: student._id, requestDate: new Date() } } }
      );
  
      res.status(200).json({
        success: true,
        data: student.availabilityRequest
      });
    } catch (err) {
      next(err);
    }
  };


  exports.reviewAvailability = async (req, res, next) => {
      const session = await mongoose.startSession();
      session.startTransaction();
      
      try {
        const { studentId, status, feedback } = req.body;
        
        // 1. Update student request
        const student = await Student.findByIdAndUpdate(
          studentId,
          { 
            'availabilityRequest.status': status,
            'availabilityRequest.reviewedBy': req.user.id,
            'availabilityRequest.reviewedAt': new Date(),
            'availabilityRequest.feedback': feedback,
            ...(status === 'approved' && { 
              weeklyAvailability: student.availabilityRequest.sessions 
            })
          },
          { new: true, session }
        );
  
  
        await Admin.updateMany(
          { 'pendingApprovals.student': studentId },
          { $pull: { pendingApprovals: { student: studentId } } },
          { session }
        );
    
        if (process.env.NODE_ENV === 'production') {
          await sendNotificationEmail(
            student.user.email,
            `Your availability request has been ${status}`,
            `Admin feedback: ${feedback || 'No feedback provided'}`
          );
        }
    
        await session.commitTransaction();
        
        res.status(200).json({
          success: true,
          data: student.availabilityRequest
        });
      } catch (err) {
        await session.abortTransaction();
        next(err);
      } finally {
        session.endSession();
      }
    };
  
  
  
  exports.rejectAvailability = async (req, res, next) => {
      const session = await mongoose.startSession();
      session.startTransaction();
    
      try {
        const { studentId, reason } = req.body;
    
        if (!reason || reason.length < 10) {
          await session.abortTransaction();
          return next(new ErrorResponse('Rejection reason must be at least 10 characters', 400));
        }
    
        // 1. Update student's request status
        const student = await Student.findByIdAndUpdate(
          studentId,
          {
            'availabilityRequest.status': 'rejected',
            'availabilityRequest.reviewedBy': req.user.id,
            'availabilityRequest.reviewedAt': new Date(),
            'availabilityRequest.feedback': reason
          },
          { new: true, session }
        );
    
        if (!student) {
          await session.abortTransaction();
          return next(new ErrorResponse('Student not found', 404));
        }
    
  
        await Admin.updateMany(
          {},
          { $pull: { pendingApprovals: { student: studentId } } },
          { session }
        );
    
    
      //   const user = await User.findById(student.user).session(session);
      //   await sendRejectionEmail(user.email, reason);
    
        await session.commitTransaction();
    
        res.status(200).json({
          success: true,
          data: {
            message: 'Availability request rejected',
            studentId: student._id,
            reason
          }
        });
    
      } catch (err) {
        await session.abortTransaction();
        next(err);
      } finally {
        session.endSession();
      }
    };
    
  
  
  // controllers/adminController.js
  exports.approveAvailability = async (req, res, next) => {
      const session = await mongoose.startSession();
      session.startTransaction();
    
      try {
        const { studentId } = req.body;
    
        // 1. Get the current request
        const student = await Student.findById(studentId).session(session);
        if (!student || !student.availabilityRequest) {
          await session.abortTransaction();
          return next(new ErrorResponse('No pending availability request found', 404));
        }
    
        // 2. Update student profile with approved slots
        student.weeklyAvailability = student.availabilityRequest.sessions;
        student.availabilityRequest.status = 'approved';
        student.availabilityRequest.reviewedBy = req.user.id;
        student.availabilityRequest.reviewedAt = new Date();
    
        await student.save({ session });
    
      
        await Admin.updateMany(
          {},
          { $pull: { pendingApprovals: { student: studentId } } },
          { session }
        );
    
        // 4. Send approval notification
      //   await sendApprovalEmail(student.user.email, student.weeklyAvailability);
    
        await session.commitTransaction();
    
        res.status(200).json({
          success: true,
          data: {
            message: 'Availability approved',
            studentId: student._id,
            approvedSlots: student.weeklyAvailability
          }
        });
    
      } catch (err) {
        await session.abortTransaction();
        next(err);
      } finally {
        session.endSession();
      }
    };
    // controllers/adminController.js
    exports.getPendingRequests = async (req, res, next) => {
    try {
      // 1. Get all students with pending availability requests
      const pendingRequests = await Student.aggregate([
        {
          $match: {
            'availabilityRequest.status': 'pending'
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'user',
            foreignField: '_id',
            as: 'userDetails'
          }
        },
        {
          $unwind: '$userDetails'
        },
        {
          $lookup: {
            from: 'enrollments',
            localField: '_id',
            foreignField: 'student',
            as: 'courses'
          }
        },
        {
          $lookup: {
            from: 'courses',
            localField: 'enrollments.course',
            foreignField: '_id',
            as: 'courseDetails'
          }
        },
        {
          $project: {
            'userDetails.password': 0,
            'userDetails.__v': 0,
            'courses._id': 0
          }
        },
        {
          $sort: {
            'availabilityRequest.submittedAt': 1 
          }
        }
      ]);
  
      // 2. Format the response
      console.log(pendingRequests.forEach(r => console.log(r.courses.map(c => c))));
    pendingRequests.forEach(r => {
        console.log(r.courses.map(c => c));
      }
      );
    
      
      // 3. Check for conflicts
      const formattedRequests = pendingRequests.map(request => ({
        studentId: request._id,
        studentName: `${request.firstName} ${request.lastName}`,
        studentEmail: request.userDetails.email,
        requestedSlots: request.availabilityRequest.sessions,
        submittedAt: request.availabilityRequest.submittedAt,
        currentCourses: request.courses.map(c => ({
          code: c.code,
          title: c.title
        })),
        hasConflicts: checkForConflicts(request) 
      }));
  
      res.status(200).json({
        success: true,
        count: formattedRequests.length,
        data: formattedRequests
      });
  
    } catch (err) {
      next(err);
    }
  };
  
  // Optional conflict checker helper
  const checkForConflicts = (student) => {
    const requestedSlots = student.availabilityRequest.sessions;
    const currentSlots = student.weeklyAvailability;
    const courseTimes = student.courses.map(c => c.schedule);
    
    // Implementation depends on your scheduling logic
    return false; // Replace with actual conflict detection
  };



  // @desc    Set teacher availability with comprehensive validation
// @route   PUT /api/teachers/availability
// @access  Private (Teacher only)
exports.setTeacherAvailability = async (req, res, next) => {
  try {
    const { availability } = req.body;

    // Validate input structure
    if (!availability || !Array.isArray(availability)) {
      return next(new ErrorResponse('Availability must be an array', 400));
    }

    // Validate each day's structure
    const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const seenDays = new Set();
    
    for (const day of availability) {
      // Validate day of week
      const dayLower = day.dayOfWeek.toLowerCase();
      if (!validDays.includes(dayLower)) {
        return next(new ErrorResponse(`Invalid day of week: ${day.dayOfWeek}`, 400));
      }

      // Check for duplicate days
      if (seenDays.has(dayLower)) {
        return next(new ErrorResponse(`Duplicate entry for ${day.dayOfWeek}`, 400));
      }
      seenDays.add(dayLower);

      // Validate time slots
      if (!Array.isArray(day.timeSlots)) {
        return next(new ErrorResponse(`Time slots must be an array for ${day.dayOfWeek}`, 400));
      }

      if (day.timeSlots.length === 0) {
        return next(new ErrorResponse(`At least one time slot required for ${day.dayOfWeek}`, 400));
      }

      // Validate each time slot
      for (const [index, slot] of day.timeSlots.entries()) {
        // Required fields check
        if (slot.startTime === undefined || slot.endTime === undefined || slot.isAvailable === undefined) {
          return next(new ErrorResponse(
            `Slot ${index + 1} on ${day.dayOfWeek} requires startTime, endTime and isAvailable`,
            400
          ));
        }

        // Time format validation
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(slot.startTime) || !timeRegex.test(slot.endTime)) {
          return next(new ErrorResponse(
            `Slot ${index + 1} on ${day.dayOfWeek}: Time must be in HH:MM format (24-hour)`,
            400
          ));
        }

        // Time validation
        const start = new Date(`1970-01-01T${slot.startTime}:00`);
        const end = new Date(`1970-01-01T${slot.endTime}:00`);
        
        // End time after start time
        if (end <= start) {
          return next(new ErrorResponse(
            `Slot ${index + 1} on ${day.dayOfWeek}: End time must be after start time`,
            400
          ));
        }

        // Minimum slot duration (30 minutes)
        const duration = (end - start) / 60000; // in minutes
        if (duration < 45) {
          return next(new ErrorResponse(
            `Slot ${index + 1} on ${day.dayOfWeek}: Minimum slot duration is 45 minutes`,
            400
          ));
        }

        // Slot doesn't cross midnight
        if (end.getDate() !== start.getDate()) {
          return next(new ErrorResponse(
            `Slot ${index + 1} on ${day.dayOfWeek}: Time slots cannot cross midnight`,
            400
          ));
        }
      }

      // Check for overlapping slots within the same day
      const slots = day.timeSlots.map(s => ({
        start: new Date(`1970-01-01T${s.startTime}:00`),
        end: new Date(`1970-01-01T${s.endTime}:00`)
      }));

      for (let i = 0; i < slots.length; i++) {
        for (let j = i + 1; j < slots.length; j++) {
          if (slots[i].start < slots[j].end && slots[i].end > slots[j].start) {
            return next(new ErrorResponse(
              `Overlapping time slots detected on ${day.dayOfWeek} between ${day.timeSlots[i].startTime}-${day.timeSlots[i].endTime} and ${day.timeSlots[j].startTime}-${day.timeSlots[j].endTime}`,
              400
            ));
          }
        }
      }
    }

    // Find and update teacher profile
    const teacher = await Teacher.findOneAndUpdate(
      { user: req.user.id },
      { availability },
      { new: true, runValidators: true }
    );

    if (!teacher) {
      return next(new ErrorResponse('Teacher profile not found', 404));
    }

    res.status(200).json({
      success: true,
      data: teacher.availability
    });

  } catch (err) {
    console.error(err);
    next(err);
  }
};

// @desc    Get teacher availability
// @route   GET /api/teachers/availability
// @access  Private (Teacher only)
exports.getTeacherAvailability = async (req, res, next) => {
  try {
    const teacher = await Teacher.findOne({ user: req.user.id })
      .select('availability');
    
    if (!teacher) {
      return next(new ErrorResponse('Teacher profile not found', 404));
    }

    res.status(200).json({
      success: true,
      data: teacher.availability || []
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get recommended teachers based on availability
// @route   GET /api/teachers/recommended
// @access  Private (Student)
exports.getRecommendedTeachers = async (req, res, next) => {
  try {
    const studentId = req.user.id;

    // 1. Get student's available time slots
    const student = await Student.findOne({ user: studentId }).select('availableSlots');
    if (!student) {
      return next(new ErrorResponse('Student profile not found', 404));
    }

    // 2. Find matching teachers
    const teachers = await Teacher.aggregate([
      { $unwind: "$availability" },
      { $unwind: "$availability.slots" },
      { $match: {
        "availability.slots.isAvailable": true,
        $or: student.availableSlots.map(slot => ({
          "availability.day": slot.day,
          "availability.slots.startTime": { $lte: slot.endTime },
          "availability.slots.endTime": { $gte: slot.startTime }
        }))
      }},
      { $group: {
        _id: "$_id",
        user: { $first: "$user" },
        name: { $first: { $concat: ["$firstName", " ", "$lastName"] } },
        matchScore: { $sum: 1 },
        matchingSlots: {
          $push: {
            day: "$availability.day",
            startTime: "$availability.slots.startTime",
            endTime: "$availability.slots.endTime"
          }
        }
      }},
      { $sort: { matchScore: -1 } },
      { $limit: 10 },
      { $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'userDetails'
      }},
      { $unwind: "$userDetails" },
      { $project: {
        _id: 1,
        name: 1,
        email: "$userDetails.email",
        profilePhoto: "$userDetails.profilePhoto",
        subjects: 1,
        matchScore: 1,
        matchingSlots: 1,
        availabilityMatchPercentage: {
          $multiply: [
            { $divide: ["$matchScore", { $size: student.availableSlots }] },
            100
          ]
        }
      }}
    ]);

    res.status(200).json({
      success: true,
      count: teachers.length,
      data: teachers
    });

  } catch (err) {
    next(err);
  }
};