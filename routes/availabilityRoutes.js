// routes/availabilityRoutes.js
const express = require('express');
const {submitAvailability, reviewAvailability, getPendingRequests, rejectAvailability ,approveAvailability, getTeacherAvailability,setTeacherAvailability } = require('../controllers/availabilityController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/submit', protect, authorize('student'), submitAvailability);
router.get('/pending', protect, authorize('admin', 'superadmin'), getPendingRequests);
router.put('/review', protect, authorize('admin',  'superadmin'), reviewAvailability);
router.put('/reject', protect, authorize('admin',  'superadmin'), reviewAvailability);
router.put('/approve', protect, authorize('admin',  'superadmin'), approveAvailability);
router.post(
    '/availability/reject',
    protect,
    authorize('admin', 'superadmin'),
    rejectAvailability
  );



  router.route('/teacher/availability')
  .get(protect, authorize('teacher'), getTeacherAvailability)
  .put(protect, authorize('teacher'), setTeacherAvailability);

module.exports = router;