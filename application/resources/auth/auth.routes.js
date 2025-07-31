const express = require("express");
const router = express.Router();
const AuthController = require("./auth.controller");
const AuthValidator = require("./auth.validator");

const authController = new AuthController();
const authValidator = new AuthValidator();

// Unified Authentication Routes
router.post("/login", [authValidator.authenticate], authController.authenticate); // Unified login for both users and providers
router.post("/forgot-password", [authValidator.forgotPassword], authController.forgotPassword); // Unified forgot password
router.post("/verify-forgot-password-otp", [authValidator.verifyForgotPasswordOtp], authController.verifyForgotPasswordOtp); // Unified OTP verification
router.post("/reset-password", [authValidator.resetPassword], authController.resetPassword); // Unified password reset

module.exports = router;