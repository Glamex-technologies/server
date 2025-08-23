const express = require("express");
const router = express.Router();
const {
  providerAuth,
  adminAuth,
  userAuth,
} = require("../../middlewares/auth.middleware");
const { uploadFileToS3 } = require("../../../config/upload.files");
const multer = require("multer");
const ProviderController = require("./provider.controller");
const ProviderValidator = require("./provider.validator");

const providerController = new ProviderController();
const providerValidator = new ProviderValidator();

// Configure multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Middleware to handle empty JSON bodies
const handleEmptyBody = (req, res, next) => {
  if (
    req.headers["content-type"] === "application/json" &&
    (!req.body || Object.keys(req.body).length === 0)
  ) {
    req.body = {};
  }
  next();
};

// ========================================
// BASIC ROUTES
// ========================================

// Route for welcome message or basic get
router.get("/", providerController.getWelcome);

// ========================================
// AUTHENTICATION & REGISTRATION ROUTES
// ========================================

// Provider registration
router.post(
  "/signup",
  [providerValidator.register],
  providerController.register
);

// Unified OTP verification for all types
router.post(
  "/verify-otp",
  [providerValidator.verifyOtp],
  providerController.verifyOtp
);



// Resend OTP
router.post(
  "/resend-otp",
  [providerValidator.resendOtp],
  providerController.resendOtp
);

// Provider login/authentication
router.post(
  "/login",
  [providerValidator.authenticate],
  providerController.authenticate
);

// Password recovery flow
router.post(
  "/forgot-password",
  [providerValidator.forgotPassword],
  providerController.forgotPassword
);

router.post(
  "/reset-password",
  [providerValidator.resetPassword],
  providerController.resetPassword
);

// ========================================
// ONBOARDING & SETUP ROUTES
// ========================================

// Step 1: Subscription Payment (requires provider authentication)
router.post(
  "/subscription-payment",
  [handleEmptyBody, providerAuth, providerValidator.step1SubscriptionPayment],
  providerController.step1SubscriptionPayment
);

// Step 2: Set Provider Type (requires provider authentication)
router.post(
  "/provider-type",
  [providerAuth, providerValidator.step2ProviderType],
  providerController.step2ProviderType
);

// Step 3: Set Salon Details (requires provider authentication)
router.post(
  "/salon-or-indiviual-detail",
  [
    providerAuth,
    upload.fields([{ name: "banner_image", maxCount: 1 }]),
    providerValidator.step3SalonDetails,
  ],
  providerController.step3SalonDetails
);

// Step 4: Upload documents and bank details
router.post(
  "/upload-documents-and-bank-details",
  [
    providerAuth,
    upload.fields([
      { name: "national_id_image_url", maxCount: 1 },
      { name: "freelance_certificate_image_url", maxCount: 1 },
      { name: "commercial_registration_image_url", maxCount: 1 },
    ]),
  ],
  providerController.step4UploadDocuments
);

// Step 5: Set working days and hours
router.post(
  "/working-days-and-hours",
  [providerAuth],
  providerController.step5WorkingHours
);

// Step 6: Setup services for provider
router.post(
  "/setup-services",
  [
    providerAuth,
    upload.fields([
      { name: "service_images", maxCount: 10 }, // Allow multiple service images
    ]),
  ],
  providerController.setupServices
);

// ========================================
// ONBOARDING GET ROUTES (Same endpoints, different HTTP methods)
// ========================================

// Get overall onboarding progress
router.get(
  "/onboarding-progress",
  [providerAuth],
  providerController.getOnboardingProgress
);

// Get complete onboarding data for all steps
router.get(
  "/onboarding-data",
  [providerAuth],
  providerController.getCompleteOnboardingData
);

// Get Step 1: Subscription Payment data (same endpoint as POST)
router.get(
  "/subscription-payment",
  [providerAuth],
  providerController.getStep1SubscriptionPayment
);

// Get Step 2: Provider Type data (same endpoint as POST)
router.get(
  "/provider-type",
  [providerAuth],
  providerController.getStep2ProviderType
);

// Get Step 3: Salon Details data (same endpoint as POST)
router.get(
  "/salon-or-indiviual-detail",
  [providerAuth],
  providerController.getStep3SalonDetails
);

// Get Step 4: Documents and Bank Details data (same endpoint as POST)
router.get(
  "/upload-documents-and-bank-details",
  [providerAuth],
  providerController.getStep4DocumentsBank
);

// Get Step 5: Working Hours data (same endpoint as POST)
router.get(
  "/working-days-and-hours",
  [providerAuth],
  providerController.getStep5WorkingHours
);

// Get Step 6: Services Setup data (same endpoint as POST)
router.get(
  "/setup-services",
  [providerAuth],
  providerController.getStep6ServicesSetup
);

// ========================================
// PROVIDER PROFILE MANAGEMENT ROUTES
// ========================================

// Get provider user data only (for authenticated providers)
router.get("/user", [providerAuth], providerController.getProviderUser);

// Get service provider profile data only (for authenticated providers)
router.get("/profile", [providerAuth], providerController.getProviderProfile);

// Update provider profile
router.put("/profile", [providerAuth, providerValidator.updateProvider], providerController.updateProvider);

// Get current availability status
router.get(
  "/availability-status",
  [providerAuth],
  providerController.getAvailabilityStatus
);

// Toggle availability status
router.post(
  "/toggle-availability",
  [providerAuth, providerValidator.toggleAvailability],
  providerController.toggleAvailability
);

// Change password
router.post(
  "/change-password",
  [providerAuth, providerValidator.changePassword],
  providerController.changePassword
);

// Enhanced Logout with optional rate limiting
// Uncomment the rate limiting middleware below for additional security
// const { createLogoutRateLimiter } = require("../../middlewares/rateLimit.middleware");
// const logoutRateLimiter = createLogoutRateLimiter(15 * 60 * 1000, 5); // 5 logout attempts per 15 minutes

router.post(
  "/logout",
  [
    // logoutRateLimiter, // Uncomment to enable rate limiting
    providerAuth,
  ],
  providerController.logOut
);

// Route for provider to delete their own account
router.delete(
  "/delete-my-account",
  [providerAuth, providerValidator.deleteMyAccount],
  providerController.deleteMyAccount
);



// ========================================
// ADMIN MANAGEMENT ROUTES
// ========================================

// Route to get all providers with admin auth and validation
router.get("/get-all", [adminAuth, providerValidator.getAllProviders], providerController.getAllProviders);

// Route for admin to perform actions on provider profiles with validation
router.post(
  "/provider-profile-action/:provider_id",
  [adminAuth, providerValidator.providerProfileAction],
  providerController.providerProfileAction
);

// Route for admin to get specific provider details with validation
router.get(
  "/get-provider/:provider_id",
  [adminAuth, providerValidator.getProvider],
  providerController.getProvider
);

// Route for admin to change provider status (active/inactive)
router.post(
  "/change-status",
  [adminAuth, providerValidator.changeProviderStatus],
  providerController.changeProviderStatus
);

module.exports = router;
