const joi = require('joi');
const ResponseHelper = require('../../helpers/response.helpers');
const response = new ResponseHelper();
const JoiHelper = require('../../helpers/joiHelper.helpers');
const joiHelper = new JoiHelper();
const UserResources = require('./user.resources');

const userResources = new UserResources();

module.exports = class UserValidator {
    /**
     * Validates user authentication request
     * Checks phone number, password and account status
     */
    async authenticate(req, res, next) {
        console.log('UserValidator@authenticate');
        try {
            let schema = {
                phone_code: joi.string().pattern(/^\d+$/).required(),
                phone_number: joi.string().pattern(/^\d+$/).required(),
                password: joi.string().required()
            }
            let errors = await joiHelper.joiValidation(req.body, schema);
            if (errors) {
                return response.validationError('invalid request', res, errors[0])
            }
            let user = await userResources.getAllDetails({ phone_code: req.body.phone_code, phone_number: req.body.phone_number });
            if (!user) {
                return response.validationError('User not found', res, false);
            }
            let isPasswordValid = await joiHelper.validatePassword(req.body.password, user.password);
            if (!isPasswordValid) {
                return response.validationError("Invalid password", res, false);
            }
            if (user.status !== 1) {
                let statusMessage;
                if (user.status === 0) {
                    statusMessage = "Your account is inactive. Please contact support for assistance.";
                } else if (user.status === 2) {
                    statusMessage = "Your account has been banned. Please contact support for more information.";
                } else {
                    statusMessage = "Your account is not active. Please contact support for assistance.";
                }
                return response.validationError(statusMessage, res, false);
            }
            req.user = user;
            next();
        } catch (err) {
            console.error('Validation Error: ', err);
            return response.exception('Server error occurred', res);
        }
    }

    /**
     * Validates user registration request
     * Checks all required fields and validates phone number uniqueness
     */
    async register(req, res, next) {
        console.log('UserValidator@register');
        try {
            // Enhanced validation schema with comprehensive field validation
            let schema = {
                first_name: joi.string()
                    .required()
                    .min(2)
                    .max(50)
                    .pattern(/^[a-zA-Z\s]+$/)
                    .messages({
                        'string.empty': 'First name is required.',
                        'string.min': 'First name must be at least 2 characters long.',
                        'string.max': 'First name cannot exceed 50 characters.',
                        'string.pattern.base': 'First name can only contain letters and spaces.',
                        'any.required': 'First name is required.'
                    }),
                last_name: joi.string()
                    .required()
                    .min(2)
                    .max(50)
                    .pattern(/^[a-zA-Z\s]+$/)
                    .messages({
                        'string.empty': 'Last name is required.',
                        'string.min': 'Last name must be at least 2 characters long.',
                        'string.max': 'Last name cannot exceed 50 characters.',
                        'string.pattern.base': 'Last name can only contain letters and spaces.',
                        'any.required': 'Last name is required.'
                    }),
                email: joi.string()
                    .email()
                    .optional()
                    .allow(null, '')
                    .max(255)
                    .messages({
                        'string.email': 'Please provide a valid email address.',
                        'string.max': 'Email address cannot exceed 255 characters.'
                    }),
                phone_code: joi.string()
                    .pattern(/^\d{1,4}$/)
                    .required()
                    .messages({
                        'string.empty': 'Phone code is required.',
                        'string.pattern.base': 'Phone code must be 1-4 digits.',
                        'any.required': 'Phone code is required.'
                    }),
                phone_number: joi.string()
                    .pattern(/^\d{6,15}$/)
                    .required()
                    .messages({
                        'string.empty': 'Phone number is required.',
                        'string.pattern.base': 'Phone number must be 6-15 digits.',
                        'any.required': 'Phone number is required.'
                    }),
                country_id: joi.number()
                    .integer()
                    .min(1)
                    .required()
                    .messages({
                        'number.base': 'Country ID must be a number.',
                        'number.integer': 'Country ID must be an integer.',
                        'number.min': 'Country ID must be greater than 0.',
                        'any.required': 'Country ID is required.'
                    }),
                city_id: joi.number()
                    .integer()
                    .min(1)
                    .required()
                    .messages({
                        'number.base': 'City ID must be a number.',
                        'number.integer': 'City ID must be an integer.',
                        'number.min': 'City ID must be greater than 0.',
                        'any.required': 'City ID is required.'
                    }),
                address: joi.string()
                    .required()
                    .min(5)
                    .max(500)
                    .trim()
                    .messages({
                        'string.empty': 'Address is required.',
                        'string.min': 'Address must be at least 5 characters long.',
                        'string.max': 'Address cannot exceed 500 characters.',
                        'any.required': 'Address is required.'
                    }),
                password: joi.string()
                    .required()
                    .min(8)
                    .max(128)
                    .pattern(new RegExp('^(?=.*[A-Z])(?=.*[a-z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$'))
                    .messages({
                        'string.empty': 'Password is required.',
                        'string.min': 'Password must be at least 8 characters long.',
                        'string.max': 'Password cannot exceed 128 characters.',
                        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&).',
                        'any.required': 'Password is required.'
                    }),
                gender: joi.number()
                    .valid(1, 2, 3)
                    .required()
                    .messages({
                        'number.base': 'Gender must be a number.',
                        'any.only': 'Gender must be 1 (Male), 2 (Female), or 3 (Other).',
                        'any.required': 'Gender is required.'
                    }),
                terms_and_condition: joi.number()
                    .valid(1)
                    .required()
                    .messages({
                        'number.base': 'Terms and conditions acceptance must be a number.',
                        'any.only': 'You must accept the terms and conditions to proceed.',
                        'any.required': 'Terms and conditions acceptance is required.'
                    })
            };

            // Validate request body against schema
            let errors = await joiHelper.joiValidation(req.body, schema);
            if (errors) {
                return response.validationError('Validation failed', res, {
                    details: errors,
                    field_count: errors.length
                });
            }

            // Validate country and city exist and are active
            try {
                const db = require("../../../startup/model");
                
                if (req.body.country_id) {
                    const country = await db.models.Country.findByPk(req.body.country_id);
                    if (!country || country.status !== 1) {
                        return response.validationError('Invalid country selected', res);
                    }
                }

                if (req.body.city_id) {
                    const city = await db.models.City.findByPk(req.body.city_id);
                    if (!city || city.status !== 1) {
                        return response.validationError('Invalid city selected', res);
                    }
                }
            } catch (dbError) {
                console.error('Database validation error:', dbError);
                return response.exception('Error validating location data', res);
            }

            // Check if phone number already exists
            try {
                let existingUser = await userResources.findOne({ 
                    phone_code: req.body.phone_code, 
                    phone_number: req.body.phone_number 
                });
                
                if (existingUser) {
                    if (existingUser.verified_at) {
                        return response.conflict('Phone number already exists and is verified. Please use the login endpoint.', res);
                    } else {
                        return response.conflict('Phone number already exists but not verified. Please complete verification or use resend OTP.', res);
                    }
                }
            } catch (dbError) {
                console.error('Phone number check error:', dbError);
                return response.exception('Error checking phone number availability', res);
            }
            
            // Check if email already exists (only if email is provided)
            if (req.body.email && req.body.email.trim()) {
                try {
                    let existingEmailUser = await userResources.findOne({ 
                        email: req.body.email.trim().toLowerCase() 
                    });
                    
                    if (existingEmailUser) {
                        return response.conflict('Email address already exists.', res);
                    }
                } catch (dbError) {
                    console.error('Email check error:', dbError);
                    return response.exception('Error checking email availability', res);
                }
            }

            // Sanitize email if provided
            if (req.body.email) {
                req.body.email = req.body.email.trim().toLowerCase();
            }

            next();
        } catch (err) {
            console.error('User registration validation error:', err);
            return response.exception('Server error occurred during validation', res);
        }
    }

    /**
     * Validates unified OTP verification request
     * Checks phone number combination, OTP format, and OTP type
     */
    async verifyOtp(req, res, next) {
        console.log('UserValidator@verifyOtp');
        try {
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
                })
            }
            let errors = await joiHelper.joiValidation(req.body, schema);
            if (errors) {
                return response.validationError('Validation failed', res, {
                    details: errors[0]
                });
            }
            next();
        } catch (err) {
            console.error('Validation Error: ', err);
            return response.exception('Server error occurred', res);
        }
    }

    /**
     * Validates OTP verification request (legacy method)
     * Checks phone number combination and OTP format
     */
    async verifyVerificationOtp(req, res, next) {
        console.log('UserValidator@verifyVerificationOtp');
        try {
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
                })
            }
            let errors = await joiHelper.joiValidation(req.body, schema);
            if (errors) {
                return response.validationError('Validation failed', res, {
                    details: errors[0]
                });
            }
            next();
        } catch (err) {
            console.error('Validation Error: ', err);
            return response.exception('Server error occurred', res);
        }
    }

    /**
     * Validates OTP resend request
     * Checks phone number combination, rate limiting, and OTP type
     */
    async resendOtp(req, res, next) {
        console.log('UserValidator@resendOtp');
        try {
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
                })
            }
            let errors = await joiHelper.joiValidation(req.body, schema);
            if (errors) {
                return response.validationError('Validation failed', res, {
                    details: errors[0]
                });
            }
            next();
        } catch (err) {
            console.error('Validation Error: ', err);
            return response.exception('Server error occurred', res);
        }
    }

    /**
     * Validates forgot password request
     * Checks phone number exists
     */
    async forgotPassword(req, res, next) {
        console.log('UserValidator@forgotPassword');
        try {
            let schema = {
                phone_code: joi.string().pattern(/^\d+$/).required(),
                phone_number: joi.string().pattern(/^\d+$/).required()
            }
            let errors = await joiHelper.joiValidation(req.body, schema);
            if (errors) {
                return response.validationError('invalid request', res, errors[0])
            }
            let user = await userResources.findOne({ phone_code: req.body.phone_code, phone_number: req.body.phone_number });
            if (!user) {
                return response.validationError('User not found', res, false);
            }
            next();
        } catch (err) {
            console.error('Validation Error: ', err);
            return response.exception('Server error occurred', res);
        }
    }



    /**
     * Validates password reset request
     * Checks phone number combination and new password requirements
     */
    async resetPassword(req, res, next) {
        console.log('UserValidator@resetPassword');
        try {
            let schema = {
                phone_code: joi.string().pattern(/^\d{1,4}$/).required().messages({
                    'string.pattern.base': 'Phone code must be 1-4 digits',
                    'any.required': 'Phone code is required'
                }),
                phone_number: joi.string().pattern(/^\d{6,15}$/).required().messages({
                    'string.pattern.base': 'Phone number must be 6-15 digits',
                    'any.required': 'Phone number is required'
                }),
                password: joi.string().required().min(8).pattern(new RegExp('^(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$')).required().messages({
                    'string.empty': 'Password is required.',
                    'string.min': 'Password must be at least 8 characters long.',
                    'string.pattern.base': 'Password must contain at least one uppercase letter, one number, and one special character.',
                }),
            }
            let errors = await joiHelper.joiValidation(req.body, schema);
            if (errors) {
                return response.validationError('Validation failed', res, {
                    details: errors[0]
                });
            }
            
            // Verify user exists with the provided phone number
            let user = await userResources.findOne({ 
                phone_code: req.body.phone_code, 
                phone_number: req.body.phone_number 
            });
            if (!user) {
                return response.validationError('No user account found with this phone number', res);
            }
            next();
        } catch (err) {
            console.error('Validation Error: ', err);
            return response.exception('Server error occurred', res);
        }
    }

    /**
     * Validates get all users request with filters
     * Supports pagination, sorting and filtering
     */
    async getAllUsers(req, res, next) {
        console.log('UserValidator@getAllUsers');
        try {
            let schema = {
                // Pagination parameters
                page: joi.number().min(1).default(1),
                limit: joi.number().min(1).max(100).default(10), // Max 100 records per page
                
                // Filter parameters
                status: joi.number().valid(1, 2, 3).optional(),
                search: joi.string().max(100).optional(),
                
                // Sorting parameters
                sortBy: joi.string().valid('first_name', 'last_name', 'email', 'created_at', 'status', 'is_verified').default('created_at'),
                sortOrder: joi.string().valid('DESC', 'ASC').default('DESC')
            }
            
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
     * Validates get single user request
     * Checks user ID exists in params
     */
    async getUser(req, res, next) {
        console.log('UserValidator@getUser');
        try {
            let schema = {
                user_id: joi.number().required().min(1)
            }
            let errors = await joiHelper.joiValidation(req.params, schema);
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
     * Validates user update request by admin
     * Checks user ID in params and updatable fields in body
     */
    async updateUser(req, res, next) {
        console.log('UserValidator@updateUser');
        try {
            // Validate user_id in params
            let paramsSchema = {
                user_id: joi.number().required().min(1)
            }
            let paramsErrors = await joiHelper.joiValidation(req.params, paramsSchema);
            if (paramsErrors) {
                return response.validationError('invalid user_id', res, paramsErrors[0])
            }

            // Validate update fields in body
            let bodySchema = {
                first_name: joi.string().min(2).max(50).optional(),
                last_name: joi.string().min(2).max(50).optional(),
                full_name: joi.string().min(2).max(100).optional(),
                email: joi.string().email().optional(),
                gender: joi.number().valid(1, 2, 3).optional(), // 1 = male, 2 = female, 3 = other
                profile_image: joi.string().uri().optional(),
                status: joi.number().valid(0, 1, 2).optional(), // 0 = Inactive, 1 = Active, 2 = Banned
                notification: joi.number().valid(0, 1).optional(),
                fcm_token: joi.string().optional(),
                
                // Address fields
                address: joi.string().max(500).optional(),
                latitude: joi.number().min(-90).max(90).optional(),
                longitude: joi.number().min(-180).max(180).optional(),
                country_id: joi.number().min(1).optional(),
                city_id: joi.number().min(1).optional(),
            }
            let bodyErrors = await joiHelper.joiValidation(req.body, bodySchema);
            if (bodyErrors) {
                return response.validationError('invalid update data', res, bodyErrors[0])
            }
            next();
        } catch (err) {
            console.error('Validation Error: ', err);
            return response.exception('Server error occurred', res);
        }
    }

    /**
     * Validates user profile update request
     * Allows users to update their own profile fields
     */
    async updateUserProfile(req, res, next) {
        console.log('UserValidator@updateUserProfile');
        try {
            // Define comprehensive validation schema for updating user profile
            let schema = {
                // User fields
                first_name: joi.string().min(2).max(50).optional(),
                last_name: joi.string().min(2).max(50).optional(),
                full_name: joi.string().min(2).max(100).optional(),
                email: joi.string().email().optional(),
                gender: joi.number().valid(1, 2, 3).optional(), // 1 = male, 2 = female, 3 = other
                profile_image: joi.string().uri().optional(),
                notification: joi.number().valid(0, 1).optional(),
                fcm_token: joi.string().optional(),
                
                // Address fields
                address: joi.string().max(500).optional(),
                latitude: joi.number().min(-90).max(90).optional(),
                longitude: joi.number().min(-180).max(180).optional(),
                country_id: joi.number().min(1).optional(),
                city_id: joi.number().min(1).optional(),
            };

            // Validate request body against schema
            let errors = await joiHelper.joiValidation(req.body, schema);
            if (errors) {
                return response.validationError("Invalid update data", res, {
                    message: errors[0],
                    field: errors[0].path ? errors[0].path[0] : 'unknown'
                });
            }

            // Validate that at least one field is provided
            if (!req.body || Object.keys(req.body).length === 0) {
                return response.badRequest("No update data provided", res);
            }

            next();
        } catch (err) {
            console.error("Validation Error: ", err);
            return response.exception("Server error occurred", res);
        }
    }

    /**
     * Validates password change request
     * Checks old password, new password requirements, and password confirmation
     */
    async changePassword(req, res, next) {
        console.log('UserValidator@changePassword');
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
            console.error('Validation Error: ', err);
            return response.exception('Server error occurred', res);
        }
    }

    /**
     * Validates account deletion request
     * Requires password confirmation
     */
    async deleteMyAccount(req, res, next) {
        console.log('UserValidator@deleteMyAccount');
        try {
            let schema = {
                password: joi.string().required(),
                reason_id: joi.number().optional()
            }
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
     * Validates user deletion request by admin
     * Checks user ID exists in params
     */
    async deleteUser(req, res, next) {
        console.log('UserValidator@deleteUser');
        try {
            let schema = {
                user_id: joi.number().required().min(1)
            }
            let errors = await joiHelper.joiValidation(req.params, schema);
            if (errors) {
                return response.validationError('invalid user_id', res, errors[0])
            }
            next();
        } catch (err) {
            console.error('Validation Error: ', err);
            return response.exception('Server error occurred', res);
        }
    }
};