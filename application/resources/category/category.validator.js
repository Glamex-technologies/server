const joi = require('joi');
const ResponseHelper = require('../../helpers/response.helpers');
const CategoryResources = require('./category.resources');
const JoiHelper = require('../../helpers/joiHelper.helpers');

const response = new ResponseHelper();
const joiHelper = new JoiHelper();
const categoryResources = new CategoryResources();

module.exports = class CategoryValidator {

    /**
     * Validation middleware for creating a category.
     * Checks request body fields and verifies that the referenced service exists.
     */
    async createCategory(req, res, next) {
        console.log('CategoryValidator@createCategory');
        try {
            // Define Joi schema for request body validation
            let schema= {
                title: joi.string().required().min(2).max(50).trim(),
                service_id: joi.number().min(1).required(),
                image: joi.string().uri().required(),
                status: joi.number().valid(1, 2, 3).optional()
            }

            // Validate request body against schema
            let errors = await joiHelper.joiValidation(req.body, schema);
            if(errors){
                return response.validationError('invalid request', res, errors[0]);
            }

            // Verify if the service exists and is not deleted
            const service = await categoryResources.findService({ where: { id: req.body.service_id, deleted_at: null } });
            if (!service) {
                return response.validationError('Service not found', res, null);
            }

            // Proceed to next middleware/controller
            next();
        } catch (err) {
            console.error('Validation Error: ', err);
            return response.exception('Server error occurred', res);
        }
    }

    /**
     * Validation middleware for fetching all categories.
     * Validates optional query parameters for pagination and search.
     */
    async getAllCategories(req, res, next) {
        console.log('CategoryValidator@getAllCategories');
        try {
            // Define Joi schema for query parameters validation
            let schema= {
                page: joi.number().min(1).default(1),
                limit: joi.number().min(1).max(50).default(10),
                search: joi.string().trim().optional()
            }

            // Validate request body against schema
            let errors = await joiHelper.joiValidation(req.body, schema);
            if(errors){
                return response.validationError('invalid request', res, errors[0]);
            }

            next();
        } catch (err) {
            console.error('Validation Error: ', err);
            return response.exception('Server error occurred', res);
        }
    }

    /**
     * Validation middleware for updating a category.
     * Validates request body fields and checks if service exists if service_id is provided.
     */
    async updateCategory(req, res, next) {
        console.log('CategoryValidator@updateCategory');
        try {
            // Define Joi schema for update validation
            let schema= {
                title: joi.string().min(2).max(50).trim().optional(),
                id: joi.number().min(1).required(),
                service_id: joi.number().min(1).optional(),
                image: joi.string().uri().optional().allow(null),
                status: joi.number().valid(1, 2, 3).optional()
            }

            // Validate request body against schema
            let errors = await joiHelper.joiValidation(req.body, schema);
            if(errors){
                return response.validationError('invalid request', res, errors[0]);
            }

            // If service_id is provided, check if the service exists and not deleted
            if(req.body.service_id){
                const service = await categoryResources.findService({ where: { id: req.body.service_id, deleted_at: null } });
                if (!service) {
                    return response.validationError('Service not found', res, null);
                }
            }

            next();
        } catch (err) {
            console.error('Validation Error: ', err);
            return response.exception('Server error occurred', res);
        }
    }

    /**
     * Validation middleware for deleting a category.
     * Validates that the category ID is provided in the query parameters.
     */
    async deleteCategory(req, res, next) {
        console.log('CategoryValidator@deleteCategory');
        try {
            // Define Joi schema for query parameter validation
            let schema= {
                id: joi.number().min(1).required(),
            }

            // Validate query parameters
            let errors = await joiHelper.joiValidation(req.query, schema);
            if(errors){
                return response.validationError('invalid request', res, errors[0]);
            }

            next();
        } catch (err) {
            console.error('Validation Error: ', err);
            return response.exception('Server error occurred', res);
        }
    }
};