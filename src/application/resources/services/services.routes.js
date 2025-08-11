const express = require("express");
const router = express.Router();
const ServiceController = require("./services.controller");
const ServiceValidator = require("./services.validator");
const {adminAuth, userAuth} = require("../../middlewares/auth.middleware");

const serviceValidator = new ServiceValidator();
const serviceController = new ServiceController();

// Public route to get all services
router.get("/all", serviceController.getAllServices); 

// Admin-only route to get all services (protected by adminAuth middleware)
router.get("/admin/all", [adminAuth], serviceController.getAllServices); 

// Duplicate route to get all services (can be removed to avoid redundancy)
router.get("/all", serviceController.getAllServices); 

// Admin-only route to create a new service with validation middleware
router.post("/create", [adminAuth, serviceValidator.createService], serviceController.createService); 

// Admin-only route to update an existing service with validation middleware
router.post("/update", [adminAuth, serviceValidator.updateService], serviceController.updateService);

// Admin-only route to delete a service with validation middleware
router.delete("/delete", [adminAuth, serviceValidator.deleteService], serviceController.deleteService); 

// Route to get all services for providers (public or unprotected)
router.get("/provider/all", serviceController.getAllServices);

// User-only route to get all services (protected by userAuth middleware)
router.get("/user/all", [userAuth], serviceController.getAllServices); 

module.exports = router;