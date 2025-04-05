
const User = require('../models/user');
const Admin = require('../models/admin');
const SuperAdmin = require('../models/superAdmin');
const ErrorResponse = require('../utils/errorResponse');
const sendEmail = require('../utils/sendEmail');
const generateToken = require('../utils/generateToken');
const sendTokenResponse = require('../utils/sendTokenResponse');
const crypto = require('crypto');
const Student = require('../models/student');

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
  const { firstName, lastName, email,  password, permissions } = req.body;

  try {


    // const existingAdmin = await User.findOne({ email});
    // if (existingAdmin) {
    //   return next(new ErrorResponse('Admin already exists with this email', 400));
    // }

    const user = await User.create({
      email,
      password,
      role: 'admin',
    });

    const admin = await Admin.create({
      firstName,
      lastName,
      permissions,
      user: user._id,
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

// if(user.role === 'student' && user.registrationStatus !== 'verified') {
//   return next(new ErrorResponse('Registration not verified', 403));
// }
    //  if (!user.isVerified) return next(new ErrorResponse('Please verify your email', 403));

 
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
        case 'superadmin':
          profile = await SuperAdmin.findOne({ user: user._id });
          break;
          case 'admin':
          profile = await Admin.findOne({ user: user._id });
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
    const { firstName, lastName, email, password,  } = req.body;
    
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




exports.updateStudentProfile = async (req, res, next) => {
  try {
    const { firstName, lastName, dateOfBirth, gender, address } = req.body;
    const studentId = req.user.id; 
    const user = await User.findById(req.user.id).select('-password');

    const student = await Student.findOne({ user: studentId });
    
    if (!student) {
      return next(new ErrorResponse('Student profile not found', 404));
    }

    // Update only allowed fields
    const updates = {
      firstName: firstName || student.firstName,
      lastName: lastName || student.lastName,
      dateOfBirth: dateOfBirth || student.dateOfBirth,
      gender: gender || student.gender,
      
    };

    // Save updates
    const profile = await Student.findByIdAndUpdate(
      student._id,
      updates,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: user.id,
          email:user.email,
          role: user.role,
          isVerified:user.isVerified
        },
        profile
      }
    
    
    });

  } catch (err) {
    next(err);
  }
};





// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  let profile;
  const user = await User.findById(req.user.id).select('-password');
  try {
    // Populate based on role
    switch (req.user.role) {
      case 'superadmin':
        profile = await SuperAdmin.findOne({user: req.user.id});
        break;
      case 'admin':
        profile = await Admin.findOne({user: req.user.id});
        break;
      case 'teacher':
        profile = await Teacher.findOne({user: req.user.id});
        break;
      case 'staff':
        profile = await Staff.findOne({user: req.user.id});
        break;
      case 'student':
        profile = await Student.findOne({user: req.user.id});
        break;
    }

    if (!profile) {
      return next(new ErrorResponse('User profile not found', 404));
    }

    res.status(200).json({
      success: true,
      message:  'successful',
      data: {
        user: {
          id: user.id,
          email:user.email,
          role: user.role,
          isVerified:user.isVerified
        },
        profile
      }
     
    });
  } catch (err) {
    next(err);
  }
};


// @desc    Update user password
// @route   PUT /api/auth/updatepassword
// @access  Private
exports.updatePassword = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    const isMatch = await user.comparePassword(req.body.currentPassword);
    if (!isMatch) {
      return next(new ErrorResponse('Current password is incorrect', 401));
    }

    // Update password
    user.password = req.body.newPassword;
    await user.save();



    res.status(200).json({
      success: true,
      message:  'successful',
      data: {
        user: {
          id: user.id,
          email:user.email,
          role: user.role,
          isVerified:user.isVerified
        },
  
      }
     
    });
  } catch (err) {
    next(err);
  }
};


// @desc    Forgot password - OTP version
// @route   POST /api/auth/forgotpassword
// @access  Public
exports.forgotPassword = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      return next(new ErrorResponse('No user with that email', 404));
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpires = Date.now() + 10 * 60 * 1000;


    user.resetPasswordOtp = otp;
    user.resetPasswordOtpExpires = otpExpires;
    await user.save({ validateBeforeSave: false });

    // Email content
    const message = `You are receiving this email because you requested a password reset.
    Your OTP code is: ${otp}
    This code will expire in 10 minutes.`;

    try {
      // await sendEmail({
      //   email: user.email,
      //   subject: 'Password Reset OTP',
      //   message
      // });

      res.status(200).json({ 
        success: true, 
        message: 'OTP sent to email',
        // In production, you should NOT send the OTP in the response
        // This is just for development/testing
        otp: otp 
      });

    } catch (err) {
      console.error(err);
      user.resetPasswordOtp = undefined;
      user.resetPasswordOtpExpires = undefined;
      await user.save({ validateBeforeSave: false });

      return next(new ErrorResponse('Email could not be sent', 500));
    }

  } catch (err) {
    next(err);
  }
};

// @desc    Reset password with OTP
// @route   PUT /api/auth/resetpassword
// @access  Public
exports.resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;

    const user = await User.findOne({
      email,
      resetPasswordOtp: otp,
      resetPasswordOtpExpires: { $gt: Date.now() }
    });

    if (!user) {
      return next(new ErrorResponse('Invalid or expired OTP', 400));
    }

    user.password = newPassword;
    user.resetPasswordOtp = undefined;
    user.resetPasswordOtpExpires = undefined;
    await user.save();

    // Send confirmation email
    // await sendEmail({
    //   email: user.email,
    //   subject: 'Password Reset Confirmation',
    //   message: 'Your password has been successfully reset.'
    // });

    res.status(200).json({
      success: true,
      message: 'Password reset successful'
    });

  } catch (err) {
    next(err);
  }
};