const _ = require('lodash')
const { Op } = require('sequelize');  // Ensure sequelize is imported from the correct instance

const Modles = require('../../../startup/model');
const Service = Modles.models.Service;
const Category = Modles.models.Category;
const SubCategory = Modles.models.SubCategory;
const sequelize = Modles.sequelize;

module.exports = class SubCategoryResources {

    // Fetch all subcategories based on the provided query
    async findAll(query={}) {
        try {
            const category = await SubCategory.findAll(query);
            return category;
        } catch (error) {
          console.error('Error in finding Category:', error);
          throw error;
        }
    }

    // Fetch one subcategory that matches the query
    async findOne(query={}) {
        try {
            const category = await SubCategory.findOne(query);
            return category;
        } catch (error) {
          console.error('Error in finding Category:', error);
          throw error;
        }
    }

    // Create a new subcategory entry
    async create(data){
        try{
            const category = await SubCategory.create(data);
            return category;    
        } catch(error){
            console.error('Error in creating Category:', error);
            throw error;
        }
    }

    // Fetch subcategories with pagination and include related Service and Category models
    async findAllPaginated({ limit = 10, offset = 0, query = {} }) {
        try {
            const result = await SubCategory.findAndCountAll({
                where: query,
                attributes: [
                    'id',
                    'title',
                    'status',
                    'image',
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
                        model: Category,
                        as: 'category',
                        attributes: ['id', 'title'],
                        required: false,
                        where: {
                            deleted_at: null
                        }
                    }
                ],
                order: [['created_at', 'DESC']],
                limit,
                offset,
                subQuery: false
            });

            // Prepare pagination metadata
            const totalRecords = result.count;
            const totalPages = Math.ceil(totalRecords / limit);
            const currentPage = Math.floor(offset / limit) + 1;

            return {
                subCategories: result.rows,
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

    // Find one service record based on query
    async findService(query={}) {
        try {
            const services = await Service.findOne(query);
            return services;
        } catch (error) {
          console.error('Error in finding admin:', error);
          throw error;
        }
    }

    // Find one category record based on query
    async findCategory(query) {
        try {
            const category = await Category.findOne(query);
            return category;
        } catch (error) {
          console.error('Error in finding admin:', error);
          throw error;
        }
    }

    // Update an existing subcategory by ID and return the updated record
    async updateSubCategory(id, updateData) {
        await SubCategory.update(updateData, {
            where: { id, deleted_at: null }
        });
        const updatedSubCategory = await SubCategory.findOne({
            where: { id: id, deleted_at: null }
        });
        return updatedSubCategory;
    }

    // Soft delete a subcategory by updating its deleted_at timestamp
    async deleteSubCategory(id) {
        return await SubCategory.update({ deleted_at: new Date() }, {
            where: { id }
        });
    }
}