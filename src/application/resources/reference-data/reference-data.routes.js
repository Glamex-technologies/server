const express = require("express");
const router = express.Router();
const ReferenceDataController = require("./reference-data.controller");

const referenceDataController = new ReferenceDataController();

// ========================================
// PUBLIC REFERENCE DATA ROUTES
// ========================================

// Get countries and cities for location dropdowns
router.get("/locations", referenceDataController.getLocations);

// Get available predefined banner images
router.get("/banner-images", referenceDataController.getBannerImages);

// Get available predefined service images
router.get("/service-images", referenceDataController.getServiceImages);

// Get available service locations
router.get("/service-locations", referenceDataController.getServiceLocations);

// Get available services from master catalog
router.get("/available-services", referenceDataController.getAvailableServices);

module.exports = router;
