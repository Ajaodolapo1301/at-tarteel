const mongoose = require('mongoose');
const Student = require('../models/student');
const Teacher = require('../models/teacher');
const TeachingAssignment = require('../models/teachingAssignment');
const Admin = require('../models/admin');
const User = require('../models/user'); 
const SuperAdmin = require('../models/superAdmin');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all superadmins (only for superadmin)
// @route   GET /api/superadmins
// @access  Private (SuperAdmin)
exports.getSuperAdmins = async (req, res, next) => {
  try {
    const superAdmins = await SuperAdmin.find().select('-masterKey');
    res.status(200).json({
      success: true,
      count: superAdmins.length,
      data: superAdmins
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Deactivate admin (only for superadmin)
// @route   PUT /api/admins/:id/deactivate
// @access  Private (SuperAdmin)
exports.deactivateAdmin = async (req, res, next) => {
  try {
    const admin = await Admin.findByIdAndUpdate(
      req.params.id,
      { status: 'Inactive' },
      { new: true }
    );

    if (!admin) {
      return next(new ErrorResponse('No admin found with that ID', 404));
    }

    res.status(200).json({
      success: true,
      data: admin
    });
  } catch (err) {
    next(err);
  }
};


// @desc    Get recommended teacher-student matches (admin view)
// @route   GET /api/admin/teaching-assignments/recommendations
// @access  Private (Admin)
exports.getAssignmentRecommendations = async (req, res, next) => {
  try {
    // 1. Get all unassigned students who need teachers
    const unassignedStudents = await Student.find({ 
      assignedTeacher: { $exists: false },
      needsTeacher: true 
    }).populate('user', 'name email');

    // 2. Get all available teachers
    const availableTeachers = await Teacher.find({
      availability: { $exists: true, $ne: [] },
      currentLoad: { $lt: 10 } // Teachers with < 10 assigned students
    }).populate('user', 'name email subjects');

    // 3. Generate compatibility matrix
    const recommendations = await Promise.all(
      unassignedStudents.map(async student => {
        const studentSlots = student.availableSlots || [];
        
        const compatibleTeachers = await Promise.all(
          availableTeachers.map(async teacher => {
            const matchScore = await calculateCompatibility(studentSlots, teacher.availability);
            return {
              teacherId: teacher._id,
              teacherName: teacher.user.name,
              subjects: teacher.subjects,
              matchPercentage: matchScore,
              availableSlots: getCommonSlots(studentSlots, teacher.availability)
            };
          })
        );

        return {
          studentId: student._id,
          studentName: student.user.name,
          recommendedTeachers: compatibleTeachers
            .filter(t => t.matchPercentage > 0)
            .sort((a, b) => b.matchPercentage - a.matchPercentage)
            .slice(0, 5) // Top 5 matches
        };
      })
    );

    res.status(200).json({
      success: true,
      count: recommendations.length,
      data: recommendations.filter(r => r.recommendedTeachers.length > 0)
    });

  } catch (err) {
    next(err);
  }
};

// Helper: Calculate time compatibility
async function calculateCompatibility(studentSlots, teacherAvailability) {
  // Implementation of time matching logic
  let matchingSlots = 0;
  
  studentSlots.forEach(sSlot => {
    teacherAvailability.forEach(tDay => {
      if (tDay.day === sSlot.day) {
        tDay.slots.forEach(tSlot => {
          if (tSlot.isAvailable && 
              tSlot.startTime <= sSlot.endTime && 
              tSlot.endTime >= sSlot.startTime) {
            matchingSlots++;
          }
        });
      }
    });
  });

  return studentSlots.length > 0 
    ? Math.round((matchingSlots / studentSlots.length) * 100) 
    : 0;
}

// Helper: Get common available slots
function getCommonSlots(studentSlots, teacherAvailability) {
  const commonSlots = [];
  
  studentSlots.forEach(sSlot => {
    teacherAvailability.forEach(tDay => {
      if (tDay.day === sSlot.day) {
        tDay.slots.forEach(tSlot => {
          if (tSlot.isAvailable && 
              tSlot.startTime <= sSlot.endTime && 
              tSlot.endTime >= sSlot.startTime) {
            commonSlots.push({
              day: tDay.day,
              startTime: laterTime(tSlot.startTime, sSlot.startTime),
              endTime: earlierTime(tSlot.endTime, sSlot.endTime)
            });
          }
        });
      }
    });
  });

  return commonSlots;
}

// @desc    Manually assign teacher to student (admin)
// @route   POST /api/admin/teaching-assignments
// @access  Private (Admin)
exports.createTeachingAssignment = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { studentId, teacherId, schedule } = req.body;

    // 1. Validate all entities exist
    const [student, teacher] = await Promise.all([
      Student.findById(studentId).session(session),
      Teacher.findById(teacherId).session(session)
    ]);

    if (!student) throw new ErrorResponse('Student not found', 404);
    if (!teacher) throw new ErrorResponse('Teacher not found', 404);

    // 2. Check teacher availability
    const available = await checkAvailability(teacherId, schedule, session);
    if (!available) {
      throw new ErrorResponse('Teacher not available at requested times', 400);
    }

    // 3. Create assignment
    const assignment = await TeachingAssignment.create([{
      student: studentId,
      teacher: teacherId,
      schedule: schedule,
      assignedBy: req.user.id,
      status: 'active'
    }], { session });

    // 4. Update both student and teacher records
    await Promise.all([
      Student.findByIdAndUpdate(
        studentId,
        { 
          assignedTeacher: teacherId,
          $push: { classSchedule: schedule }
        },
        { session }
      ),
      Teacher.findByIdAndUpdate(
        teacherId,
        { 
          $inc: { currentLoad: 1 },
          $push: { assignedStudents: studentId }
        },
        { session }
      ),
      markSlotsAsBooked(teacherId, schedule, session)
    ]);

    await session.commitTransaction();
    
    res.status(201).json({
      success: true,
      data: assignment[0]
    });

  } catch (err) {
    await session.abortTransaction();
    next(err);
  } finally {
    session.endSession();
  }
};