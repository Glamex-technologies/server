const express = require('express');
const router = express.Router();
const multer = require('multer');
const { providerAuth, userAuth } = require('../../middlewares/auth.middleware');
const hybridAuth = require('../../middlewares/hybridAuth.middleware');
const PromoCodesController = require('./promo-codes.controller');
const PromoCodesValidator = require('./promo-codes.validator');

const promoCodesController = new PromoCodesController();

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// ========================================
// PROVIDER ROUTES (Require provider authentication)
// ========================================

// Create promo code (Provider)
router.post(
  '/provider',
  [providerAuth, upload.single('template_image'), PromoCodesValidator.createPromoCode],
  promoCodesController.createPromoCode
);

// Get provider's own promo codes (Provider Dashboard)
router.get(
  '/provider',
  [providerAuth, PromoCodesValidator.getPromoCodes],
  promoCodesController.getProviderPromoCodes
);

// Update promo code (Provider)
router.put(
  '/provider/:id',
  [providerAuth, PromoCodesValidator.validatePromoCodeId, upload.single('template_image'), PromoCodesValidator.updatePromoCode],
  promoCodesController.updatePromoCode
);

// Delete promo code (Provider)
router.delete(
  '/provider/:id',
  [providerAuth, PromoCodesValidator.validatePromoCodeId],
  promoCodesController.deletePromoCode
);

// Get promo code analytics (Provider Dashboard) - MUST BE BEFORE /:id route
router.get(
  '/provider/analytics',
  [providerAuth, PromoCodesValidator.getPromoCodeAnalytics],
  promoCodesController.getPromoCodeAnalytics
);

// Get specific promo code details (Provider Dashboard)
router.get(
  '/provider/:id',
  [providerAuth, PromoCodesValidator.validatePromoCodeId],
  promoCodesController.getPromoCodeDetails
);

// ========================================
// CUSTOMER ROUTES (Public - no authentication required)
// ========================================

// Validate promo code (Customer)
router.post(
  '/validate',
  [PromoCodesValidator.validatePromoCode],
  promoCodesController.validatePromoCode
);

// Get available promo codes for provider (Customer App)
router.get(
  '/provider/:provider_id/available',
  promoCodesController.getAvailablePromoCodes
);

// ========================================
// HYBRID ROUTES (Support both user and provider tokens)
// ========================================

// Get promo codes for a provider (supports both user and provider tokens)
router.get(
  '/provider/:provider_id/promo-codes',
  [hybridAuth, PromoCodesValidator.getPromoCodesForProvider],
  promoCodesController.getPromoCodesForProvider
);

module.exports = router;
