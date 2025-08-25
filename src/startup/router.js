const express = require("express");
const routes = express.Router();

const UserRoutes = require("../application/resources/users/user.routes");
const AdminRoutes = require("../application/resources/admin/admin.routes");
const ProviderRoutes = require("../application/resources/provider/provider.routes");
const ServicesRoutes = require("../application/resources/services/services.routes");
const CountryRoutes = require("../application/resources/country/country.routes");
const CategoryRoutes = require("../application/resources/category/category.routes");
/**
 * Express router for handling sub-category related API endpoints.
 * 
 * @module SubCategoryRoutes
 * @requires express
 * @requires ../application/resources/subCategory/subCategory.routes
 * 
 * @description
 * This router manages all routes related to sub-categories, such as creating,
 * updating, deleting, and retrieving sub-category data.
 */
const SubCategoryRoutes = require("../application/resources/subCategory/subCategory.routes");
const ServiceListRoutes = require("../application/resources/serviceList/serviceList.routes");
const GalleryRoutes = require("../application/resources/gallery/gallery.routes");
const BookingRoutes = require("../application/resources/bookings/booking.routes");
const PromoCodesRoutes = require("../application/resources/promo-codes/promo-codes.routes");
const ReferenceDataRoutes = require("../application/resources/reference-data/reference-data.routes");

// Import all routes here and add them to the routes object
routes.use("/user", UserRoutes);
routes.use("/admin", AdminRoutes);
routes.use("/provider", ProviderRoutes);
routes.use("/country", CountryRoutes);
routes.use("/services", ServicesRoutes);
routes.use("/category", CategoryRoutes);
routes.use("/sub-category", SubCategoryRoutes);
routes.use("/service-list", ServiceListRoutes);
routes.use("/gallery", GalleryRoutes);
routes.use("/api", BookingRoutes);
routes.use("/promo-codes", PromoCodesRoutes);
routes.use("/reference-data", ReferenceDataRoutes);

module.exports = routes;
