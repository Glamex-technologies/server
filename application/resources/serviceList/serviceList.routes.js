const express = require("express");
const router = express.Router();

const ServiceListController = require("./serviceList.controller");
const ServiceListValidator = require("./serviceList.validator");
const serviceListValidator = new ServiceListValidator();
const serviceListController = new ServiceListController();
const { providerAuth, adminAuth } = require("../../middlewares/auth.middleware");

// router.get("/all", [providerAuth], serviceListController.getAllSubCategories); 

// Route for creating a single service list item, protected by provider authentication and validation
router.post("/create", [providerAuth ,serviceListValidator.createServiceList], serviceListController.createServiceList);

// Route for creating multiple service list items in batch, protected by provider authentication and batch validation
router.post("/create-batch", [providerAuth, serviceListValidator.createServiceListBatch], serviceListController.createServiceListBatch); 

// Route to get services related to providers, accessible only by admins
router.get("/provider", [adminAuth], serviceListController.getProviderServices);

// router.post("/update", [providerAuth, upload.single('image'),serviceListValidator.updateSubCategory], serviceListController.updateSubCategory); 

module.exports = router;