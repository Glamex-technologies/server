const express = require("express");
const router = express.Router();
const { providerAuth, adminAuth, userAuth } = require("../../middlewares/auth.middleware");
const { uploadFileToS3 } = require("../../../config/upload.files");
const multer = require('multer');
const ProviderController = require("./provider.controller");
const ProviderValidator = require("./provider.validator");

const providerController = new ProviderController();
const providerValidator = new ProviderValidator();

// Configure multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Route for welcome message or basic get
router.get("/", providerController.getWelcome); 

// Provider authentication routes (original provider system)
router.post("/register", [providerValidator.register], providerController.register); 
router.post("/verify-verification-otp", [providerValidator.verifyVerificationOtp], providerController.verifyVerificationOtp); 
router.get("/resend-otp", [providerValidator.resendOtp], providerController.resendOtp);
router.post("/authenticate", [providerValidator.authenticate], providerController.authenticate);
router.post("/forgot-password", [providerValidator.forgotPassword], providerController.forgotPassword);
router.post("/verify-forgot-password-otp", [providerValidator.verifyForgotPasswordOtp], providerController.verifyForgotPasswordOtp); 
router.post("/reset-password", [providerValidator.resetPassword], providerController.resetPassword);

// Routes for users to become providers (requires user authentication)

// Create provider profile (users can become providers)
router.post("/create-profile", [userAuth], providerController.createProviderProfile); 

// Upload documents with AWS S3
router.post("/upload-documents", [
    userAuth, 
    upload.fields([
        { name: 'national_id_image_url', maxCount: 1 },
        { name: 'freelance_certificate_image_url', maxCount: 1 },
        { name: 'commercial_registration_image_url', maxCount: 1 },
        { name: 'banner_image', maxCount: 1 }
    ])
], providerController.uploadDocuments);

// Get available services from master catalog  
router.get("/available-services", [userAuth], providerController.getAvailableServices);

// Get countries and cities for location dropdowns
router.get("/locations", [userAuth], providerController.getLocations);

// Setup services for provider
router.post("/setup-services", [userAuth], providerController.setupServices);

// Set availability schedule
router.post("/set-availability", [userAuth], providerController.setAvailability);

// Set bank details
router.post("/set-bank-details", [userAuth], providerController.setBankDetails);

// Set simple subscription (one-time payment)
router.post("/set-subscription", [userAuth], providerController.setSubscription);

// Toggle availability status
router.post("/toggle-availability", [userAuth], providerController.toggleAvailability);

// Get provider profile (for authenticated users who are providers)
router.get("/profile", [userAuth], providerController.getProvider);

// Update provider profile
router.put("/profile", [userAuth], providerController.updateProvider);

// Routes below require admin authentication and validation

// Route to get all providers with admin auth and validation
router.get("/get-all", [adminAuth], providerController.getAllProviders);

// Route for admin to perform actions on provider profiles with validation
router.post('/provider-profile-action/:provider_id', [adminAuth], providerController.providerProfileAction); 

// Route for admin to get specific provider details with validation
router.get("/admin/get-provider/:provider_id", [adminAuth], providerController.getProvider);

// Routes for provider management (authenticated users with provider profiles)

// Route for provider to delete their own account
router.delete("/delete-my-account", [userAuth], providerController.deleteMyAccount);

module.exports = router;