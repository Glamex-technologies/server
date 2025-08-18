const joi = require('joi');
const ResponseHelper = require('../../helpers/response.helpers');
const response = new ResponseHelper();
const JoiHelper = require('../../helpers/joiHelper.helpers');
const joiHelper = new JoiHelper();

module.exports = class BookingValidator {
  /**
   * Validates create booking request
   */
  async createBooking(req, res, next) {
    console.log('BookingValidator@createBooking');
    try {
      let schema = {
        provider_id: joi.number().integer().required(),
        service_ids: joi.array().items(joi.number().integer()).min(1).required(),
        scheduled_date: joi.date().iso().greater('now').required(),
        scheduled_time: joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
        service_location_id: joi.number().integer().required(),
        customer_address_id: joi.number().integer().optional().allow(null),
        promo_code: joi.string().optional().allow(null),
        payment_method_id: joi.string().required(),
        notes: joi.string().optional().allow(null)
      };

      let errors = await joiHelper.joiValidation(req.body, schema);
      if (errors) {
        return response.validationError('Invalid booking data', res, errors[0]);
      }
      next();
    } catch (err) {
      console.error('Validation Error: ', err);
      return response.exception('Server error occurred', res);
    }
  }

  /**
   * Validates update booking status request
   */
  async updateBookingStatus(req, res, next) {
    console.log('BookingValidator@updateBookingStatus');
    try {
      let schema = {
        status: joi.string().valid('accepted', 'rejected', 'on_the_way', 'completed').required(),
        notes: joi.string().optional()
      };

      let errors = await joiHelper.joiValidation(req.body, schema);
      if (errors) {
        return response.validationError('Invalid status data', res, errors[0]);
      }
      next();
    } catch (err) {
      console.error('Validation Error: ', err);
      return response.exception('Server error occurred', res);
    }
  }

  /**
   * Validates update provider location request
   */
  async updateProviderLocation(req, res, next) {
    console.log('BookingValidator@updateProviderLocation');
    try {
      let schema = {
        latitude: joi.number().min(-90).max(90).required(),
        longitude: joi.number().min(-180).max(180).required(),
        estimated_arrival: joi.date().iso().optional()
      };

      let errors = await joiHelper.joiValidation(req.body, schema);
      if (errors) {
        return response.validationError('Invalid location data', res, errors[0]);
      }
      next();
    } catch (err) {
      console.error('Validation Error: ', err);
      return response.exception('Server error occurred', res);
    }
  }

  /**
   * Validates cancel booking request
   */
  async cancelBooking(req, res, next) {
    console.log('BookingValidator@cancelBooking');
    try {
      let schema = {
        reason: joi.string().optional()
      };

      let errors = await joiHelper.joiValidation(req.body, schema);
      if (errors) {
        return response.validationError('Invalid cancel data', res, errors[0]);
      }
      next();
    } catch (err) {
      console.error('Validation Error: ', err);
      return response.exception('Server error occurred', res);
    }
  }

  /**
   * Validates get bookings query parameters
   */
  async getBookings(req, res, next) {
    console.log('BookingValidator@getBookings');
    try {
      let schema = {
        status: joi.string().valid('pending', 'accepted', 'on_the_way', 'completed', 'cancelled', 'rejected').optional(),
        filter: joi.string().valid('upcoming', 'past').optional(),
        date: joi.date().iso().optional(),
        page: joi.number().integer().min(1).optional().default(1),
        limit: joi.number().integer().min(1).max(100).optional().default(20)
      };

      let errors = await joiHelper.joiValidation(req.query, schema);
      if (errors) {
        return response.validationError('Invalid query parameters', res, errors[0]);
      }
      next();
    } catch (err) {
      console.error('Validation Error: ', err);
      return response.exception('Server error occurred', res);
    }
  }

  /**
   * Validates get booking stats query parameters
   */
  async getBookingStats(req, res, next) {
    console.log('BookingValidator@getBookingStats');
    try {
      let schema = {
        period: joi.string().valid('today', 'week', 'month', 'year').optional().default('month')
      };

      let errors = await joiHelper.joiValidation(req.query, schema);
      if (errors) {
        return response.validationError('Invalid query parameters', res, errors[0]);
      }
      next();
    } catch (err) {
      console.error('Validation Error: ', err);
      return response.exception('Server error occurred', res);
    }
  }

  /**
   * Validates get booking map view query parameters
   */
  async getBookingMapView(req, res, next) {
    console.log('BookingValidator@getBookingMapView');
    try {
      let schema = {
        date: joi.date().iso().optional(),
        status: joi.string().valid('pending', 'accepted', 'on_the_way', 'completed').optional()
      };

      let errors = await joiHelper.joiValidation(req.query, schema);
      if (errors) {
        return response.validationError('Invalid query parameters', res, errors[0]);
      }
      next();
    } catch (err) {
      console.error('Validation Error: ', err);
      return response.exception('Server error occurred', res);
    }
  }
};
