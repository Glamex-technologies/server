const path = require('path');
const CategoryResources = require('./category.resources');
const ResponseHelper = require('../../helpers/response.helpers');
const { Op } = require('sequelize');

const response = new ResponseHelper();
const categoryResources = new CategoryResources();

module.exports = class CategoryController { 

    /**
     * Get all categories with optional pagination, filtering, and search.
     * Admin users can filter by status and search by title.
     * Non-admin users only get categories with status = 1.
     */
    async getAllCategories(req, res) {
        console.log("CategoryController@getAllCategories");
        try {
            // Destructure query params with defaults
            const { page = 1, limit = 10, search = '', service_id, status } = req.query;
            const offset = ((page ? page : 1) - 1) * limit;

            // Base query condition: exclude soft-deleted categories
            const query= {
                deleted_at: null
            };

            // Filter by service_id if provided
            if(service_id) {
                query.service_id = service_id;
            }

            if(req.admin) {
                // Admin user filters
                if(search) {
                    query.title = {
                        [Op.like]: `%${search.toLowerCase()}%`,
                    };
                }
                if(status) {
                    query.status = {
                        [Op.like]: `%${status}%`,
                    };
                }
            } else {
                // Non-admin users only see categories with status = 1
                query.status = {
                    [Op.like]: 1,
                };
            }

            // Fetch paginated categories matching the query
            const result = await categoryResources.findAllPaginated({
                offset: parseInt(offset ? offset : 0),
                limit: parseInt(limit ? limit : 10),
                query
            });

            // Return success response with categories
            return response.success('All categories.', res, result);
        } catch (error) {
            console.error("Error in getAllcategories:", error);
            return response.exception('Failed to fetch Category', res);
        }
    }      

    /**
     * Create a new category after checking for duplicates.
     * Validates unique combination of service_id and title.
     */
    async createCategory(req, res) { 
        try {
            const { title, service_id, image } = req.body;

            // Check if category with the same title and service already exists
            const categoryExist = await categoryResources.findOne({
                where: { service_id: service_id, title: title, deleted_at: null }
            });

            if (categoryExist) {
                return response.badRequest('Category already exists', res, null);
            }

            // Create new category
            const newCategory = await categoryResources.create({
                title,
                service_id,
                image
            });

            // Prepare response data
            const result = {
                id: newCategory.id,
                title: newCategory.title,
                image: newCategory.image,
                status: newCategory.status
            };

            return response.success('Category created successfully', res, result);
        } catch (error) {
            console.error('Create Category Error:', error);
            return response.exception('Failed to Category service', res);
        }
    }

    /**
     * Update an existing category.
     * Validates existence and unique title within the same service.
     */
    async updateCategory(req, res) {
        try {
            const id = req.body.id;
            const data = req.body;
            // 1. Check if category with given id exists and not soft-deleted
            const category = await categoryResources.findOne({ where: { id, deleted_at: null } });
            if (!category) {
                return response.badRequest('Category not found', res, null);
            }
            // 2. Check if another category with the same title exists in the same service
            const categoryExist = await categoryResources.findOne({
                where: { service_id: category.service_id, title: title, deleted_at: null }
            });
            // If the category exists and it's not the same one being updated
            if (categoryExist && categoryExist.id != id) {
                return response.badRequest('Category already exists with the title.', res, null);
            }
            // 3. Prepare update data
            const allowedFields = ['title', 'service_id', 'image', 'status'];
            // Filter updateData to only include allowed fields
            const finalUpdateData = {};
            for (const key of allowedFields) {
                if (key in data) { // includes keys with null values too
                    finalUpdateData[key] = data[key];
                }
            }
            // Perform update
            const updatedCategory = await categoryResources.updateCategory(id, finalUpdateData);
            // Prepare response data
            const result = {
                id: updatedCategory.id,
                title: updatedCategory.title,
                image: updatedCategory.image,
                status: updatedCategory.status
            };
            return response.success('Category updated successfully', res, result);
        } catch (error) {
            console.error('Update Category Error:', error);
            return response.exception('Failed to update Category', res);
        }
    }

    /**
     * Soft delete a category by marking it deleted.
     * Checks if category exists before deletion.
     */
    async deleteCategory(req, res) {
        try {
            const { id } = req.query;
            // Check if category exists and not already deleted
            const category = await categoryResources.findOne({ where: { id, deleted_at: null } });
            if (!category) {
                return response.badRequest('Category not found', res, null);
            }
            // Perform soft delete
            await categoryResources.deleteCategory(id);
            return response.success('Category deleted successfully', res, null);
        } catch (error) {
            console.error('Delete Category Error:', error);
            return response.exception('Failed to delete Category', res);
        }
    }
};