// controllers/superAdminController.js
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