const express = require("express");
const router = express.Router();

// Import controller and validator for subcategories
const SubCategoryController = require("./subCategory.controller");
const SubCategoryValidator = require("./subCategory.validator");

// Instantiate the validator and controller
const subCategoryValidator = new SubCategoryValidator();
const subCategoryController = new SubCategoryController();

// Import admin authentication middleware
const { adminAuth } = require("../../middlewares/auth.middleware");

// Public route to get all subcategories
router.get("/all", subCategoryController.getAllSubCategories); 

// Admin-only route to get all subcategories
router.get("/admin/all", [adminAuth], subCategoryController.getAllSubCategories); 

// Admin-only route to create a new subcategory with validation
router.post("/create", [adminAuth, subCategoryValidator.createSubCategory], subCategoryController.createSubCategory); 

// Admin-only route to update an existing subcategory with validation
router.post("/update", [adminAuth, subCategoryValidator.updateSubCategory], subCategoryController.updateSubCategory); 

// Admin-only route to delete a subcategory with validation
router.delete("/delete", [adminAuth, subCategoryValidator.deleteSubCategory], subCategoryController.deleteSubCategory); 

// Export the router
module.exports = router;