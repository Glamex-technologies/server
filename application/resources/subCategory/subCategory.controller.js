const path = require('path');
const SubCategoryResources = require('./subCategory.resources');
const ResponseHelper = require('../../helpers/response.helpers');
const { Op } = require('sequelize');

const response = new ResponseHelper();
const subCategoryResources = new SubCategoryResources();

module.exports = class SubCategoryController { 

    // Fetch all subcategories with optional filters, pagination, and admin-based access
    async getAllSubCategories(req, res) {
        console.log("SubCategoryController@getAllSubCategories");
        try {
            const { page = 1, limit = 10, search = '', category_id, service_id, status } = req.query;
            const offset = ((page ? page : 1) - 1) * limit;
            const query = {
                deleted_at: null
            };

            // Apply service and category filters
            if (service_id) query.service_id = service_id;
            if (category_id) query.category_id = category_id;

            // If admin, allow search and status filters
            if (req.admin) {
                if (search) {
                    query.title = {
                        [Op.like]: `%${search.toLowerCase()}%`,
                    };
                }
                if (status) {
                    query.status = {
                        [Op.like]: `%${status}%`,
                    };
                }
            } else {
                // Non-admins only get active subcategories
                query.status = {
                    [Op.like]: 1,
                };
            }

            const result = await subCategoryResources.findAllPaginated({
                offset: parseInt(offset ? offset : 0),
                limit: parseInt(limit ? limit : 10),
                query: query,
            });

            return response.success('Subcategories fetched successfully.', res, result);
        } catch (error) {
            console.error("Error in getAllSubcategories:", error);
            return response.exception('Failed to fetch subcategories.', res);
        }
    }

    // Create a new subcategory
    async createSubCategory(req, res) { 
        try {
            console.log('SubCategoryController@createCategory');
            const { title, category_id, image } = req.body;

            // Ensure associated category exists
            const category = await subCategoryResources.findCategory({ where: { id: category_id, deleted_at: null } });
            if (!category) {
                return response.badRequest('Parent category does not exist.', res);
            }

            // Ensure subcategory with same title doesn't already exist
            const categoryExist = await subCategoryResources.findOne({ where: { category_id: category_id, title: title, deleted_at: null } });
            if (categoryExist) {
                return response.badRequest('Subcategory with this title already exists.', res, null);
            }

            // Create subcategory
            const newCategory = await subCategoryResources.create({
                title,
                service_id: category.service_id,
                category_id,
                image
            });

            const result = {
                id: newCategory.id,
                title: newCategory.title,
                service_id: newCategory.service_id,
                category_id: newCategory.category_id,
                image: newCategory.image,
                status: newCategory.status
            };

            return response.success('Subcategory created successfully.', res, result);
        } catch (error) {
            console.error('Create Category Error:', error);
            return response.exception('Failed to create subcategory.', res);
        }
    }

    // Update an existing subcategory
    async updateSubCategory(req, res) {
        try {
            const { id, title, category_id, image, status } = req.body;

            // Check if the subcategory exists
            const category = await subCategoryResources.findOne({ where: { id, deleted_at: null } });
            if (!category) {
                return response.badRequest('Subcategory not found.', res, null);
            }

            // Check if another subcategory with same title already exists in same category/service
            const categoryExist = await subCategoryResources.findOne({
                where: {
                    service_id: category.service_id,
                    category_id: category.category_id,
                    title: title,
                    deleted_at: null
                }
            });

            if (categoryExist && categoryExist.id != id) {
                return response.badRequest('Another subcategory with this title already exists.', res, null);
            }

            // Prepare update data
            const updateData = {};
            if (title) updateData.title = title;
            if (image) updateData.image = image;
            if (category_id) updateData.category_id = category_id;
            if (status) updateData.status = status;

            const updatedCategory = await subCategoryResources.updateSubCategory(id, updateData);

            const result = {
                id: updatedCategory.id,
                title: updatedCategory.title,
                service_id: updatedCategory.service_id,
                category_id: updatedCategory.category_id,
                image: updatedCategory.image,
                status: updatedCategory.status
            };

            return response.success('Subcategory updated successfully.', res, result);
        } catch (error) {
            console.error('Update subcategory Error:', error);
            return response.exception('Failed to update subcategory.', res);
        }
    }

    // Soft delete a subcategory
    async deleteSubCategory(req, res) {
        try {
            const { id } = req.query;

            // Check if subcategory exists
            const category = await subCategoryResources.findOne({ where: { id, deleted_at: null } });
            if (!category) {
                return response.badRequest('Subcategory not found.', res, null);
            }

            // Soft delete the subcategory
            await subCategoryResources.deleteSubCategory(id);
            return response.success('Subcategory deleted successfully.', res, null);
        } catch (error) {
            console.error('Delete Subcategory Error:', error);
            return response.exception('Failed to delete subcategory.', res);
        }
    }
};