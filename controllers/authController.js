
const User = require('../models/user');
const Admin = require('../models/admin');
const SuperAdmin = require('../models/superAdmin');
const ErrorResponse = require('../utils/errorResponse');
const sendEmail = require('../utils/sendEmail');
const generateToken = require('../utils/generateToken');
const sendTokenResponse = require('../utils/sendTokenResponse');
const crypto = require('crypto');
const Student = require('../models/student');
const { console } = require('inspector');
const { profile } = require('console');
// @desc    Register superadmin (only for initial setup)
// @route   POST /api/auth/register-superadmin
// @access  Public (should be protected in production)
exports.registerSuperAdmin = async (req, res, next) => {
  const { firstName, lastName, email, phone, password, masterKey } = req.body;

  try {
    // Check if master key is valid (you should have a secure way to validate this)
    if (masterKey !== process.env.SUPERADMIN_MASTER_KEY) {
      return next(new ErrorResponse('Invalid master key', 401));
    }

    const superAdmin = await SuperAdmin.create({
      firstName,
      lastName,
      contact: { email, phone },
      masterKey: crypto.createHash('sha256').update(masterKey).digest('hex')
    });

    const user = await User.create({
      email,
      password,
      role: 'superadmin',
      associatedId: superAdmin._id
    });

    const token = generateToken(user._id, user.role);

    let profile;
    switch(user.role) {
      case 'superadmin':
        profile = await SuperAdmin.findOne({ user: user._id });
        break;
 
    }
    sendTokenResponse(token, user, profile, 200, res);
  } catch (err) {
    next(err);
  }
};

// @desc    Register admin (only for superadmin)
// @route   POST /api/auth/register-admin
// @access  Private (SuperAdmin)
exports.registerAdmin = async (req, res, next) => {
  const { firstName, lastName, email, phone, password, permissions } = req.body;

  try {

    const admin = await Admin.create({
      firstName,
      lastName,
      contact: { email, phone },
      permissions
    });


    const user = await User.create({
      email,
      password,
      role: 'admin',
      associatedId: admin._id
    });
    const token = generateToken(user._id, user.role);
    let profile;
    switch(user.role) {
      case 'admin':
        profile = await Admin.findOne({ user: user._id });
        break;
   
 
    }
    sendTokenResponse(token, user, profile, 200, res);
  } catch (err) {
    next(err);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;


    const user = await User.findOne({ email }).select('+password');
    if (!user) return next(new ErrorResponse('Invalid credentials', 401));

    // 2. Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) return next(new ErrorResponse('Invalid credentials', 401));

    
    if (!user.isActive) return next(new ErrorResponse('Account disabled', 403));

    // if (!user.isVerified) return next(new ErrorResponse('Please verify your email', 403));

 
    const token = generateToken(user._id, user.role);

   
    user.lastLogin = Date.now();
    await user.save();

    let profile;
    switch(user.role) {
      case 'student':
        profile = await Student.findOne({ user: user._id });
        break;
      case 'teacher':
        profile = await Teacher.findOne({ user: user._id });
        break;
 
    }


    sendTokenResponse(token, user, profile, 200, res);

  } catch (err) {
    next(err);
  }
};




// exports.registerStudent = async (req, res, next) => {
//   try {
//     const { firstName, lastName, email, password, dateOfBirth, gender, address } = req.body;
//     console.log(firstName, lastName, email, password, dateOfBirth, gender, address)
//     const exsitingUser = await User.findOne({ email });
//     if (exsitingUser) {
//       return next(new ErrorResponse('Student already exists with this email', 400));
//     }

//     const user = await User.create({
//       email: req.body.email,
//       password: req.body.password,
//       role: 'student',
//     });




//     const student = await Student.create({
//       firstName,
//       lastName,
//       email,
//       password,
//       dateOfBirth,
//       gender,
//       registrationStatus: 'pending',
//       user: user._id,
//         studentId: `STU${Date.now().toString().slice(-6)}`
//     });


//     res.status(201).json({
//       success: true,
//       message: 'Registration successful. Please verify your email.'
//     });

//   } catch (err) {
//     next(err);
//   }
// };

exports.registerStudent = async (req, res, next) => {
  try {
    const { firstName, lastName, email, password, dateOfBirth, gender, address } = req.body;
    
    const existingUser = await User.findOne({ email});
    if (existingUser) {
      return next(new ErrorResponse('Student already exists with this email', 400));
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpires = new Date(Date.now() + 15 * 60 * 1000); 


    const user = await User.create({
      email: req.body.email,
      password: req.body.password,
      role: 'student',
      isVerified: false,
      otp,
      otpExpires
    });


    const student = await Student.create({
      firstName,
      lastName,
      email,
      password,
      dateOfBirth,
      gender,
      address,
      registrationStatus: 'pending',
      user: user._id,
      studentId: `STU${Date.now().toString().slice(-6)}`
    });


    const mailOptions = {
      from: process.env.EMAIL_USERNAME,
      to: email,
      subject: 'Verify Your Email for Student Registration',
      text: `Your OTP for email verification is: ${otp}. It will expire in 15 minutes.`,
      html: `<p>Your OTP for email verification is: <strong>${otp}</strong>. It will expire in 15 minutes.</p>`
    };

    // await sendEmail(mailOptions);

    res.status(201).json({
      success: true,
      message: `Registration successful. Please check your email for the OTP to verify your account. <strong>${otp}</strong>. `
    });

  } catch (err) {
    next(err);
  }
};



exports.verifyStudentOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ 
      email,
      otp,
      otpExpires: { $gt: Date.now() } // Check if OTP is not expired
    });

    if (!user) {
      return next(new ErrorResponse('Invalid or expired OTP', 400));
    }

    // Update user as verified and clear OTP fields
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    // Update student registration status
    await Student.findOneAndUpdate(
      { email },
      { registrationStatus: 'verified' }
    );

    const token = generateToken(user._id, user.role);
    user.lastLogin = Date.now();
    await user.save();

    let profile;
    switch(user.role) {
      case 'student':
        profile = await Student.findOne({ user: user._id });
        break;
      case 'teacher':
        profile = await Teacher.findOne({ user: user._id });
        break;
 
    }


    sendTokenResponse(token, user, profile, 200, res, 'Email verified successfully');

    res.status(200).json({
      success: true,
      message: 'Email verified successfully. You can now login.'
    });

  } catch (err) {
    next(err);
  }
};








// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  let user;
  
  try {
    // Populate based on role
    switch (req.user.role) {
      case 'superadmin':
        user = await SuperAdmin.findById(req.user.associatedId);
        break;
      case 'admin':
        user = await Admin.findById(req.user.associatedId);
        break;
      case 'teacher':
        user = await Teacher.findById(req.user.associatedId);
        break;
      case 'staff':
        user = await Staff.findById(req.user.associatedId);
        break;
      case 'student':
        user = await Student.findById(req.user.associatedId);
        break;
    }

    if (!user) {
      return next(new ErrorResponse('User profile not found', 404));
    }

    res.status(200).json({
      success: true,
      data: {
        authInfo: req.user,
        profile: user
      }
    });
  } catch (err) {
    next(err);
  }
};


