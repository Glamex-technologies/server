const joi = require('joi');
const ResponseHelper = require('../../helpers/response.helpers');
const JoiHelper = require('../../helpers/joiHelper.helpers');

const response = new ResponseHelper();
const joiHelper = new JoiHelper();

module.exports = class ServiceListValidator {

    // Validator middleware for creating a single service list item
    async createServiceList(req, res, next) {
        console.log('ServiceListValidator@createServiceList');
        try {
            // Define the validation schema for the request body
            let schema= {
                service_id: joi.number().min(1).required(),
                category_id: joi.number().min(1).required(),
                sub_category_id: joi.number().min(1).optional(),
                service_location: joi.number().valid(1, 2, 3).default(1),
                price: joi.number().min(0).precision(2).required(),
                description: joi.string().min(2).max(500).optional(),
                service_image: joi.string().uri().required()
            }
            // Validate the request body against the schema
            let errors = await joiHelper.joiValidation(req.body, schema);
            if(errors){
                // If validation errors, send validation error response
                return response.validationError('invalid request',res,errors[0])
            }
            // Proceed to next middleware/controller if validation passes
            next();
        } catch (err) {
            // Catch any unexpected errors and send exception response
            console.error('Validation Error: ', err);
            return response.exception('Server error occurred', res);
        }
    }

    // Validator middleware for creating multiple service list items in batch
    async createServiceListBatch(req, res, next) {
        console.log('ServiceListValidator@createServiceListBatch');
        try {
            // Define the validation schema for the batch array in request body
            const schema = {
                serviceList: joi.array().items(
                    joi.object({
                        service_id: joi.number().min(1).required(),
                        title: joi.string().min(1).required(),
                        category_id: joi.number().min(1).required(),
                        sub_category_id: joi.number().min(1).optional(),
                        service_location: joi.number().valid(1, 2, 3).default(1),
                        price: joi.number().min(0).precision(2).required(),
                        description: joi.string().min(2).max(500).optional(),
                        service_image: joi.string().uri().required()
                    })
                ).required()
            };
            // Validate the request body against the schema
            const errors = await joiHelper.joiValidation(req.body, schema);
            if (errors) {
                // If validation errors, send validation error response
                return response.validationError('invalid request', res, errors[0]);
            }
            // Proceed to next middleware/controller if validation passes
            next();
        } catch (err) {
            // Catch any unexpected errors and send exception response
            console.error('Validation Error: ', err);
            return response.exception('Server error occurred', res);
        }
    }

};