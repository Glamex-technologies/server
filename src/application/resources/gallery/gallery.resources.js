const _ = require('lodash')
const { Op } = require('sequelize');  // Ensure sequelize is imported from the correct instance

const Modles = require('../../../startup/model');
const Gallery = Modles.models.Gallery;
const ServiceProvider = Modles.models.ServiceProvider;

module.exports = class GalleryResources {
    // Find all gallery records matching the query
    async findAll(query={}) {
        try {
            const gallery = await Gallery.findAll(query);
            return gallery;
        } catch (error) {
          console.error('Error in finding admin:', error);
          throw error;
        }
    }

    // Find one gallery record matching the query
    async findOne(query={}) {
        try {
            const gallery = await Gallery.findOne({where: query});
            return gallery;
        } catch (error) {
          console.error('Error in finding gallery:', error);
          throw error;
        }
    }

    // Create a new gallery record with the provided data
    async create(data){
        try{
            const gallery = await Gallery.create(data);
            return gallery;    
        } catch(error){
            console.error('Error in creating gallery:', error);
            throw error;
        }
    }

    // Find gallery records paginated with limit and offset, for normal users/providers
    async findAllPaginated({ limit = 10, offset = 0, query }) {
        try {
            console.log(limit, offset);
            const result = await Gallery.findAndCountAll({
                where: query,
                attributes: [
                    'id',
                    'image',
                    'status',
                    'type'
                ],
                include: [
                    {
                        model: ServiceProvider,
                        as: "provider",
                        attributes: ["id", "full_name"]
                    }
                ],
                order: [['created_at', 'DESC']],
                limit,
                offset,
                subQuery: false
            });
            const totalRecords = result.count;
            const totalPages = Math.ceil(totalRecords / limit);
            const currentPage = Math.floor(offset / limit) + 1;
            return {
                gallery: result.rows,
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

    // Find gallery records paginated with limit and offset, for admin users
    async findAllPaginatedAdmin({ limit = 10, offset = 0, query }) {
        try {
            console.log(limit, offset);
            const result = await Gallery.findAndCountAll({
                where: query,
                attributes: [
                    'id',
                    'image',
                    'status',
                    'type'
                ],
                include: [
                    {
                        model: ServiceProvider,
                        as: "provider",
                        attributes: ["id", "full_name"]
                    }
                ],
                order: [['created_at', 'DESC']],
                limit,
                offset,
                subQuery: false
            });
            const totalRecords = result.count;
            const totalPages = Math.ceil(totalRecords / limit);
            const currentPage = Math.floor(offset / limit) + 1;
            return {
                gallery: result.rows,
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

    // Update gallery record(s) matching the query with updateData, then return the updated record
    async updateGalary(updateData,query) {
        await Gallery.update(updateData, {
            where: query
        });
        const updatedService = await Gallery.findOne({
            where: query
        });
        return updatedService;
    }

}