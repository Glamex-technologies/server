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

// Route for welcome message or basic get
router.get("/", providerController.getWelcome);

// Provider authentication routes (original provider system)
router.post(
  "/register",
  [providerValidator.register],
  providerController.register
);
// Get countries and cities for location dropdowns
router.get("/locations", [providerAuth], providerController.getLocations);
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

// Subscription Payment (requires provider authentication)
router.post(
  "/subscription-payment",
  [handleEmptyBody, providerAuth, providerValidator.step1SubscriptionPayment],
  providerController.step1SubscriptionPayment
);

// Set Provider Type (requires provider authentication)
router.post(
  "/provider-type",
  [providerAuth, providerValidator.step2ProviderType],
  providerController.step2ProviderType
);

// Get available predefined banner images
router.get(
  "/banner-images",
  [providerAuth],
  providerController.getBannerImages
);

// Get available predefined service images
router.get(
  "/service-images",
  [providerAuth],
  providerController.getServiceImages
);

// Get available service locations
router.get(
  "/service-locations",
  [providerAuth],
  providerController.getServiceLocations
);

// Set Salon Details (requires provider authentication)
router.post(
  "/salon-or-indiviual-detail",
  [
    providerAuth,
    upload.fields([{ name: "banner_image", maxCount: 1 }]),
    providerValidator.step3SalonDetails,
  ],
  providerController.step3SalonDetails
);

// Upload documents and bank details
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



// Get available services from master catalog
router.get(
  "/available-services",
  [providerAuth],
  providerController.getAvailableServices
);



// Setup services for provider
router.post(
  "/setup-services",
  [
    providerAuth,
    upload.fields([
      { name: "service_images", maxCount: 10 } // Allow multiple service images
    ])
  ],
  providerController.setupServices
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
