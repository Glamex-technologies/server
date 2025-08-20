const express = require('express');
const router = express.Router();

// Import dependencies
const AdminController = require('./admin.controller');
const AdminValidator = require('./admin.validator');
const { adminAuth } = require('../../middlewares/auth.middleware');
const { uploadFileToS3 } = require('../../../config/upload.files');

// Initialize instances
const adminController = new AdminController();
const adminValidator = new AdminValidator();

// ========================================
// ADMIN ROUTES
// ========================================

// PUBLIC ROUTES (No authentication required)
// ========================================

/**
 * GET /admin/
 * Welcome endpoint for admin API
 * Used for health checks and API status
 */
router.get('/', adminController.getWelcome);

/**
 * POST /admin/authenticate
 * Admin login endpoint
 * Validates credentials and returns JWT token
 */
router.post('/authenticate', [adminValidator.authenticate], adminController.authenticate);

// PROTECTED ROUTES (Authentication required)
// ========================================

/**
 * GET /admin/profile
 * Get current admin profile information
 * Requires valid admin authentication token
 */
router.get('/profile', [adminAuth], adminController.profile);

/**
 * GET /admin/logout
 * Admin logout endpoint
 * Invalidates and removes token from database
 */
router.get('/logout', [adminAuth], adminController.logOut);

/**
 * POST /admin/change-password
 * Change admin password
 * Requires current password validation
 */
router.post('/change-password', [adminAuth, adminValidator.changePassword], adminController.changePassword);

/**
 * POST /admin/upload-files
 * Upload files to AWS S3
 * Handles file uploads for admin operations
 */
router.post('/upload-files', uploadFileToS3(), adminController.uploadFiles);

module.exports = router;