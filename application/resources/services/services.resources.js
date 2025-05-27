const _ = require('lodash');
const { Op } = require('sequelize');  // Import Sequelize operators for query conditions

const Modles = require('../../../startup/model');
const Service = Modles.models.Service;
const Category = Modles.models.Category;
const SubCategory = Modles.models.SubCategory;
const sequelize = Modles.sequelize;

module.exports = class ServiceResources {
    // Find multiple services matching the query
    async findAll(query = {}) {
        try {
            const services = await Service.findAll(query);
            return services;
        } catch (error) {
            console.error('Error in finding admin:', error);
            throw error;
        }
    }

    // Find a single service matching the query
    async findOne(query = {}) {
        try {
            const services = await Service.findOne(query);
            return services;
        } catch (error) {
            console.error('Error in finding admin:', error);
            throw error;
        }
    }

    // Create a new service with the given data
    async create(data) {
        try {
            const service = await Service.create(data);
            return service;
        } catch (error) {
            console.error('Error in creating admin:', error);
            throw error;
        }
    }

    // Find paginated list of services with optional search and status filters
    async findAllPaginated({ limit = 10, offset = 0, search = "", status = null }) {
        try {
            // Base filter to exclude soft-deleted services
            const whereClause = {
                deleted_at: null,
            };

            // If search string provided, filter by title (case-insensitive partial match)
            if (search) {
                whereClause.title = {
                    [Op.like]: `%${search.toLowerCase()}%`,
                };
            }

            // If status provided, filter by status (partial match)
            if (status) {
                whereClause.status = {
                    [Op.like]: `%${status}%`,
                };
            }

            // Query with pagination, include counts of related categories and subcategories
            const result = await Service.findAndCountAll({
                where: whereClause,
                attributes: [
                    'id',
                    'title',
                    'status',
                    'image',
                    // Count related categories (soft-deleted filtered)
                    [sequelize.fn('COUNT', sequelize.col('categories.id')), 'categories_count'],
                    // Count related subcategories (soft-deleted filtered)
                    [sequelize.fn('COUNT', sequelize.col('subcategories.id')), 'subcategories_count']
                ],
                include: [
                    {
                        model: Category,
                        as: 'categories',
                        attributes: [],
                        required: false,
                        where: { deleted_at: null }
                    },
                    {
                        model: SubCategory,
                        as: 'subcategories',
                        attributes: [],
                        required: false,
                        where: { deleted_at: null }
                    }
                ],
                group: ['Service.id'],        // Group by service ID to aggregate counts
                order: [['created_at', 'DESC']],  // Sort by creation date descending
                limit,                        // Limit number of records per page
                offset,                       // Offset for pagination
                subQuery: false               // Disable subqueries for performance in some cases
            });

            // result.count is an array due to grouping, length = number of matched services
            const totalRecords = result.count.length;

            // Calculate total pages and current page number
            const totalPages = Math.ceil(totalRecords / limit);
            const currentPage = Math.floor(offset / limit) + 1;

            // Return paginated results along with pagination metadata
            return {
                services: result.rows,
                pagination: {
                    totalRecords,
                    perPage: limit,
                    currentPage,
                    totalPages
                }
            };
        } catch (error) {
            console.error('Error in findAllPaginated:', error);
            throw error;
        }
    }

    // Update a service by ID with given data and return updated record
    async updateService(id, updateData) {
        await Service.update(updateData, {
            where: { id, deleted_at: null }  // Only update non-deleted services
        });

        // Retrieve the updated service record
        const updatedService = await Service.findOne({
            where: { id, deleted_at: null }
        });
        return updatedService;
    }

    // Soft-delete a service and its related categories and subcategories in a transaction
    async deleteService(id) {
        const t = await sequelize.transaction();
        try {
            const now = new Date();

            // Soft-delete related subcategories by setting deleted_at timestamp
            const subCatResult = await SubCategory.update(
                { deleted_at: now },
                { where: { service_id: id }, transaction: t }
            );

            // Soft-delete related categories by setting deleted_at timestamp
            const catResult = await Category.update(
                { deleted_at: now },
                { where: { service_id: id }, transaction: t }
            );

            // Soft-delete the service itself
            const serviceResult = await Service.update(
                { deleted_at: now },
                { where: { id }, transaction: t }
            );

            // Commit the transaction if all updates succeed
            await t.commit();

            // Determine if any updates were made (returns number of affected rows)
            const subUpdated = subCatResult[0] > 0;
            const catUpdated = catResult[0] > 0;
            const serviceUpdated = serviceResult[0] > 0;

            // Return true if any entity was soft-deleted
            return serviceUpdated || catUpdated || subUpdated;
        } catch (error) {
            // Rollback the transaction on error to avoid partial updates
            await t.rollback();
            console.error('Error in deleting Service:', error);
            return false;
        }
    }
}
