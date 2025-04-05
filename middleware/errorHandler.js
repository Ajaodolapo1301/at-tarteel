// middlewares/errorHandler.js
const ErrorResponse = require('../utils/errorResponse');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log to console for dev
  console.error(err.stack.red);
  // Handle JWT errors
if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = new ErrorResponse(message, 401);
  }
  
  // Handle JWT expired error
  if (err.name === 'TokenExpiredError') {
    const message = 'Token has expired';
    error = new ErrorResponse(message, 401);
  }
  
  // Handle multer file upload errors
  if (err.name === 'MulterError') {
    const message = `File upload error: ${err.message}`;
    error = new ErrorResponse(message, 400);
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = `Resource not found with id of ${err.value}`;
    error = new ErrorResponse(message, 404);
  }

  // Mongoose duplicate key

  // Mongoose duplicate key error (code 11000)
  if (err.code === 11000) {
    // Extract the field name from the error message
    const field = Object.keys(err.keyValue)[0];
    const message = `${field} '${err.keyValue[field]}' already exists`;
    error = new ErrorResponse(message, 400);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message);
    error = new ErrorResponse(message, 400);
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Server Error'
  });
};

module.exports = errorHandler;