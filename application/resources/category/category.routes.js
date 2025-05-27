const express = require("express");
const router = express.Router();

const CategoryController = require("./category.controller");
const CategoryValidator = require("./category.validator");

const categoryValidator = new CategoryValidator();
const categoryController = new CategoryController();

const { adminAuth } = require("../../middlewares/auth.middleware");

/**
 * Public route to get all categories.
 */
router.get("/all", categoryController.getAllCategories);

/**
 * Admin-protected route to get all categories.
 * Requires admin authentication.
 */
router.get("/admin/all", [adminAuth], categoryController.getAllCategories);

/**
 * Admin-protected route to create a new category.
 * Validates request body with createCategory validator.
 */
router.post("/create", [adminAuth, categoryValidator.createCategory], categoryController.createCategory);

/**
 * Admin-protected route to update an existing category.
 * Validates request body with updateCategory validator.
 */
router.post("/update", [adminAuth, categoryValidator.updateCategory], categoryController.updateCategory);

/**
 * Admin-protected route to delete a category.
 * Validates request body with deleteCategory validator.
 */
router.delete("/delete", [adminAuth, categoryValidator.deleteCategory], categoryController.deleteCategory);

module.exports = router;