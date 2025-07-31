const joi = require('joi');
const ResponseHelper = require('../../helpers/response.helpers');
const response = new ResponseHelper();
const JoiHelper = require('../../helpers/joiHelper.helpers');
const joiHelper = new JoiHelper();

module.exports = class AuthValidator {
    /**
     * Validates unified authentication request
     * Checks phone number and password format
     */
    async authenticate(req, res, next) {
        console.log('AuthValidator@authenticate');
        try {
            let schema = {
                phone_code: joi.string().pattern(/^\d+$/).required(),
                phone_number: joi.string().pattern(/^\d+$/).required(),
                password: joi.string().required()
            };
            
            let errors = await joiHelper.joiValidation(req.body, schema);
            if (errors) {
                return response.validationError('Invalid request', res, errors[0]);
            }
            
            next();
        } catch (err) {
            console.error('Validation Error: ', err);
            return response.exception('Server error occurred', res);
        }
    }

    /**
     * Validates unified forgot password request
     * Checks phone number format
     */
    async forgotPassword(req, res, next) {
        console.log('AuthValidator@forgotPassword');
        try {
            let schema = {
                phone_code: joi.string().pattern(/^\d+$/).required(),
                phone_number: joi.string().pattern(/^\d+$/).required()
            };
            
            let errors = await joiHelper.joiValidation(req.body, schema);
            if (errors) {
                return response.validationError('Invalid request', res, errors[0]);
            }
            
            next();
        } catch (err) {
            console.error('Validation Error: ', err);
            return response.exception('Server error occurred', res);
        }
    }

    /**
     * Validates unified OTP verification for forgot password
     * Checks ID, OTP format, and user type
     */
    async verifyForgotPasswordOtp(req, res, next) {
        console.log('AuthValidator@verifyForgotPasswordOtp');
        try {
            let schema = {
                id: joi.number().required().min(1),
                otp: joi.string().length(4).pattern(/^\d+$/).required(),
                user_type: joi.string().valid('user', 'provider').required()
            };
            
            let errors = await joiHelper.joiValidation(req.body, schema);
            if (errors) {
                return response.validationError('Invalid request', res, errors[0]);
            }
            
            next();
        } catch (err) {
            console.error('Validation Error: ', err);
            return response.exception('Server error occurred', res);
        }
    }

    /**
     * Validates unified password reset request
     * Checks ID, new password requirements, and user type
     */
    async resetPassword(req, res, next) {
        console.log('AuthValidator@resetPassword');
        try {
            let schema = {
                id: joi.number().required().min(1),
                password: joi.string().required().min(8).pattern(new RegExp('^(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$')).required().messages({
                    'string.empty': 'Password is required.',
                    'string.min': 'Password must be at least 8 characters long.',
                    'string.pattern.base': 'Password must contain at least one uppercase letter, one number, and one special character.',
                }),
                user_type: joi.string().valid('user', 'provider').required()
            };
            
            let errors = await joiHelper.joiValidation(req.body, schema);
            if (errors) {
                return response.validationError('Invalid request', res, errors[0]);
            }
            
            next();
        } catch (err) {
            console.error('Validation Error: ', err);
            return response.exception('Server error occurred', res);
        }
    }
};