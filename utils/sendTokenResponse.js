const sendTokenResponse = (token, user, profile, statusCode, res, message) => {
    const options = {
      expires: new Date(
        Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
      ),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production'
    };
  
    res
      .status(statusCode)
      .cookie('token', token, options)
    
      .json({
        success: true,
       token: token || null,
        message: message || 'successful',
        data: {
          user: {
            id: user._id,
            email: user.email,
            role: user.role,
            isVerified: user.isVerified
          },
          profile
        }
      });
  };
  
  module.exports = sendTokenResponse;