const express = require('express');
const router = express.Router();
const BookingController = require('./booking.controller');
const BookingValidator = require('./booking.validator');
const { userAuth } = require('../../middlewares/auth.middleware');
const { providerAuth } = require('../../middlewares/auth.middleware');

const bookingController = new BookingController();
const bookingValidator = new BookingValidator();

// Customer booking routes
router.post('/customers/bookings', [
  userAuth,
  bookingValidator.createBooking
], bookingController.createBooking);

router.get('/customers/bookings', [
  userAuth,
  bookingValidator.getBookings
], bookingController.getCustomerBookings);

router.get('/customers/bookings/:id', [
  userAuth
], bookingController.getBookingDetails);

router.put('/customers/bookings/:id/cancel', [
  userAuth,
  bookingValidator.cancelBooking
], bookingController.cancelBooking);

// Provider booking routes
router.get('/providers/bookings', [
  providerAuth,
  bookingValidator.getBookings
], bookingController.getProviderBookings);

router.put('/providers/bookings/:id/status', [
  providerAuth,
  bookingValidator.updateBookingStatus
], bookingController.updateBookingStatus);

router.put('/providers/bookings/:id/location', [
  providerAuth,
  bookingValidator.updateProviderLocation
], bookingController.updateProviderLocation);

router.get('/providers/bookings/map', [
  providerAuth,
  bookingValidator.getBookingMapView
], bookingController.getBookingMapView);

router.get('/providers/bookings/stats', [
  providerAuth,
  bookingValidator.getBookingStats
], bookingController.getBookingStats);

module.exports = router;
