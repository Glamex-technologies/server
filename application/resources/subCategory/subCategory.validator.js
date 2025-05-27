const joi = require('joi');  // Library for schema validation
const ResponseHelper = require('../../helpers/response.helpers'); // Helper for consistent API responses
const SubCategoryResources = require('./subCategory.resources'); // Resource file for DB operations
const JoiHelper = require('../../helpers/joiHelper.helpers'); // Custom helper for Joi validation

const response = new ResponseHelper();
const joiHelper = new JoiHelper();
const subCategoryResources = new SubCategoryResources();

module.exports = class SubCategoryValidator {

    // Validation for creating a new subcategory
    async createSubCategory(req, res, next) {
        console.log('SubCategoryValidator@createSubCategory');
        try {
            // Define schema for request body
            let schema= {
                title: joi.string().required().min(2).max(50).trim(),
                category_id: joi.number().min(1).required(),
                image: joi.string().uri().required(),
                status: joi.number().valid(1, 2, 3).optional()
            };

            // Validate request body
            let errors = await joiHelper.joiValidation(req.body, schema);
            if(errors){
                return response.validationError('invalid request',res,errors[0])
            }

            // Continue to next middleware or controller
            next();
        } catch (err) {
            console.error('Validation Error: ', err);
            return response.exception('Server error occurred', res);
        }
    }

    // Validation for getting all subcategories with optional filters
    async getAllSubCategories(req, res, next) {
        console.log('SubCategoryValidator@getAllSubCategories');
        try {
            // Define query params validation schema
            let schema= {
                page: joi.number().min(1).default(1),
                limit: joi.number().min(1).max(50).default(10),
                search: joi.string().trim().optional()
            };

            // Validate request body
            let errors = await joiHelper.joiValidation(req.body, schema);
            if(errors){
                return response.validationError('invalid request',res,errors[0])
            }

            // Proceed to next middleware
            next();
        } catch (err) {
            console.error('Validation Error: ', err);
            return response.exception('Server error occurred', res);
        }
    }

    // Validation for updating an existing subcategory
    async updateSubCategory(req, res, next) {
        console.log('SubCategoryValidator@updateSubCategory');
        try {
            // Define validation schema for update
            let schema= {
                title: joi.string().min(2).max(50).trim().optional(),
                id: joi.number().min(1).required(),
                category_id: joi.number().optional(),
                image: joi.string().uri().optional(),
                status: joi.number().valid(1, 2, 3).optional()
            };

            // Validate request body
            let errors = await joiHelper.joiValidation(req.body, schema);
            if(errors){
                return response.validationError('invalid request',res,errors[0])
            }

            // If category_id provided, ensure category exists
            if(req.body.category_id){
                const category = subCategoryResources.findCategory({
                    where: { id: req.body.category_id, deleted_at: null }
                });
                if(!category){
                    return response.badRequest("Category not found",res);
                }
            }

            // Continue if validation passes
            next();
        } catch (err) {
            console.error('Validation Error: ', err);
            return response.exception('Server error occurred', res);
        }
    }

    // Validation for deleting a subcategory
    async deleteSubCategory(req, res, next) {
        console.log('SubCategoryValidator@deleteSubCategory');
        try {
            // Define schema for query parameter
            let schema= {
                id: joi.number().min(1).required(),
            };

            // Validate query parameter
            let errors = await joiHelper.joiValidation(req.query, schema);
            if(errors){
                return response.validationError('invalid request',res,errors[0])
            }

            // Pass to controller if valid
            next();
        } catch (err) {
            console.error('Validation Error: ', err);
            return response.exception('Server error occurred', res);
        }
    }
};