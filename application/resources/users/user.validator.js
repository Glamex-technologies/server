const joi = require('joi');
const ResponseHelper = require('../../helpers/response.helpers');
const response = new ResponseHelper();
const JoiHelper = require('../../helpers/joiHelper.helpers');
const joiHelper = new JoiHelper();
const UserResources = require('./user.resources');

const userResources = new UserResources();

module.exports = class UserValidator {
    // Authentication validation moved to AuthValidator for unified login

    /**
     * Validates user registration request
     * Checks all required fields and validates phone number uniqueness
     */
    async register(req, res, next) {
        console.log('UserValidator@register');
        try {
            let schema = {
                first_name: joi.string().required(),
                last_name: joi.string().required(),
                email: joi.string().email().optional().allow(null),
                phone_code: joi.string().pattern(/^\d+$/).required(),
                phone_number: joi.string().pattern(/^\d+$/).required(),
                country_id: joi.number().min(1).required(),
                city_id: joi.number().min(1).required(),
                password: joi.string().required().min(8).pattern(new RegExp('^(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$')).required().messages({
                    'string.empty': 'Password is required.',
                    'string.min': 'Password must be at least 8 characters long.',
                    'string.pattern.base': 'Password must contain at least one uppercase letter, one number, and one special character.',
                }),
                gender: joi.number().valid(1, 2, 3).required(),
                terms_and_condition: joi.number().valid(1).required(),
            }

            let errors = await joiHelper.joiValidation(req.body, schema);
            if (errors) {
                return response.validationError('invalid request', res, errors[0])
            }
            // Check if phone number already exists
            let user = await userResources.findOne({ phone_code: req.body.phone_code, phone_number: req.body.phone_number });
            if (user && user.is_verified) {
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
     * Checks user ID and OTP format
     */
    async verifyVerificationOtp(req, res, next) {
        console.log('UserValidator@register');
        try {
            let schema = {
                user_id: joi.number().required().min(1),
                otp: joi.string().length(4).pattern(/^\d+$/).required()
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
     * Validates OTP resend request
     * Checks user ID exists
     */
    async resendOtp(req, res, next) {
        console.log('UserValidator@resendOtp');
        try {
            let schema = {
                user_id: joi.number().required().min(1)
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

    // Forgot password validation methods moved to AuthValidator for unified authentication

    /**
     * Validates get all users request with filters
     * Supports pagination, sorting and filtering
     */
    async getAllUsers(req, res, next) {
        console.log('ProviderValidator@getAllUsers');
        try {
            let schema = {
                page: joi.number().optional(),
                limit: joi.number().optional(),
                status: joi.number().valid(1, 2, 3).optional(),
                country: joi.number().optional(),
                city: joi.number().optional(),
                search: joi.string().optional(),
                sortBy: joi.string().valid('first_name', 'last_name', 'created_at', 'status').default('created_at'),
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
     * Checks user ID exists
     */
    async getUser(req, res, next) {
        console.log('UserValidator@getUser');
        try {
            let schema = {
                user_id: joi.number().required().min(1)
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
     * Validates user update request
     * Checks all updatable fields
     */
    async updateUser(req, res, next) {
        console.log('UserValidator@updateUser');
        try {
            let schema = {
                user_id: joi.number().required().min(1),
                first_name: joi.string().optional(),
                last_name: joi.string().optional(),
                email: joi.string().email().optional().allow(null),
                country_id: joi.number().min(1).optional(),
                city_id: joi.number().min(1).optional(),
                profile_image: joi.string().optional().allow(null),
                status: joi.number().valid(1, 2, 3).optional(), // 1 active 2 inactive 3 block
                gender: joi.number().valid(1, 2, 3).optional() // 1 active 2 inactive 3 block
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
     * Validates password change request
     * Checks old password and new password requirements
     */
    async changePassword(req, res, next) {
        console.log('UserValidator@changePassword');
        try {
            let schema = {
                old_password: joi.string().required(),
                new_password: joi.string().required().min(8).pattern(new RegExp('^(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$')).required().messages({
                    'string.empty': 'Password is required.',
                    'string.min': 'Password must be at least 8 characters long.',
                    'string.pattern.base': 'Password must contain at least one uppercase letter, one number, and one special character.',
                })
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
};