// controllers/availabilityController.js
const Student = require('../models/student');
const ErrorResponse = require('../utils/errorResponse');




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