const joi = require('joi');
const ResponseHelper = require('../../helpers/response.helpers');
const response = new ResponseHelper();
const JoiHelper = require('../../helpers/joiHelper.helpers');
const joiHelper = new JoiHelper();
const ProviderResources = require('./provider.resources');

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
        console.log('ProviderValidator@authenticate');
        try {
            // Define validation schema for authentication
            let schema = {
                phone_code: joi.string().pattern(/^\d+$/).required(),
                phone_number: joi.string().pattern(/^\d+$/).required(),
                password: joi.string().required()
            }
            
            // Validate request body against schema
            let errors = await joiHelper.joiValidation(req.body, schema);
            if (errors) {
                return response.validationError('invalid request', res, errors[0])
            }
            
            // Check if provider exists
            let provider = await providerResources.getAllDetails({phone_code: req.body.phone_code, phone_number: req.body.phone_number});
            if (!provider) {
                return response.validationError('Provider not found', res, false);
            }
            
            // Validate password
            let isPasswordValid = await joiHelper.validatePassword(req.body.password, provider.password);
            if (!isPasswordValid) {
                return response.validationError("Invalid password", res, false);
            }
            
            // Check if profile is verified by admin
            if (provider.step_completed == 6 && provider.admin_verified != 1) {
                return response.validationError('Wait for the admin to verify your profile', res, null);
            }
            
            // Check if account is active
            if (provider.status !== 1) {
                return response.validationError("Your account is not active", res, false);
            }
            
            // Attach provider to request object and proceed
            req.provider = provider;
            next();
        } catch (err) {
            console.error('Validation Error: ', err);
            return response.exception('Server error occurred', res);
        }
    }

    /**
     * Validates provider registration request
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next middleware function
     */
    async register(req, res, next) {
        console.log('ProviderValidator@register');
        try {
            // Define validation schema for registration
            let schema = {
                first_name: joi.string().required(),
                last_name: joi.string().required(),
                email: joi.string().email().optional(),
                phone_code: joi.string().pattern(/^\d+$/).required(),
                phone_number: joi.string().pattern(/^\d+$/).required(),
                password: joi.string().required().min(8).pattern(new RegExp('^(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$')).required().messages({
                    'string.empty': 'Password is required.',
                    'string.min': 'Password must be at least 8 characters long.',
                    'string.pattern.base': 'Password must contain at least one uppercase letter, one number, and one special character.',
                }),
                gender: joi.number().valid(1, 2, 3).required(),
                terms_and_condition: joi.number().valid(1).required(),
            }
    
            // Validate request body against schema
            let errors = await joiHelper.joiValidation(req.body, schema);
            if (errors) {
                return response.validationError('invalid request', res, errors[0])
            }
            
            // Check if phone number already exists
            let provider = await providerResources.findOne({phone_code: req.body.phone_code, phone_number: req.body.phone_number});
            if (provider && provider.verified_at) {
                return response.badRequest('Phone number already exists.', res);
            }
            
            next();
        } catch (err) {
            console.error('Validation Error: ', err);
            return response.exception('Server error occurred', res);
        }
    }

    /**
     * Validates OTP verification request
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next middleware function
     */
    async verifyVerificationOtp(req, res, next) {
        console.log('ProviderValidator@register');
        try {
            // Define validation schema for OTP verification
            let schema = {
                provider_id: joi.number().required().min(1),
                otp: joi.string().length(4).pattern(/^\d+$/).required()
            }
            
            // Validate request body against schema
            let errors = await joiHelper.joiValidation(req.body, schema);
            if (errors) {
                return response.validationError('invalid request', res, errors[0])
            }
            
            next();
        } catch (err) {
            console.error('Validation Error: ', err);
            return response.exception('Server error occurred', res);
        }
    }

    /**
     * Validates OTP resend request
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next middleware function
     */
    async resendOtp(req, res, next) {
        console.log('ProviderValidator@resendOtp');
        try {
            // Define validation schema for OTP resend
            let schema = {
                provider_id: joi.number().required().min(1)
            }
            
            // Validate request body against schema
            let errors = await joiHelper.joiValidation(req.body, schema);
            if (errors) {
                return response.validationError('invalid request', res, errors[0])
            }
            
            next();
        } catch (err) {
            console.error('Validation Error: ', err);
            return response.exception('Server error occurred', res);
        }
    }
    
    /**
     * Validates provider type setting request
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next middleware function
     */
    async setProviderType(req, res, next) {
        console.log('ProviderValidator@setServiceDetails');
        try {
            // Define validation schema for provider type
            let schema = {
                provider_type: joi.number().valid(1, 2).required(),
            };
            
            // Validate request body against schema
            let errors = await joiHelper.joiValidation(req.body, schema);
            if (errors) {
                return response.validationError('invalid request', res, errors[0])
            }
            
            next();
        } catch (err) {
            console.error('Validation Error: ', err);
            return response.exception('Server error occurred', res);
        }
    }

    /**
     * Validates service details setting request
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next middleware function
     */
    async setServiceDetails(req, res, next) {
        console.log('ProviderValidator@setServiceDetails');
        try {
            // Define validation schema for service details
            let schema = {
                salon_name: joi.string().optional().allow(null),
                country_id: joi.number().optional(),
                city_id: joi.number().optional(),
                banner_image: joi.string().optional().allow(null),
                description: joi.string().optional().allow(null)
            };
            
            // Validate request body against schema
            let errors = await joiHelper.joiValidation(req.body, schema);
            if (errors) {
                return response.validationError('invalid request', res, errors[0])
            }
            
            next();
        } catch (err) {
            console.error('Validation Error: ', err);
            return response.exception('Server error occurred', res);
        }
    }

    /**
     * Validates document details setting request
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next middleware function
     */
    async setDocumentDetails(req, res, next) {
        console.log('ProviderValidator@setServiceDetails');
        try {
            console.log(req.provider.provider_type);
            
            // Define validation schema for document details
            let schema = {
                national_id: joi.string().uri().required(),
                bank_account_name: joi.string().required(),
                bank_name: joi.string().required(),
                account_number: joi.string().required(),
                freelance_certificate: joi.string().uri().optional().allow(null),
                commertial_certificate: joi.string().uri().optional().allow(null),
                is_vat_applicable: joi.number().valid(0, 1).required(),
                vat_number: joi.string().allow(null).when('is_vat_applicable', {
                    is: 1,
                    then: joi.required().messages({'any.required': 'vat_number is required when VAT is applicable'}),
                    otherwise: joi.optional(),
                }),
                vat_amount: joi.number().allow(null).when('is_vat_applicable', {
                    is: 1,
                    then: joi.required().messages({'any.required': 'vat_amount is required when VAT is applicable'}),
                    otherwise: joi.optional(),
                })
            };
            
            // Validate request body against schema
            let errors = await joiHelper.joiValidation(req.body, schema);
            if (errors) {
                return response.validationError('invalid request', res, errors[0])
            }
            
            next();
        } catch (err) {
            console.error('Validation Error: ', err);
            return response.exception('Server error occurred', res);
        }
    }

    /**
     * Validates availability setting request
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next middleware function
     */
    async setAvailability(req, res, next) {
        console.log('ProviderValidator@setAvailability');
        try {
            // Define validation schema for availability
            let schema = {
                availbilty: joi.array().items(
                    joi.object({
                        day: joi.string()
                            .valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')
                            .required(),
            
                        from_time: joi.string()
                            .pattern(/^([0-1]\d|2[0-3]):([0-5]\d)$/)
                            .required(),
            
                        to_time: joi.string()
                            .pattern(/^([0-1]\d|2[0-3]):([0-5]\d)$/)
                            .required(),
                        available: joi.number(0,1).required()
                    })
                ).min(1).required()
            };
            
            // Validate request body against schema
            let errors = await joiHelper.joiValidation(req.body, schema);
            if (errors) {
                return response.validationError('invalid request', res, errors);
            }
            
            next();
        } catch (err) {
            console.error('Validation Error: ', err);
            return response.exception('Server error occurred', res);
        }
    }

    /**
     * Validates forgot password request
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next middleware function
     */
    async forgotPassword(req, res, next) {
        console.log('ProviderValidator@forgotPassword');
        try {
            // Define validation schema for forgot password
            let schema = {
                phone_code: joi.string().pattern(/^\d+$/).required(),
                phone_number: joi.string().pattern(/^\d+$/).required()
            }
            
            // Validate request body against schema
            let errors = await joiHelper.joiValidation(req.body, schema);
            if (errors) {
                return response.validationError('invalid request', res, errors[0])
            }
            
            // Check if provider exists
            let provider = await providerResources.findOne({phone_code: req.body.phone_code, phone_number: req.body.phone_number});
            if (!provider) {
                return response.validationError('Provider not found', res, false);
            }
            
            next();
        } catch (err) {
            console.error('Validation Error: ', err);
            return response.exception('Server error occurred', res);
        }
    }

    /**
     * Validates forgot password OTP verification request
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next middleware function
     */
    async verifyForgotPasswordOtp(req, res, next) {
        console.log('ProviderValidator@verifyForgotPasswordOtp');
        try {
            // Define validation schema for forgot password OTP verification
            let schema = {
                provider_id: joi.number().required().min(1),
                otp: joi.string().length(4).pattern(/^\d+$/).required()
            }
            
            // Validate request body against schema
            let errors = await joiHelper.joiValidation(req.body, schema);
            if (errors) {
                return response.validationError('invalid request', res, errors[0])
            }
            
            next();
        } catch (err) {
            console.error('Validation Error: ', err);
            return response.exception('Server error occurred', res);
        }
    }

    /**
     * Validates password reset request
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next middleware function
     */
    async resetPassword(req, res, next) {
        console.log('ProviderValidator@resetPassword');
        try {
            // Define validation schema for password reset
            let schema = {
                provider_id: joi.number().required().min(1),
                password: joi.string().required().min(8).pattern(new RegExp('^(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$')).required().messages({
                    'string.empty': 'Password is required.',
                    'string.min': 'Password must be at least 8 characters long.',
                    'string.pattern.base': 'Password must contain at least one uppercase letter, one number, and one special character.',
                })
            }
            
            // Validate request body against schema
            let errors = await joiHelper.joiValidation(req.body, schema);
            if (errors) {
                return response.validationError('invalid request', res, errors[0])
            }
            
            next();
        } catch (err) {
            console.error('Validation Error: ', err);
            return response.exception('Server error occurred', res);
        }
    }

    /**
     * Validates get all providers request
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next middleware function
     */
    async getAllProviders(req, res, next) {
        console.log('ProviderValidator@getAllProviders');
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
                sortBy: joi.string().valid('first_name', 'last_name', 'created_at', 'status').default('created_at'),
                sortOrder: joi.string().valid('DESC', 'ASC').default('DESC')
            }
            
            // Validate query parameters against schema
            let errors = await joiHelper.joiValidation(req.query, schema);
            if (errors) {
                return response.validationError('invalid request', res, errors[0])
            }
            
            next();
        } catch (err) {
            console.error('Validation Error: ', err);
            return response.exception('Server error occurred', res);
        }
    }

    /**
     * Validates provider profile action request
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next middleware function
     */
    async providerProfileAction(req, res, next) {
        console.log('ProviderValidator@providerProfileAction');
        try {
            // Define validation schema for profile action
            let schema = {
                provider_id: joi.number().optional(),
                approve: joi.number().valid(1, 2).default(1).required(),
                reason: joi.string().when('approve', {
                    is: 2,
                    then: joi.string().required(),
                    otherwise: joi.string().optional()
                }),
            }
            
            // Validate request body against schema
            let errors = await joiHelper.joiValidation(req.body, schema);
            if (errors) {
                return response.validationError('invalid request', res, errors[0])
            }
            
            next();
        } catch (err) {
            console.error('Validation Error: ', err);
            return response.exception('Server error occurred', res);
        }
    }
    
    /**
     * Validates get provider request
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next middleware function
     */
    async getProvider(req, res, next) {
        console.log('ProviderValidator@getProvider');
        try {
            // Define validation schema for getting a provider
            let schema = {
                provider_id: joi.number().required().min(1)
            }
            
            // Validate query parameters against schema
            let errors = await joiHelper.joiValidation(req.query, schema);
            if (errors) {
                return response.validationError('invalid request', res, errors[0])
            }
            
            next();
        } catch (err) {
            console.error('Validation Error: ', err);
            return response.exception('Server error occurred', res);
        }
    }

    /**
     * Validates provider update request
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next middleware function
     */
    async updateProvider(req, res, next) {
        console.log('ProviderValidator@updateProvider');
        try {
            // Define validation schema for updating provider
            let schema = {
                provider_id: joi.number().required().min(1),
                first_name: joi.string().optional(),
                last_name: joi.string().optional(),
                email: joi.string().email().optional(),
                country_id: joi.number().min(1).optional(),
                city_id: joi.number().min(1).optional(),
                status: joi.number().valid(1, 2, 3).optional()
            }
            
            // Validate request body against schema
            let errors = await joiHelper.joiValidation(req.body, schema);
            if (errors) {
                return response.validationError('invalid request', res, errors[0])
            }
            
            next();
        } catch (err) {
            console.error('Validation Error: ', err);
            return response.exception('Server error occurred', res);
        }
    }

    /**
     * Validates password change request
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next middleware function
     */
    async changePassword(req, res, next) {
        console.log('ProviderValidator@changePassword');
        try {
            // Define validation schema for password change
            let schema = {
                old_password: joi.string().required(),
                new_password: joi.string().required().min(8).pattern(new RegExp('^(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$')).required().messages({
                    'string.empty': 'Password is required.',
                    'string.min': 'Password must be at least 8 characters long.',
                    'string.pattern.base': 'Password must contain at least one uppercase letter, one number, and one special character.',
                })
            }
            
            // Validate request body against schema
            let errors = await joiHelper.joiValidation(req.body, schema);
            if (errors) {
                return response.validationError('invalid request', res, errors[0])
            }
            
            next();
        } catch (err) {
            console.error('Validation Error: ', err);
            return response.exception('Server error occurred', res);
        }
    }

    /**
     * Validates account deletion request
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next middleware function
     */
    async deleteMyAccount(req, res, next) {
        console.log('ProviderValidator@deleteMyAccount');
        try {
            // Define validation schema for account deletion
            let schema = {
                password: joi.string().required(),
                reason_id: joi.number().optional()
            }
            
            // Validate request body against schema
            let errors = await joiHelper.joiValidation(req.body, schema);
            if (errors) {
                return response.validationError('invalid request', res, errors[0])
            }
            
            next();
        } catch (err) {
            console.error('Validation Error: ', err);
            return response.exception('Server error occurred', res);
        }
    }
};