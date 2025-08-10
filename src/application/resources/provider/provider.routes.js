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

// Route for welcome message or basic get
router.get("/", providerController.getWelcome);

// Provider authentication routes (original provider system)
router.post(
  "/register",
  [providerValidator.register],
  providerController.register
);
router.post(
  "/verify-verification-otp",
  [providerValidator.verifyVerificationOtp],
  providerController.verifyVerificationOtp
);
router.post(
  "/resend-otp",
  [providerValidator.resendOtp],
  providerController.resendOtp
);
router.post(
  "/authenticate",
  [providerValidator.authenticate],
  providerController.authenticate
);
router.post(
  "/forgot-password",
  [providerValidator.forgotPassword],
  providerController.forgotPassword
);
router.post(
  "/verify-forgot-password-otp",
  [providerValidator.verifyForgotPasswordOtp],
  providerController.verifyForgotPasswordOtp
);
router.post(
  "/reset-password",
  [providerValidator.resetPassword],
  providerController.resetPassword
);

// Step 1: Subscription Payment (requires provider authentication)
router.post(
  "/step1-subscription-payment",
  [providerAuth, providerValidator.step1SubscriptionPayment],
  providerController.step1SubscriptionPayment
);

// Upload documents with AWS S3
router.post(
  "/upload-documents",
  [
    providerAuth,
    upload.fields([
      { name: "national_id_image_url", maxCount: 1 },
      { name: "freelance_certificate_image_url", maxCount: 1 },
      { name: "commercial_registration_image_url", maxCount: 1 },
      { name: "banner_image", maxCount: 1 },
    ]),
  ],
  providerController.uploadDocuments
);

// Get available services from master catalog
router.get(
  "/available-services",
  [providerAuth],
  providerController.getAvailableServices
);

// Get countries and cities for location dropdowns
router.get("/locations", [providerAuth], providerController.getLocations);

// Setup services for provider
router.post("/setup-services", [providerAuth], providerController.setupServices);

// Set availability schedule
router.post(
  "/set-availability",
  [providerAuth],
  providerController.setAvailability
);

// Set bank details
router.post("/set-bank-details", [providerAuth], providerController.setBankDetails);

// Set simple subscription (one-time payment)
router.post(
  "/set-subscription",
  [providerAuth],
  providerController.setSubscription
);

// Routes for authenticated providers (requires provider authentication)

// Toggle availability status
router.post(
  "/toggle-availability",
  [providerAuth],
  providerController.toggleAvailability
);

// Get provider profile (for authenticated providers)
router.get("/profile", [providerAuth], providerController.getProvider);

// Update provider profile
router.put("/profile", [providerAuth], providerController.updateProvider);

// Change password
router.post(
  "/change-password",
  [providerAuth],
  providerController.changePassword
);

// Logout
router.post("/logout", [providerAuth], providerController.logOut);

// Routes below require admin authentication and validation

// Route to get all providers with admin auth and validation
router.get("/get-all", [adminAuth], providerController.getAllProviders);

// Route for admin to perform actions on provider profiles with validation
router.post(
  "/provider-profile-action/:provider_id",
  [adminAuth],
  providerController.providerProfileAction
);

// Route for admin to get specific provider details with validation
router.get(
  "/admin/get-provider/:provider_id",
  [adminAuth],
  providerController.getProvider
);

// Routes for provider management (authenticated users with provider profiles)

// Route for provider to delete their own account
router.delete(
  "/delete-my-account",
  [providerAuth],
  providerController.deleteMyAccount
);

module.exports = router;
