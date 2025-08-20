const joi = require('joi');
const ResponseHelper = require('../../helpers/response.helpers');
const response = new ResponseHelper();
const JoiHelper = require('../../helpers/joiHelper.helpers');
const joiHelper = new JoiHelper();
const AdminResource = require('../admin/admin.resources');
const adminResources = new AdminResource();

module.exports = class AdminValidator {

    // Admin login validation
    async authenticate(req, res, next) {
        console.log('AdminValidator@authenticate');
        try {
            let schema = {
                email: joi.string().email().required().messages({
                    'string.empty': 'Email is required.',
                    'string.email': 'Please provide a valid email address.'
                }),
                password: joi.string().required().messages({
                    'string.empty': 'Password is required.'
                })
            }

            let errors = await joiHelper.joiValidation(req.body, schema);
            if (errors) {
                return response.validationError('Invalid request', res, errors[0]);
            }

            let admin = await adminResources.findOne({ email: req.body.email });
            if (!admin) {
                return response.validationError('Admin not found.', res, false);
            }

            let isPasswordValid = await joiHelper.validatePassword(req.body.password, admin.password);
            if (!isPasswordValid) {
                return response.validationError("Incorrect password.", res, false);
            }

            if (admin.status !== 1) {
                return response.validationError("Admin account is inactive.", res, false);
            }

            req.admin = admin;
            next();

        } catch (err) {
            console.error('Validation Error: ', err);
            return response.exception('A server error occurred.', res);
        }
    }

    // Change password validation
    async changePassword(req, res, next) {
        console.log('AdminValidator@changePassword');
        try {
            let schema = {
                old_password: joi.string().required().messages({
                    'string.empty': 'Old password is required.'
                }),
                new_password: joi.string().required().min(8).pattern(new RegExp('^(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$')).messages({
                    'string.empty': 'New password is required.',
                    'string.min': 'New password must be at least 8 characters long.',
                    'string.pattern.base': 'New password must include at least one uppercase letter, one number, and one special character.'
                })
            }
            let errors = await joiHelper.joiValidation(req.body, schema);
            if (errors) {
                return response.validationError('Invalid request', res, errors[0]);
            }
            next();
        } catch (err) {
            console.error('Validation Error: ', err);
            return response.exception('A server error occurred.', res);
        }
    }
};