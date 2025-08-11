const express = require("express");
const router = express.Router();

// Import Gallery Controller and Validator
const GalleryController = require("./gallery.controller");
const GalleryValidator = require("./gallery.validator");

// Import Authentication Middlewares
const { providerAuth, adminAuth } = require("../../middlewares/auth.middleware");

// Instantiate Controller and Validator
const galleryValidator = new GalleryValidator();
const galleryController = new GalleryController();


// ========== Admin Gallery Routes ==========

// Admin: Get all galleries with optional filters
router.get("/all", [adminAuth, galleryValidator.getAllGalary], galleryController.getAdminAllGalary);

// Admin: Create a new gallery
router.post("/create", [adminAuth, galleryValidator.createGallery], galleryController.createGalary);

// Admin: Update an existing gallery
router.post("/update", [adminAuth, galleryValidator.updateGallery], galleryController.updateGalary);

// Admin: Delete a gallery
router.delete("/delete", [adminAuth, galleryValidator.deleteGallery], galleryController.deleteGalary);


// ========== Provider Gallery Routes ==========

// Provider: Get all their galleries
router.get("/provider/all", [providerAuth], galleryController.getAllGalary);

// Provider: Create a new gallery
router.post("/provider/create", [providerAuth, galleryValidator.createGallery], galleryController.createGalary);

// Provider: Update an existing gallery
router.post("/provider/update", [providerAuth, galleryValidator.updateGallery], galleryController.updateGalary);

// Provider: Delete a gallery
router.delete("/provider/delete", [providerAuth, galleryValidator.deleteGallery], galleryController.deleteGalary);


// Export the gallery routes
module.exports = router;