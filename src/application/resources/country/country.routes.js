const express = require("express");
const router = express.Router();
const CountryController = require("./country.controller");
const { adminAuth, userAuth } = require("../../middlewares/auth.middleware");

// Instantiate the controller
const countryController = new CountryController();

/* ------------------------- COUNTRY ROUTES ------------------------- */

// Get list of countries (accessible to all)
router.get("/", countryController.getCountry);

// Get list of countries (admin only)
router.get("/admin", [adminAuth], countryController.getCountryAdmin);

// Add a new country (admin only)
router.post("/add-country", [adminAuth], countryController.addCountry);

// Update an existing country (no auth specified, consider adding)
router.post("/update-country", countryController.updateCountry);

// Delete a country (no auth specified, consider adding)
router.delete("/delete-country", countryController.deleteCountry);

/* ------------------------- CITY ROUTES ------------------------- */

// Get list of cities (accessible to all)
router.get("/city", countryController.getCity);

// Get list of cities (admin only)
router.get("/city/admin", [adminAuth], countryController.getCityAdmin);

// Add a new city (admin only)
router.post("/add-city", [adminAuth], countryController.addCity);

// Update an existing city (no auth specified, consider adding)
router.post("/update-city", countryController.updateCity);

// Delete a city (no auth specified, consider adding)
router.delete("/delete-city", countryController.deleteCity);

module.exports = router;