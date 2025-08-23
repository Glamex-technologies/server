const joi = require("joi");
const ResponseHelper = require("../../helpers/response.helpers");
const response = new ResponseHelper();
const JoiHelper = require("../../helpers/joiHelper.helpers");
const joiHelper = new JoiHelper();
const ProviderResources = require("./provider.resources");

const providerResources = new ProviderResources();

module.exports = class ProviderValidator {
  /**
   * Validates provider authentication request
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  /**
   * Validates authentication request and verifies provider credentials
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async authenticate(req, res, next) {
    console.log("ProviderValidator@authenticate");
    try {
      // Define validation schema for authentication
      let schema = {
        phone_code: joi.string().pattern(/^\d+$/).required(),
        phone_number: joi.string().pattern(/^\d+$/).required(),
        password: joi.string().required(),
      };

      // Validate request body against schema
      let errors = await joiHelper.joiValidation(req.body, schema);
      if (errors) {
        return response.validationError("invalid request", res, errors[0]);
      }

      // Check if user exists (providers are now linked to users)
      const db = require("../../../startup/model");
      let user = await db.models.User.findOne({
        where: {
          phone_code: req.body.phone_code,
          phone_number: req.body.phone_number,
        },
      });
      if (!user) {
        return response.validationError("Provider not found", res, false);
      }

      // Validate password against user
      let isPasswordValid = await joiHelper.validatePassword(
        req.body.password,
        user.password
      );
      if (!isPasswordValid) {
        return response.validationError("Invalid password", res, false);
      }

      // Attach user information to request object (provider profile may not exist yet)
      req.user = user; // Attach user for easy access
      next();
    } catch (err) {
      console.error("Validation Error: ", err);
      return response.exception("Server error occurred", res);
    }
  }

  /**
   * Validates provider registration request
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async register(req, res, next) {
    console.log("ProviderValidator@register");
    try {
      // Define validation schema for registration
      let schema = {
        first_name: joi.string().required(),
        last_name: joi.string().required(),
        email: joi.string().email().optional(),
        phone_code: joi.string().pattern(/^\d+$/).required(),
        phone_number: joi.string().pattern(/^\d+$/).required(),
        password: joi
          .string()
          .required()
          .min(8)
          .pattern(
            new RegExp(
              "^(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$"
            )
          )
          .required()
          .messages({
            "string.empty": "Password is required.",
            "string.min": "Password must be at least 8 characters long.",
            "string.pattern.base":
              "Password must contain at least one uppercase letter, one number, and one special character.",
          }),
        gender: joi.number().valid(1, 2, 3).required(),
        terms_and_condition: joi.number().valid(1).required(),
      };

      // Validate request body against schema
      let errors = await joiHelper.joiValidation(req.body, schema);
      if (errors) {
        return response.validationError("invalid request", res, errors[0]);
      }

      // Check if phone number already exists in users table (since providers are now linked to users)
      const db = require("../../../startup/model");
      let existingUser = await db.models.User.findOne({
        where: {
          phone_code: req.body.phone_code,
          phone_number: req.body.phone_number,
        },
      });

      if (existingUser) {
        if (existingUser.verified_at) {
          return response.badRequest(
            "Phone number already exists and is verified. Please use the login endpoint.",
            res
          );
        } else {
          return response.badRequest(
            "Phone number already exists but not verified. Please complete verification or use resend OTP.",
            res
          );
        }
      }

      // Check if email already exists
      if (req.body.email) {
        let existingEmailUser = await db.models.User.findOne({
          where: { email: req.body.email },
        });
        if (existingEmailUser) {
          return response.badRequest("Email address already exists.", res);
        }
      }

      next();
    } catch (err) {
      console.error("Validation Error: ", err);
      return response.exception("Server error occurred", res);
    }
  }

  /**
   * Validates unified OTP verification request
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async verifyOtp(req, res, next) {
    console.log("ProviderValidator@verifyOtp");
    try {
      // Define validation schema for OTP verification
      let schema = {
        phone_code: joi.string().pattern(/^\d{1,4}$/).required().messages({
          'string.pattern.base': 'Phone code must be 1-4 digits',
          'any.required': 'Phone code is required'
        }),
        phone_number: joi.string().pattern(/^\d{6,15}$/).required().messages({
          'string.pattern.base': 'Phone number must be 6-15 digits',
          'any.required': 'Phone number is required'
        }),
        otp: joi.string().length(4).pattern(/^\d+$/).required().messages({
          'string.length': 'OTP must be exactly 4 digits',
          'string.pattern.base': 'OTP must contain only digits',
          'any.required': 'OTP is required'
        }),
        otp_type: joi.string().valid('signup', 'login', 'forgot_password').required().messages({
          'string.valid': 'OTP type must be one of: signup, login, forgot_password',
          'any.required': 'OTP type is required'
        }),
      };

      // Validate request body against schema
      let errors = await joiHelper.joiValidation(req.body, schema);
      if (errors) {
        return response.validationError("Validation failed", res, {
          error_code: 'VALIDATION_ERROR',
          details: errors[0]
        });
      }

      next();
    } catch (err) {
      console.error("Validation Error: ", err);
      return response.exception("Server error occurred", res);
    }
  }

  /**
   * Validates OTP verification request (legacy method)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async verifyVerificationOtp(req, res, next) {
    console.log("ProviderValidator@verifyVerificationOtp");
    try {
      // Define validation schema for OTP verification
      let schema = {
        phone_code: joi.string().pattern(/^\d{1,4}$/).required().messages({
          'string.pattern.base': 'Phone code must be 1-4 digits',
          'any.required': 'Phone code is required'
        }),
        phone_number: joi.string().pattern(/^\d{6,15}$/).required().messages({
          'string.pattern.base': 'Phone number must be 6-15 digits',
          'any.required': 'Phone number is required'
        }),
        otp: joi.string().length(4).pattern(/^\d+$/).required().messages({
          'string.length': 'OTP must be exactly 4 digits',
          'string.pattern.base': 'OTP must contain only digits',
          'any.required': 'OTP is required'
        }),
      };

      // Validate request body against schema
      let errors = await joiHelper.joiValidation(req.body, schema);
      if (errors) {
        return response.validationError("Validation failed", res, {
          error_code: 'VALIDATION_ERROR',
          details: errors[0]
        });
      }

      next();
    } catch (err) {
      console.error("Validation Error: ", err);
      return response.exception("Server error occurred", res);
    }
  }

  /**
   * Validates OTP resend request
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async resendOtp(req, res, next) {
    console.log("ProviderValidator@resendOtp");
    try {
      // Define validation schema for OTP resend
      let schema = {
        phone_code: joi.string().pattern(/^\d{1,4}$/).required().messages({
          'string.pattern.base': 'Phone code must be 1-4 digits',
          'any.required': 'Phone code is required'
        }),
        phone_number: joi.string().pattern(/^\d{6,15}$/).required().messages({
          'string.pattern.base': 'Phone number must be 6-15 digits',
          'any.required': 'Phone number is required'
        }),
        otp_type: joi.string().valid('signup', 'login', 'forgot_password').required().messages({
          'string.valid': 'OTP type must be one of: signup, login, forgot_password',
          'any.required': 'OTP type is required'
        }),
      };

      // Validate request body against schema
      let errors = await joiHelper.joiValidation(req.body, schema);
      if (errors) {
        return response.validationError("Validation failed", res, {
          error_code: 'VALIDATION_ERROR',
          details: errors[0]
        });
      }

      next();
    } catch (err) {
      console.error("Validation Error: ", err);
      return response.exception("Server error occurred", res);
    }
  }

  /**
   * Validates provider type setting request
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async setProviderType(req, res, next) {
    console.log("ProviderValidator@setProviderType");
    try {
      // Define validation schema for provider type
      let schema = {
        provider_type: joi.number().valid(1, 2).required(),
      };

      // Validate request body against schema
      let errors = await joiHelper.joiValidation(req.body, schema);
      if (errors) {
        return response.validationError("invalid request", res, errors[0]);
      }

      next();
    } catch (err) {
      console.error("Validation Error: ", err);
      return response.exception("Server error occurred", res);
    }
  }

  /**
   * Validates service details setting request
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async setServiceDetails(req, res, next) {
    console.log("ProviderValidator@setServiceDetails");
    try {
      // Define validation schema for service details
      let schema = {
        salon_name: joi.string().optional().allow(null),
        country_id: joi.number().optional(),
        city_id: joi.number().optional(),
        banner_image: joi.string().optional().allow(null),
        description: joi.string().optional().allow(null),
      };

      // Validate request body against schema
      let errors = await joiHelper.joiValidation(req.body, schema);
      if (errors) {
        return response.validationError("invalid request", res, errors[0]);
      }

      next();
    } catch (err) {
      console.error("Validation Error: ", err);
      return response.exception("Server error occurred", res);
    }
  }

  /**
   * Validates document details setting request
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async setDocumentDetails(req, res, next) {
    console.log("ProviderValidator@setDocumentDetails");
    try {

      // Define validation schema for document details
      let schema = {
        national_id: joi.string().uri().required(),
        bank_account_name: joi.string().required(),
        bank_name: joi.string().required(),
        account_number: joi.string().required(),
        freelance_certificate: joi.string().uri().optional().allow(null),
        commertial_certificate: joi.string().uri().optional().allow(null),
        is_vat_applicable: joi.number().valid(0, 1).required(),
        vat_number: joi
          .string()
          .allow(null)
          .when("is_vat_applicable", {
            is: 1,
            then: joi
              .required()
              .messages({
                "any.required": "vat_number is required when VAT is applicable",
              }),
            otherwise: joi.optional(),
          }),
        vat_amount: joi
          .number()
          .allow(null)
          .when("is_vat_applicable", {
            is: 1,
            then: joi
              .required()
              .messages({
                "any.required": "vat_amount is required when VAT is applicable",
              }),
            otherwise: joi.optional(),
          }),
      };

      // Validate request body against schema
      let errors = await joiHelper.joiValidation(req.body, schema);
      if (errors) {
        return response.validationError("invalid request", res, errors[0]);
      }

      next();
    } catch (err) {
      console.error("Validation Error: ", err);
      return response.exception("Server error occurred", res);
    }
  }

  /**
   * Validates availability setting request
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async setAvailability(req, res, next) {
    console.log("ProviderValidator@setAvailability");
    try {
      // Define validation schema for availability
      let schema = {
        availbilty: joi
          .array()
          .items(
            joi.object({
              day: joi
                .string()
                .valid(
                  "monday",
                  "tuesday",
                  "wednesday",
                  "thursday",
                  "friday",
                  "saturday",
                  "sunday"
                )
                .required(),

              from_time: joi
                .string()
                .pattern(/^([0-1]\d|2[0-3]):([0-5]\d)$/)
                .required(),

              to_time: joi
                .string()
                .pattern(/^([0-1]\d|2[0-3]):([0-5]\d)$/)
                .required(),
              available: joi.number(0, 1).required(),
            })
          )
          .min(1)
          .required(),
      };

      // Validate request body against schema
      let errors = await joiHelper.joiValidation(req.body, schema);
      if (errors) {
        return response.validationError("invalid request", res, errors);
      }

      next();
    } catch (err) {
      console.error("Validation Error: ", err);
      return response.exception("Server error occurred", res);
    }
  }

  /**
   * Validates forgot password request
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async forgotPassword(req, res, next) {
    console.log("ProviderValidator@forgotPassword");
    try {
      // Define validation schema for forgot password
      let schema = {
        phone_code: joi.string().pattern(/^\d+$/).required(),
        phone_number: joi.string().pattern(/^\d+$/).required(),
      };

      // Validate request body against schema
      let errors = await joiHelper.joiValidation(req.body, schema);
      if (errors) {
        return response.validationError("invalid request", res, errors[0]);
      }

      // Check if user exists and is a provider (no need to check ServiceProvider profile)
      const db = require("../../../startup/model");
      let user = await db.models.User.findOne({
        where: {
          phone_code: req.body.phone_code,
          phone_number: req.body.phone_number,
          user_type: "provider", // Ensure it's a provider user
        },
      });
      if (!user) {
        return response.validationError("Provider account not found", res, false);
      }

      next();
    } catch (err) {
      console.error("Validation Error: ", err);
      return response.exception("Server error occurred", res);
    }
  }



  /**
   * Validates password reset request
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async resetPassword(req, res, next) {
    console.log("ProviderValidator@resetPassword");
    try {
      // Define validation schema for password reset
      let schema = {
        phone_code: joi.string().pattern(/^\d{1,4}$/).required().messages({
          'string.pattern.base': 'Phone code must be 1-4 digits',
          'any.required': 'Phone code is required'
        }),
        phone_number: joi.string().pattern(/^\d{6,15}$/).required().messages({
          'string.pattern.base': 'Phone number must be 6-15 digits',
          'any.required': 'Phone number is required'
        }),
        password: joi
          .string()
          .required()
          .min(8)
          .pattern(
            new RegExp(
              "^(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$"
            )
          )
          .required()
          .messages({
            "string.empty": "Password is required.",
            "string.min": "Password must be at least 8 characters long.",
            "string.pattern.base":
              "Password must contain at least one uppercase letter, one number, and one special character.",
          }),
      };

      // Validate request body against schema
      let errors = await joiHelper.joiValidation(req.body, schema);
      if (errors) {
        return response.validationError("Validation failed", res, {
          error_code: 'VALIDATION_ERROR',
          details: errors[0]
        });
      }

      // Check if user exists and is a provider
      const db = require("../../../startup/model");
      let user = await db.models.User.findOne({
        where: {
          phone_code: req.body.phone_code,
          phone_number: req.body.phone_number,
          user_type: "provider", // Ensure it's a provider user
        },
      });
      if (!user) {
        return response.validationError("Provider account not found", res, {
          error_code: 'PROVIDER_NOT_FOUND',
          message: 'No provider account found with this phone number'
        });
      }

      next();
    } catch (err) {
      console.error("Validation Error: ", err);
      return response.exception("Server error occurred", res);
    }
  }

  /**
   * Validates get all providers request
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async getAllProviders(req, res, next) {
    console.log("ProviderValidator@getAllProviders");
    try {
      // Define validation schema for getting all providers
      let schema = {
        page: joi.number().optional(),
        limit: joi.number().optional(),
        status: joi.number().valid(1, 2, 3).optional(),
        search: joi.string().optional(),
        country: joi.number().optional(),
        city: joi.number().optional(),
        type: joi.number().valid(1, 2, 3).optional(),
        provider_type: joi.number().valid(1, 2, 3).optional(),
        sortBy: joi
          .string()
          .valid("first_name", "last_name", "created_at", "status")
          .default("created_at"),
        sortOrder: joi.string().valid("DESC", "ASC").default("DESC"),
      };

      // Validate query parameters against schema
      let errors = await joiHelper.joiValidation(req.query, schema);
      if (errors) {
        return response.validationError("invalid request", res, errors[0]);
      }

      next();
    } catch (err) {
      console.error("Validation Error: ", err);
      return response.exception("Server error occurred", res);
    }
  }

  /**
   * Validates provider profile action request
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async providerProfileAction(req, res, next) {
    console.log("ProviderValidator@providerProfileAction");
    console.log("Request body in validator:", req.body);
    console.log("Request params in validator:", req.params);
    try {
      // Validate provider_id from URL parameters
      const providerIdSchema = joi.number().integer().min(1).required().messages({
        'number.base': 'Provider ID must be a number',
        'number.integer': 'Provider ID must be an integer',
        'number.min': 'Provider ID must be greater than 0',
        'any.required': 'Provider ID is required'
      });

      const providerIdErrors = await joiHelper.joiValidation({ provider_id: req.params.provider_id }, { provider_id: providerIdSchema });
      if (providerIdErrors) {
        return response.validationError("Invalid provider ID", res, {
          error_code: 'INVALID_PROVIDER_ID',
          details: providerIdErrors[0]
        });
      }

      // Check if request body exists
      if (!req.body || Object.keys(req.body).length === 0) {
        return response.validationError("Request body is required", res, {
          error_code: 'MISSING_REQUEST_BODY',
          message: 'Request body must contain approval action'
        });
      }

      // Define validation schema for request body (without provider_id)
      let bodySchema = {
        approve: joi.number().valid(1, 2).required().messages({
          'number.base': 'Approval action must be a number',
          'any.only': 'Approval action must be 1 (approve) or 2 (reject)',
          'any.required': 'Approval action is required'
        }),
        reason: joi.string().when("approve", {
          is: 2,
          then: joi.string().min(10).max(1000).required().messages({
            'string.empty': 'Rejection reason is required when rejecting a profile',
            'string.min': 'Rejection reason must be at least 10 characters long',
            'string.max': 'Rejection reason cannot exceed 1000 characters',
            'any.required': 'Rejection reason is required when rejecting a profile'
          }),
          otherwise: joi.string().optional().allow(null, '')
        }),
      };

      // Validate request body against schema
      let bodyErrors = await joiHelper.joiValidation(req.body, bodySchema);
      if (bodyErrors) {
        return response.validationError("Validation failed", res, {
          error_code: 'VALIDATION_ERROR',
          details: bodyErrors[0]
        });
      }

      // Additional validation: Check if provider exists
      const db = require("../../../startup/model");
      const provider = await db.models.ServiceProvider.findByPk(req.params.provider_id);
      
      if (!provider) {
        return response.notFound("Provider not found", res, {
          error_code: 'PROVIDER_NOT_FOUND',
          message: 'No provider found with the specified ID'
        });
      }

      next();
    } catch (err) {
      console.error("Validation Error: ", err);
      return response.exception("Server error occurred", res);
    }
  }

  /**
   * Validates change provider status request
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async changeProviderStatus(req, res, next) {
    console.log("ProviderValidator@changeProviderStatus");
    try {
      // Check if request body exists
      if (!req.body || Object.keys(req.body).length === 0) {
        return response.validationError("Request body is required", res, {
          error_code: 'MISSING_REQUEST_BODY',
          message: 'Request body must contain provider_id and status'
        });
      }

      // Define validation schema for request body
      let schema = {
        provider_id: joi.number().integer().min(1).required().messages({
          'number.base': 'Provider ID must be a number',
          'number.integer': 'Provider ID must be an integer',
          'number.min': 'Provider ID must be greater than 0',
          'any.required': 'Provider ID is required'
        }),
        status: joi.number().valid(0, 1).required().messages({
          'number.base': 'Status must be a number',
          'any.only': 'Status must be 0 (inactive) or 1 (active)',
          'any.required': 'Status is required'
        })
      };

      // Validate request body against schema
      let errors = await joiHelper.joiValidation(req.body, schema);
      if (errors) {
        return response.validationError("Validation failed", res, {
          error_code: 'VALIDATION_ERROR',
          details: errors[0]
        });
      }

      // Additional validation: Check if provider exists
      const db = require("../../../startup/model");
      const provider = await db.models.ServiceProvider.findByPk(req.body.provider_id);
      
      if (!provider) {
        return response.notFound("Provider not found", res, {
          error_code: 'PROVIDER_NOT_FOUND',
          message: 'No provider found with the specified ID'
        });
      }

      next();
    } catch (err) {
      console.error("Validation Error: ", err);
      return response.exception("Server error occurred", res);
    }
  }

  /**
   * Validates get provider request
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async getProvider(req, res, next) {
    console.log("ProviderValidator@getProvider");
    try {
      // Define validation schema for getting a provider
      let schema = {
        provider_id: joi.number().required().min(1),
      };

      // Validate URL parameters against schema
      let errors = await joiHelper.joiValidation(req.params, schema);
      if (errors) {
        return response.validationError("invalid request", res, errors[0]);
      }

      next();
    } catch (err) {
      console.error("Validation Error: ", err);
      return response.exception("Server error occurred", res);
    }
  }

  /**
   * Validates provider profile update request
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async updateProvider(req, res, next) {
    console.log("ProviderValidator@updateProvider");
    try {
      // Define comprehensive validation schema for updating provider profile
      let schema = {
        // User fields
        first_name: joi.string().min(2).max(50).optional(),
        last_name: joi.string().min(2).max(50).optional(),
        full_name: joi.string().min(2).max(100).optional(),
        email: joi.string().email().optional(),
        gender: joi.number().valid(1, 2).optional(), // 1 = male, 2 = female
        profile_image: joi.string().uri().optional(),
        notification: joi.number().valid(0, 1).optional(),
        fcm_token: joi.string().optional(),
        
        // Provider fields
        provider_type: joi.string().valid('individual', 'salon').optional(),
        salon_name: joi.string().min(2).max(100).optional(),
        banner_image: joi.string().uri().optional(),
        description: joi.string().max(1000).optional(),
        national_id_image_url: joi.string().uri().optional(),
        freelance_certificate_image_url: joi.string().uri().optional(),
        commercial_registration_image_url: joi.string().uri().optional(),
        is_available: joi.number().valid(0, 1).optional(),
        subscription_id: joi.number().min(0).optional(),
        subscription_expiry: joi.date().optional(),
        
        // Address fields
        address: joi.string().max(500).optional(),
        latitude: joi.number().min(-90).max(90).optional(),
        longitude: joi.number().min(-180).max(180).optional(),
        country_id: joi.number().min(1).optional(),
        city_id: joi.number().min(1).optional(),
        
        // Bank fields
        account_holder_name: joi.string().min(2).max(100).optional(),
        bank_name: joi.string().min(2).max(100).optional(),
        iban: joi.string().min(10).max(50).optional(),
        
        // Availability fields
        availability: joi.array().items(
          joi.object({
            day: joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday').required(),
            from_time: joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
            to_time: joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
            available: joi.number().valid(0, 1).optional()
          })
        ).optional(),
        
        // Service list fields
        service_list: joi.array().items(
          joi.object({
            id: joi.number().min(1).required(),
            title: joi.string().min(1).max(200).optional(),
            price: joi.number().min(0).precision(2).optional(),
            description: joi.string().max(1000).optional(),
            service_image: joi.string().uri().optional(),
            status: joi.number().valid(0, 1).optional(),
            have_offers: joi.number().valid(0, 1).optional(),
            service_location: joi.number().valid(1, 2, 3).optional()
          })
        ).optional(),
      };

      // Validate request body against schema
      let errors = await joiHelper.joiValidation(req.body, schema);
      if (errors) {
        return response.validationError("Invalid update data", res, {
          error_code: 'VALIDATION_ERROR',
          message: errors[0],
          field: errors[0].path ? errors[0].path[0] : 'unknown'
        });
      }

      // Validate that at least one field is provided
      if (!req.body || Object.keys(req.body).length === 0) {
        return response.badRequest("No update data provided", res, {
          error_code: 'MISSING_UPDATE_DATA',
          message: 'Please provide at least one field to update'
        });
      }

      next();
    } catch (err) {
      console.error("Validation Error: ", err);
      return response.exception("Server error occurred", res);
    }
  }

  /**
   * Validates password change request
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async changePassword(req, res, next) {
    console.log("ProviderValidator@changePassword");
    try {
      // Define validation schema for password change
      let schema = {
        old_password: joi.string().required().messages({
          "string.empty": "Current password is required.",
          "any.required": "Current password is required."
        }),
        new_password: joi
          .string()
          .required()
          .min(8)
          .max(128)
          .pattern(
            new RegExp(
              "^(?=.*[A-Z])(?=.*[a-z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$"
            )
          )
          .messages({
            "string.empty": "New password is required.",
            "string.min": "New password must be at least 8 characters long.",
            "string.max": "New password cannot exceed 128 characters.",
            "string.pattern.base":
              "New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&).",
          }),
        confirm_password: joi.string().required().valid(joi.ref('new_password')).messages({
          "string.empty": "Password confirmation is required.",
          "any.only": "Password confirmation does not match the new password."
        })
      };

      // Validate request body against schema
      let errors = await joiHelper.joiValidation(req.body, schema);
      if (errors) {
        return response.validationError("Invalid request", res, errors[0]);
      }

      // Additional validation: ensure new password is different from old password
      if (req.body.old_password === req.body.new_password) {
        return response.validationError("New password must be different from current password", res, false);
      }

      next();
    } catch (err) {
      console.error("Validation Error: ", err);
      return response.exception("Server error occurred", res);
    }
  }

  /**
   * Validates account deletion request
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async deleteMyAccount(req, res, next) {
    console.log("ProviderValidator@deleteMyAccount");
    try {
      // Define validation schema for account deletion
      let schema = {
        password: joi.string().required(),
        reason_id: joi.number().optional(),
      };

      // Validate request body against schema
      let errors = await joiHelper.joiValidation(req.body, schema);
      if (errors) {
        return response.validationError("invalid request", res, errors[0]);
      }

      next();
    } catch (err) {
      console.error("Validation Error: ", err);
      return response.exception("Server error occurred", res);
    }
  }

  /**
   * Validates Step 1: Subscription Payment request
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async step1SubscriptionPayment(req, res, next) {
    console.log("ProviderValidator@step1SubscriptionPayment");
    try {
      // For Step 1, we accept empty body or any valid JSON
      // The user_id comes from the authenticated token
      
      // Check if step 1 is already completed using req.user.id
      const db = require("../../../startup/model");
      let serviceProvider = await db.models.ServiceProvider.findOne({
        where: { user_id: req.user.id }
      });

      if (serviceProvider && serviceProvider.step_completed >= 1) {
        return response.validationError("Step 1 (Subscription Payment) is already completed", res, false);
      }

      next();
    } catch (err) {
      console.error("Validation Error: ", err);
      return response.exception("Server error occurred", res);
    }
  }

  /**
   * Validates Step 2: Provider Type request
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async step2ProviderType(req, res, next) {
    console.log("ProviderValidator@step2ProviderType");
    try {
      // Define validation schema for provider type
      let schema = {
        provider_type: joi.string().valid('individual', 'salon').required()
      };

      // Validate request body against schema
      let errors = await joiHelper.joiValidation(req.body, schema);
      if (errors) {
        return response.validationError("invalid request", res, errors[0]);
      }

      // Check if ServiceProvider exists and step 1 is completed using req.user.id
      const db = require("../../../startup/model");
      let serviceProvider = await db.models.ServiceProvider.findOne({
        where: { user_id: req.user.id }
      });

      if (!serviceProvider) {
        return response.validationError("ServiceProvider record not found. Please complete Step 1 first.", res, false);
      }

      if (serviceProvider.step_completed < 1) {
        return response.validationError("Please complete Step 1 (Subscription Payment) first", res, false);
      }

      // Allow updates to provider type even if step is already completed
      // This enables users to change their provider type as needed

      next();
    } catch (err) {
      console.error("Validation Error: ", err);
      return response.exception("Server error occurred", res);
    }
  }

  /**
   * Validates Salon Details request
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async step3SalonDetails(req, res, next) {
    console.log("ProviderValidator@step3SalonDetails");
    console.log("Request body:", JSON.stringify(req.body, null, 2));
    console.log("Request files:", req.files ? Object.keys(req.files) : 'No files');
    try {
      // Handle string to number conversion for city_id and country_id (for form-data compatibility)
      if (req.body.city_id && typeof req.body.city_id === 'string') {
        req.body.city_id = parseInt(req.body.city_id, 10);
      }
      if (req.body.country_id && typeof req.body.country_id === 'string') {
        req.body.country_id = parseInt(req.body.country_id, 10);
      }
      if (req.body.banner_image_id && typeof req.body.banner_image_id === 'string') {
        req.body.banner_image_id = parseInt(req.body.banner_image_id, 10);
      }

      // Get ServiceProvider to check provider type for conditional validation
      const db = require("../../../startup/model");
      let serviceProvider = await db.models.ServiceProvider.findOne({
        where: { user_id: req.user.id }
      });

      // Define validation schema for salon details (conditional salon_name)
      let schema = {
        city_id: joi.number().integer().min(1).required(),
        country_id: joi.number().integer().min(1).required(),
        address: joi.string().required().min(10).max(500).trim(),
        description: joi.string().optional().allow(null, '').max(1000),
        banner_image_id: joi.number().integer().min(1).optional().allow(null)
      };

      // Add conditional salon_name validation
      if (serviceProvider && serviceProvider.provider_type === 'salon') {
        schema.salon_name = joi.string().required().min(2).max(100);
      } else {
        schema.salon_name = joi.string().optional().allow(null, '').min(2).max(100);
      }

      // Validate request body against schema
      let errors = await joiHelper.joiValidation(req.body, schema);
      if (errors) {
        return response.validationError("invalid request", res, errors[0]);
      }

      // Validate city and country exist
      if (req.body.city_id) {
        const city = await db.models.City.findByPk(req.body.city_id);
        if (!city || city.status !== 1) {
          return response.validationError("Invalid city selected", res, false);
        }
      }

      if (req.body.country_id) {
        const country = await db.models.Country.findByPk(req.body.country_id);
        if (!country || country.status !== 1) {
          return response.validationError("Invalid country selected", res, false);
        }
      }

      // Validate banner image ID if provided
      if (req.body.banner_image_id) {
        const bannerImage = await db.models.BannerImage.findByPk(req.body.banner_image_id);
        if (!bannerImage || bannerImage.is_active !== 1) {
          return response.validationError("Invalid banner image selected", res, false);
        }
      }

      // Check that either banner_image_id or banner_image file is provided
      const hasBannerImageId = req.body.banner_image_id && req.body.banner_image_id > 0;
      const hasBannerImageFile = req.files && req.files.banner_image && req.files.banner_image[0];
      
      if (!hasBannerImageId && !hasBannerImageFile) {
        return response.validationError("Banner image is required. Please provide either a predefined banner image ID or upload a custom banner image", res, false);
      }

      // If both are provided, prefer the file upload
      if (hasBannerImageId && hasBannerImageFile) {
        console.log("Both banner_image_id and banner_image file provided. File upload will take precedence.");
      }

      next();
    } catch (err) {
      console.error("Validation Error: ", err);
      return response.exception("Server error occurred", res);
    }
  }

  /**
   * Validates toggle availability request
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async toggleAvailability(req, res, next) {
    console.log("ProviderValidator@toggleAvailability");
    try {
      // No body validation needed for toggle - it's a simple toggle operation
      // The validation will be done in the controller to check provider status
      
      // Ensure provider exists and is authenticated
      if (!req.provider) {
        return response.validationError("Provider not found or not authenticated", res, false);
      }

      next();
    } catch (err) {
      console.error("Validation Error: ", err);
      return response.exception("Server error occurred", res);
    }
  }

}
