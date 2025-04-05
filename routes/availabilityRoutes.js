// routes/availabilityRoutes.js
const express = require('express');
const {submitAvailability, reviewAvailability, getPendingRequests, rejectAvailability ,approveAvailability} = require('../controllers/availabilityController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/submit', protect, authorize('student'), submitAvailability);
router.get('/pending', protect, authorize('admin'), getPendingRequests);
router.put('/review', protect, authorize('admin'), reviewAvailability);
router.put('/reject', protect, authorize('admin'), reviewAvailability);
router.put('/approve', protect, authorize('admin'), approveAvailability);
router.post(
    '/availability/reject',
    protect,
    authorize('admin', 'superadmin'),
    rejectAvailability
  );

module.exports = router;