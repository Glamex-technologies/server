const _ = require('lodash');
const { Op } = require('sequelize');  // Import Sequelize operators for queries

const Modles = require('../../../startup/model');
const Service = Modles.models.Service;
const Category = Modles.models.Category;
const SubCategory = Modles.models.SubCategory;
const sequelize = Modles.sequelize;

module.exports = class CategoryResources {

    /**
     * Find all categories matching the given query.
     * @param {Object} query - Sequelize query options
     * @returns {Promise<Array>} - List of categories
     */
    async findAll(query = {}) {
        try {
            const category = await Category.findAll(query);
            return category;
        } catch (error) {
            console.error('Error in finding Category:', error);
            throw error;
        }
    }

    /**
     * Find a single category matching the given query.
     * @param {Object} query - Sequelize query options
     * @returns {Promise<Object|null>} - Category object or null if not found
     */
    async findOne(query = {}) {
        try {
            const category = await Category.findOne(query);
            return category;
        } catch (error) {
            console.error('Error in finding Category:', error);
            throw error;
        }
    }

    /**
     * Create a new category record.
     * @param {Object} data - Category data to create
     * @returns {Promise<Object>} - Newly created category
     */
    async create(data) {
        try {
            const category = await Category.create(data);
            return category;
        } catch (error) {
            console.error('Error in creating Category:', error);
            throw error;
        }
    }

    /**
     * Fetch categories with pagination, including count of subcategories and related service info.
     * Supports filtering via the 'query' parameter.
     * @param {Object} params - Pagination and query parameters
     * @param {number} params.limit - Number of records per page
     * @param {number} params.offset - Number of records to skip
     * @param {Object} params.query - Sequelize 'where' clause for filtering
     * @returns {Promise<Object>} - Paginated categories with metadata
     */
    async findAllPaginated({ limit = 10, offset = 0, query = {} }) {
        try {
            const result = await Category.findAndCountAll({
                where: query,
                attributes: [
                    'id',
                    'title',
                    'status',
                    'image',
                    // Count subcategories linked to the category, alias as 'sub_categories_count'
                    [sequelize.fn('COUNT', sequelize.col('subcategories.id')), 'sub_categories_count']
                ],
                include: [
                    {
                        model: Service,
                        as: 'service',
                        attributes: ["title", "id"],
                        required: false,
                        where: {
                            deleted_at: null
                        }
                    },
                    {
                        model: SubCategory,
                        as: 'subcategories',
                        attributes: [],
                        required: false,
                        where: {
                            deleted_at: null
                        }
                    }
                ],
                group: ['Category.id'],  // Group by Category to aggregate counts
                order: [['created_at', 'DESC']],
                limit,
                offset,
                subQuery: false // Disable subquery generation for performance
            });

            // Total records is length of count array (because of grouping)
            const totalRecords = result.count.length;
            const totalPages = Math.ceil(totalRecords / limit);
            const currentPage = Math.floor(offset / limit) + 1;

            return {
                categories: result.rows,
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

    /**
     * Find a single service matching the given query.
     * @param {Object} query - Sequelize query options
     * @returns {Promise<Object|null>} - Service object or null if not found
     */
    async findService(query = {}) {
        try {
            const services = await Service.findOne(query);
            return services;
        } catch (error) {
            console.error('Error in finding admin:', error);
            throw error;
        }
    }

    /**
     * Update a category by id with the provided data.
     * Returns the updated category after the update.
     * @param {number|string} id - Category id
     * @param {Object} updateData - Data to update
     * @returns {Promise<Object|null>} - Updated category object or null if not found
     */
    async updateCategory(id, updateData) {
        // Perform update where category is not soft deleted
        await Category.update(updateData, {
            where: { id, deleted_at: null }
        });

        // Fetch the updated record
        const updatedCategory = await Category.findOne({
            where: { id: id, deleted_at: null }
        });
        return updatedCategory;
    }

    /**
     * Soft delete a category and all its subcategories in a transaction.
     * Sets deleted_at timestamp instead of hard delete.
     * @param {number|string} id - Category id
     * @returns {Promise<boolean>} - True if deletion successful, false otherwise
     */
    async deleteCategory(id) {
        const t = await sequelize.transaction();
        try {
            const now = new Date();
            // Soft delete all subcategories linked to this category
            const subCatResult = await SubCategory.update(
                { deleted_at: now },
                { where: { category_id: id }, transaction: t }
            );
            // Soft delete the category itself
            const catResult = await Category.update(
                { deleted_at: now },
                { where: { id }, transaction: t }
            );
            await t.commit();

            // Check if any records were updated (soft deleted)
            const subUpdated = subCatResult[0] > 0;
            const catUpdated = catResult[0] > 0;

            return catUpdated || subUpdated;
        } catch (error) {
            await t.rollback();
            console.error('Error in deleting Category:', error);
            return false;
        }
    }
}