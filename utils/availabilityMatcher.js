// utils/availabilityMatcher.js
const getAvailableTeachers = async (studentAvailability) => {
    // Convert student availability to query format
    const availabilityQueries = studentAvailability.map(slot => ({
      'availability.day': slot.day,
      'availability.slots.startTime': { $lte: slot.endTime },
      'availability.slots.endTime': { $gte: slot.startTime },
      'availability.slots.isAvailable': true
    }));
  
    // Find matching teachers
    const teachers = await Teacher.aggregate([
      { $unwind: "$availability" },
      { $unwind: "$availability.slots" },
      { $match: { $or: availabilityQueries } },
      { $group: {
        _id: "$_id",
        name: { $first: { $concat: ["$firstName", " ", "$lastName"] } },
        email: { $first: "$email" },
        subjects: { $first: "$subjects" },
        matchingSlots: {
          $push: {
            day: "$availability.day",
            startTime: "$availability.slots.startTime",
            endTime: "$availability.slots.endTime"
          }
        }
      }},
      { $addFields: {
        matchScore: { $size: "$matchingSlots" }
      }},
      { $sort: { matchScore: -1 } }
    ]);
  
    return teachers.map(teacher => ({
      ...teacher,
      matchingSlots: teacher.matchingSlots.filter(slot => 
        studentAvailability.some(s => 
          s.day === slot.day &&
          s.startTime <= slot.endTime && 
          s.endTime >= slot.startTime
        )
      )
    }));
  };