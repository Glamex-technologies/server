const express = require("express");
const router = express.Router();
const UserController = require("./user.controller");
const UserValidator = require("./user.validator");
const userController = new UserController();
const userValidator = new UserValidator();
const { adminAuth, userAuth } = require("../../middlewares/auth.middleware");
const { uploadFileToS3 } = require("../../../config/upload.files");

// Public Welcome Route
router.get("/", userController.getWelcome); // Public welcome endpoint

// User Registration //
router.post("/register", userValidator.register, userController.register); // Register new user(done)
router.post("/verify-verification-otp", [userValidator.verifyVerificationOtp], userController.verifyVerificationOtp); // Verify OTP during registration(done)
router.patch("/resend-otp", [userValidator.resendOtp], userController.resendOtp); // Resend OTP - Update user with new OTP(done)
// User Registration //

// Authentication methods moved to /api/v1/auth routes for unified login

// Admin: User Management
router.get("/get-all", [adminAuth, userValidator.getAllUsers], userController.getAllUsers); // Admin gets list of all users
router.get("/get-user", [adminAuth, userValidator.getUser], userController.getUser); // Admin gets single user details
router.post("/update-user", [adminAuth, userValidator.updateUser], userController.updateUser); // Admin updates user data

// File Upload (e.g., profile picture)
router.post("/upload-files", uploadFileToS3(), userController.uploadFiles); // Upload files to S3 bucket

// Authenticated User Actions
router.get("/logout", [userAuth], userController.logOut); // Logout user
router.post("/change-password", [userAuth, userValidator.changePassword], userController.changePassword); // Change password
router.post("/delete-my-account", [userAuth, userValidator.deleteMyAccount], userController.deleteMyAccount); // User deletes their account

module.exports = router;