const joi = require('joi');
const ResponseHelper = require('../../helpers/response.helpers');
const response = new ResponseHelper();
const JoiHelper = require('../../helpers/joiHelper.helpers');
const joiHelper = new JoiHelper();

module.exports = class PromoCodesValidator {
  /**
   * Validate create promo code request
   */
  static async createPromoCode(req, res, next) {
    console.log('PromoCodesValidator@createPromoCode');
    try {
      const schema = {
        code: joi.string()
          .min(3)
          .max(50)
          .pattern(/^[A-Z0-9]+$/i)
          .optional()
          .messages({
            'string.pattern.base': 'Code must contain only alphanumeric characters',
            'string.min': 'Code must be at least 3 characters long',
            'string.max': 'Code must not exceed 50 characters'
          }),
        name: joi.string()
          .min(3)
          .max(100)
          .required()
          .messages({
            'string.min': 'Name must be at least 3 characters long',
            'string.max': 'Name must not exceed 100 characters',
            'any.required': 'Name is required'
          }),
        discount_type: joi.string()
          .valid('percentage', 'fixed')
          .required()
          .messages({
            'any.only': 'Discount type must be either percentage or fixed',
            'any.required': 'Discount type is required'
          }),
        discount_value: joi.number()
          .positive()
          .required()
          .messages({
            'number.base': 'Discount value must be a number',
            'number.positive': 'Discount value must be positive',
            'any.required': 'Discount value is required'
          }),
        minimum_bill_amount: joi.number()
          .min(0)
          .default(0)
          .messages({
            'number.base': 'Minimum bill amount must be a number',
            'number.min': 'Minimum bill amount cannot be negative'
          }),
        max_usage_count: joi.number()
          .integer()
          .min(1)
          .optional()
          .messages({
            'number.base': 'Max usage count must be a number',
            'number.integer': 'Max usage count must be an integer',
            'number.min': 'Max usage count must be at least 1'
          }),
        valid_from: joi.date()
          .required()
          .messages({
            'date.base': 'Valid from must be a valid date',
            'any.required': 'Valid from is required'
          }),
        valid_until: joi.date()
          .greater(joi.ref('valid_from'))
          .required()
          .messages({
            'date.base': 'Valid until must be a valid date',
            'date.greater': 'Valid until must be after valid from',
            'any.required': 'Valid until is required'
          })
      };

      let errors = await joiHelper.joiValidation(req.body, schema);
      if (errors) {
        return response.validationError('Invalid promo code data', res, errors[0]);
      }
      next();
    } catch (err) {
      console.error('Validation Error: ', err);
      return response.exception('Server error occurred', res);
    }
  }

  /**
   * Validate update promo code request
   */
  static async updatePromoCode(req, res, next) {
    console.log('PromoCodesValidator@updatePromoCode');
    try {
      const schema = {
        name: joi.string()
          .min(3)
          .max(100)
          .optional()
          .messages({
            'string.min': 'Name must be at least 3 characters long',
            'string.max': 'Name must not exceed 100 characters'
          }),
        discount_value: joi.number()
          .positive()
          .optional()
          .messages({
            'number.base': 'Discount value must be a number',
            'number.positive': 'Discount value must be positive'
          }),
        minimum_bill_amount: joi.number()
          .min(0)
          .optional()
          .messages({
            'number.base': 'Minimum bill amount must be a number',
            'number.min': 'Minimum bill amount cannot be negative'
          }),
        max_usage_count: joi.number()
          .integer()
          .min(1)
          .optional()
          .messages({
            'number.base': 'Max usage count must be a number',
            'number.integer': 'Max usage count must be an integer',
            'number.min': 'Max usage count must be at least 1'
          }),
        valid_until: joi.date()
          .optional()
          .messages({
            'date.base': 'Valid until must be a valid date'
          }),
        is_active: joi.boolean()
          .optional()
          .messages({
            'boolean.base': 'Is active must be a boolean'
          })
      };

      let errors = await joiHelper.joiValidation(req.body, schema);
      if (errors) {
        return response.validationError('Invalid promo code data', res, errors[0]);
      }
      next();
    } catch (err) {
      console.error('Validation Error: ', err);
      return response.exception('Server error occurred', res);
    }
  }

  /**
   * Validate promo code validation request
   */
  static async validatePromoCode(req, res, next) {
    console.log('PromoCodesValidator@validatePromoCode');
    try {
      const schema = {
        promo_code: joi.string()
          .min(3)
          .max(50)
          .required()
          .messages({
            'string.min': 'Promo code must be at least 3 characters long',
            'string.max': 'Promo code must not exceed 50 characters',
            'any.required': 'Promo code is required'
          }),
        provider_id: joi.number()
          .integer()
          .positive()
          .required()
          .messages({
            'number.base': 'Provider ID must be a number',
            'number.integer': 'Provider ID must be an integer',
            'number.positive': 'Provider ID must be positive',
            'any.required': 'Provider ID is required'
          }),
        service_ids: joi.array()
          .items(joi.number().integer().positive())
          .min(1)
          .required()
          .messages({
            'array.base': 'Service IDs must be an array',
            'array.min': 'At least one service ID is required',
            'any.required': 'Service IDs are required'
          }),
        subtotal: joi.number()
          .positive()
          .required()
          .messages({
            'number.base': 'Subtotal must be a number',
            'number.positive': 'Subtotal must be positive',
            'any.required': 'Subtotal is required'
          })
      };

      let errors = await joiHelper.joiValidation(req.body, schema);
      if (errors) {
        return response.validationError('Invalid promo code validation data', res, errors[0]);
      }
      next();
    } catch (err) {
      console.error('Validation Error: ', err);
      return response.exception('Server error occurred', res);
    }
  }

  /**
   * Validate get promo codes query parameters
   */
  static async getPromoCodes(req, res, next) {
    console.log('PromoCodesValidator@getPromoCodes');
    try {
      const schema = {
        page: joi.number()
          .integer()
          .min(1)
          .default(1)
          .messages({
            'number.base': 'Page must be a number',
            'number.integer': 'Page must be an integer',
            'number.min': 'Page must be at least 1'
          }),
        limit: joi.number()
          .integer()
          .min(1)
          .max(100)
          .default(20)
          .messages({
            'number.base': 'Limit must be a number',
            'number.integer': 'Limit must be an integer',
            'number.min': 'Limit must be at least 1',
            'number.max': 'Limit cannot exceed 100'
          }),
        is_active: joi.boolean()
          .optional()
          .messages({
            'boolean.base': 'Is active must be a boolean'
          })
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
   * Validate get promo code analytics query parameters
   */
  static async getPromoCodeAnalytics(req, res, next) {
    console.log('PromoCodesValidator@getPromoCodeAnalytics');
    try {
      const schema = {
        period: joi.string()
          .valid('week', 'month', 'year')
          .default('month')
          .messages({
            'any.only': 'Period must be week, month, or year'
          }),
        promo_code_id: joi.alternatives().try(
          joi.number().integer().positive(),
          joi.string().empty('')
        ).optional()
        .messages({
          'number.base': 'Promo code ID must be a number',
          'number.integer': 'Promo code ID must be an integer',
          'number.positive': 'Promo code ID must be positive'
        })
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
   * Validate promo code ID parameter
   */
  static async validatePromoCodeId(req, res, next) {
    console.log('PromoCodesValidator@validatePromoCodeId');
    try {
      const schema = {
        id: joi.number()
          .integer()
          .positive()
          .required()
          .messages({
            'number.base': 'Promo code ID must be a number',
            'number.integer': 'Promo code ID must be an integer',
            'number.positive': 'Promo code ID must be positive',
            'any.required': 'Promo code ID is required'
          })
      };

      let errors = await joiHelper.joiValidation(req.params, schema);
      if (errors) {
        return response.validationError('Invalid promo code ID', res, errors[0]);
      }
      next();
    } catch (err) {
      console.error('Validation Error: ', err);
      return response.exception('Server error occurred', res);
    }
  }

  /**
   * Validate get promo codes for provider (hybrid route)
   */
  static async getPromoCodesForProvider(req, res, next) {
    console.log('PromoCodesValidator@getPromoCodesForProvider');
    try {
      const schema = {
        provider_id: joi.number()
          .integer()
          .positive()
          .required()
          .messages({
            'number.base': 'Provider ID must be a number',
            'number.integer': 'Provider ID must be an integer',
            'number.positive': 'Provider ID must be positive',
            'any.required': 'Provider ID is required'
          }),
        page: joi.number()
          .integer()
          .min(1)
          .default(1)
          .messages({
            'number.base': 'Page must be a number',
            'number.integer': 'Page must be an integer',
            'number.min': 'Page must be at least 1'
          }),
        limit: joi.number()
          .integer()
          .min(1)
          .max(100)
          .default(20)
          .messages({
            'number.base': 'Limit must be a number',
            'number.integer': 'Limit must be an integer',
            'number.min': 'Limit must be at least 1',
            'number.max': 'Limit cannot exceed 100'
          }),
        is_active: joi.boolean()
          .optional()
          .messages({
            'boolean.base': 'Is active must be a boolean'
          })
      };

      let errors = await joiHelper.joiValidation({ ...req.params, ...req.query }, schema);
      if (errors) {
        return response.validationError('Invalid parameters', res, errors[0]);
      }
      next();
    } catch (err) {
      console.error('Validation Error: ', err);
      return response.exception('Server error occurred', res);
    }
  }
};
