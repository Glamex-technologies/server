const express = require('express');
const router = express.Router();

// Import controller and validator
const AdminController = require('./admin.controller');
const AdminValidator = require('./admin.validator');

// Middleware for admin authentication
const { adminAuth } = require('../../middlewares/auth.middleware');

// Middleware for file uploads to S3
const { uploadFileToS3 } = require('../../../config/upload.files');

// Instantiate controller and validator
const adminController = new AdminController();
const adminValidator = new AdminValidator();


// ========== Admin Routes ==========

// Public: Welcome route (can be used for health check or greeting)
router.get('/', adminController.getWelcome);

// Public: Admin login/authentication
router.post('/authenticate', [adminValidator.authenticate], adminController.authenticate);

// Private: Get admin profile (requires authentication)
router.get('/profile', [adminAuth], adminController.profile);


// ========== Forgot Password Flow ==========

// Public: Request to send OTP for password reset
router.post("/forgot-password", [adminValidator.forgotPassword], adminController.forgotPassword);

// Public: Verify the OTP sent for password reset
router.post("/verify-forgot-password-otp", [adminValidator.verifyForgotPasswordOtp], adminController.verifyForgotPasswordOtp);

// Public: Reset password after OTP verification
router.post("/reset-password", [adminValidator.resetPassword], adminController.resetPassword);

// Public: Resend OTP for password reset
router.get("/resend-otp", [adminValidator.resendOtp], adminController.resendOtp);

// ========== File Upload ==========

// Private: Upload files to AWS S3 (requires authentication if needed)
router.post("/upload-files", uploadFileToS3(), adminController.uploadFiles);

// ========== Logout and Password Change ==========

// Private: Logout admin (requires authentication)
router.get("/logout", [adminAuth], adminController.logOut);

// Private: Change password (requires authentication)
router.post("/change-password", [adminAuth, adminValidator.changePassword], adminController.changePassword);

// Export the admin routes
module.exports = router;