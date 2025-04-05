const express = require('express');
const {
  registerSuperAdmin,
  registerAdmin,
  login,
  getMe,
  registerStudent,
  verifyStudentOTP,
  updateStudentProfile,
  updatePassword,
  forgotPassword,
  resetPassword
//   logout
} = require('../controllers/authController');

const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/register-superadmin', registerSuperAdmin);
router.post('/register-admin', protect, authorize('superadmin'), registerAdmin);
router.post('/login', login);
router.post('/register-student',  registerStudent);
router.post('/verification',  verifyStudentOTP);
router.get('/me', protect, getMe);
// router.get('/logout', logout);
router.put('/updateStudentProfile', protect, updateStudentProfile);
router.put('/updatepassword', protect, updatePassword);
router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword', resetPassword);




module.exports = router;