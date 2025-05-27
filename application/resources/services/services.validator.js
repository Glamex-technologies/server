const joi = require('joi');
const ResponseHelper = require('../../helpers/response.helpers');
const response = new ResponseHelper();
const JoiHelper = require('../../helpers/joiHelper.helpers');
const joiHelper = new JoiHelper();

module.exports = class ServiceValidator {

    // Validator middleware for creating a new service
    async createService(req, res, next) {
        console.log('ServiceValidator@createService');
        try {
            // Define Joi schema for validating request body
            let schema= {
                title: joi.string().required().min(2).max(50).trim(),  // Service title (required, 2-50 chars)
                image: joi.string().uri().required(),                  // Image URL (required, must be valid URI)
                status: joi.number().valid(1, 2, 3).optional()         // Status (optional, must be 1, 2, or 3)
            }

            // Perform validation using joiHelper
            let errors = await joiHelper.joiValidation(req.body, schema);
            if(errors){
                // If validation errors, respond with validation error message and first error detail
                return response.validationError('invalid request', res, errors[0])
            }
            // Proceed to next middleware/controller if valid
            next();
        } catch (err) {
            console.error('Validation Error: ', err);
            // Handle unexpected errors gracefully
            return response.exception('Server error occurred', res);
        }
    }

    // Validator middleware for getting all services (with pagination and optional search)
    async getAllServices(req, res, next) {
        console.log('ServiceValidator@getAllServices');
        try {
            // Define Joi schema for query parameters or body containing pagination info
            let schema= {
                page: joi.number().min(1).default(1),          // Page number, default 1, min 1
                limit: joi.number().min(1).max(50).default(10),// Limit per page, default 10, max 50
                search: joi.string().trim().optional()         // Optional search string, trimmed
            }

            // Validate request body (or consider req.query depending on usage)
            let errors = await joiHelper.joiValidation(req.body, schema);
            if(errors){
                return response.validationError('invalid request', res, errors[0])
            }
            next();
        } catch (err) {
            console.error('Validation Error: ', err);
            return response.exception('Server error occurred', res);
        }
    }

    // Validator middleware for updating a service
    async updateService(req, res, next) {
        console.log('ServiceValidator@updateService');
        try {
            // Define Joi schema for update, with id required and other fields optional
            let schema= {
                title: joi.string().min(2).max(50).trim().optional(),  // Optional title update
                id: joi.number().min(1).required(),                    // Required service ID to update
                image: joi.string().uri().optional(),                  // Optional new image URL
                status: joi.number().valid(1, 2, 3).optional()         // Optional status update
            }

            let errors = await joiHelper.joiValidation(req.body, schema);
            if(errors){
                return response.validationError('invalid request', res, errors[0])
            }
            next();
        } catch (err) {
            console.error('Validation Error: ', err);
            return response.exception('Server error occurred', res);
        }
    }
    
    // Validator middleware for deleting a service
    async deleteService(req, res, next) {
        console.log('ServiceValidator@deleteService');
        try {
            // Schema expects an 'id' in the query parameters (required)
            let schema= {
                id: joi.number().min(1).required(),
            }

            // Validate req.query since id is passed as query param for delete
            let errors = await joiHelper.joiValidation(req.query, schema);
            if(errors){
                return response.validationError('invalid request', res, errors[0])
            }
            next();
        } catch (err) {
            console.error('Validation Error: ', err);
            return response.exception('Server error occurred', res);
        }
    }
};