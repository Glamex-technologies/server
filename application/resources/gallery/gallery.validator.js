const joi = require('joi');
const ResponseHelper = require('../../helpers/response.helpers');
const JoiHelper = require('../../helpers/joiHelper.helpers');

const response = new ResponseHelper();
const joiHelper = new JoiHelper();

module.exports = class GalleryValidator {

    /**
     * Validator for getting all galleries (Admin and Provider)
     * Validates:
     *  - type (1=Admin, 2=Provider)
     *  - optional pagination (page, limit)
     */
    async getAllGalary(req, res, next) {
        console.log('GalleryValidator@getAllGalary - Validating query params for fetching galleries');
        try {
            let schema = {
                type: joi.number().valid(1, 2).required(),
                page: joi.number().optional(),
                limit: joi.number().optional()
            };
            let errors = await joiHelper.joiValidation(req.query, schema);
            if (errors) {
                return response.validationError('Invalid request: getAllGalary', res, errors[0]);
            }
            next();
        } catch (err) {
            console.error('GalleryValidator@getAllGalary - Validation Exception:', err);
            return response.exception('Server error occurred during gallery fetch validation', res);
        }
    }

    /**
     * Validator for creating a new gallery
     * Validates:
     *  - image (must be a valid URL string)
     */
    async createGallery(req, res, next) {
        console.log('GalleryValidator@createGallery - Validating body for gallery creation');
        try {
            let schema = {
                image: joi.string().uri().required().trim()
            };
            let errors = await joiHelper.joiValidation(req.body, schema);
            if (errors) {
                return response.validationError('Invalid request: createGallery', res, errors[0]);
            }
            next();
        } catch (err) {
            console.error('GalleryValidator@createGallery - Validation Exception:', err);
            return response.exception('Server error occurred during gallery creation validation', res);
        }
    }

    /**
     * Validator for updating an existing gallery
     * Validates:
     *  - id (gallery ID must be a number)
     *  - image (must be a valid URL string)
     */
    async updateGallery(req, res, next) {
        console.log('GalleryValidator@updateGallery - Validating body for gallery update');
        try {
            let schema = {
                id: joi.number().required(),
                image: joi.string().uri().required().trim()
            };
            let errors = await joiHelper.joiValidation(req.body, schema);
            if (errors) {
                return response.validationError('Invalid request: updateGallery', res, errors[0]);
            }
            next();
        } catch (err) {
            console.error('GalleryValidator@updateGallery - Validation Exception:', err);
            return response.exception('Server error occurred during gallery update validation', res);
        }
    }

    /**
     * Validator for deleting a gallery
     * Validates:
     *  - id (must be a positive number)
     */
    async deleteGallery(req, res, next) {
        console.log('GalleryValidator@deleteGallery - Validating query for gallery deletion');
        try {
            let schema = {
                id: joi.number().min(1).required()
            };
            let errors = await joiHelper.joiValidation(req.query, schema);
            if (errors) {
                return response.validationError('Invalid request: deleteGallery', res, errors[0]);
            }
            next();
        } catch (err) {
            console.error('GalleryValidator@deleteGallery - Validation Exception:', err);
            return response.exception('Server error occurred during gallery deletion validation', res);
        }
    }
};