
const express = require('express');

const {
getAssignmentRecommendations,
createTeachingAssignment,


} = require('../controllers/adminController');

const { protect, authorize } = require('../middleware/auth');

const router = express.Router();
router.get('/admin/teaching-assignments/recommendations', 
    protect, 
    authorize('admin', 'superadmin'),
      getAssignmentRecommendations
  
  );
  
  router.post('/admin/teaching-assignments',
    protect,
    authorize('admin', 'superadmin'),
    createTeachingAssignment
  );


 module.exports = router;