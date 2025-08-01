const express = require("express");
const router = express.Router();
const { providerAuth, adminAuth } = require("../../middlewares/auth.middleware");
const { uploadFileToS3 } = require("../../../config/upload.files");
const ProviderController = require("./provider.controller");
const ProviderValidator = require("./provider.validator");

const providerController = new ProviderController();
const providerValidator = new ProviderValidator();

// Route for welcome message or basic get
router.get("/", providerController.getWelcome); 

// Route for provider registration with validation middleware
router.post("/register",[providerValidator.register] ,providerController.register); 

// Route to verify OTP sent during registration with validation
router.post("/verify-verification-otp",[providerValidator.verifyVerificationOtp] ,providerController.verifyVerificationOtp); 

// Route to resend OTP with validation
router.get("/resend-otp",[providerValidator.resendOtp] ,providerController.resendOtp);

// Routes below require provider authentication and validation

// Route to set provider type after authentication and validation
router.post("/set-provider-type",[providerAuth,providerValidator.setProviderType], providerController.setProviderType); 

// Route to set document details for provider with auth and validation
router.post("/set-document-details",[providerAuth, providerValidator.setDocumentDetails], providerController.setDocumentDetails);

// Route to set service details for provider with auth and validation
router.post("/set-service-details",[providerAuth,providerValidator.setServiceDetails], providerController.setServiceDetails);

// Route to set provider availability with auth and validation
router.post("/set-availbilty",[providerAuth, providerValidator.setAvailability], providerController.setAvailability);

// Route for provider authentication (login) with validation
router.post("/authenticate",[providerValidator.authenticate] ,providerController.authenticate);

// Route to initiate forgot password flow with validation
router.post("/forgot-password",[providerValidator.forgotPassword] ,providerController.forgotPassword);

// Route to verify OTP sent for forgot password flow with validation
router.post("/verify-forgot-password-otp",[providerValidator.verifyForgotPasswordOtp] ,providerController.verifyForgotPasswordOtp); 

// Route to reset password with validation
router.post("/reset-password",[providerValidator.resetPassword] ,providerController.resetPassword);

// Routes below require admin authentication and validation

// Route to get all providers with admin auth and validation
router.get("/get-all", [adminAuth, providerValidator.getAllProviders],providerController.getAllProviders);

// Route for admin to perform actions on provider profiles with validation
router.post('/provider-profile-action', [adminAuth, providerValidator.providerProfileAction], providerController.providerProfileAction); 

// Route for admin to get specific provider details with validation
router.get("/get-provider", [adminAuth, providerValidator.getProvider], providerController.getProvider);

// Route for admin to update provider details with validation
router.post("/update-provider", [adminAuth, providerValidator.updateProvider], providerController.updateProvider);

// Route for uploading user files to S3 bucket
router.post("/upload-files",uploadFileToS3(),providerController.uploadFiles);

// Routes below require provider authentication

// Route for changing password with auth and validation
router.post("/change-password",[providerAuth, providerValidator.changePassword] ,providerController.changePassword);

// Route for logout with provider authentication
router.get("/logout",[providerAuth], providerController.logOut);

// Route for provider to delete their own account with validation
router.post("/delete-my-account",[providerAuth, providerValidator.deleteMyAccount] ,providerController.deleteMyAccount);

module.exports = router;