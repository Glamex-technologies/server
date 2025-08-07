const _ = require('lodash')
const { Op } = require('sequelize');  // Ensure sequelize is imported from the correct instance

const Modles = require('../../../startup/model');
const Service = Modles.models.Service;
const Category = Modles.models.Category;
const SubCategory = Modles.models.SubCategory;
const ServiceList = Modles.models.ServiceList;
const ServiceProvider = Modles.models.ServiceProvider;
const sequelize = Modles.sequelize;
const ASSET_URL = process.env.ASSET_URL;

module.exports = class ServiceListResources {
    // Fetch all subcategories matching the query criteria
    async findAll(query={}) {
        try {
            const category = await SubCategory.findAll(query);
            return category;
        } catch (error) {
          console.error('Error in finding Category:', error);
          throw error;
        }
    }

    // Find a single service list entry matching the query
    async findOne(query={}) {
        try {
            const category = await ServiceList.findOne(query);
            return category;
        } catch (error) {
          console.error('Error in finding Category:', error);
          throw error;
        }
    }

    // Create a new service list entry with given data
    async create(data){
        try{
            const serviceList = await ServiceList.create(data);
            return serviceList;    
        } catch(error){
            console.error('Error in creating Service List:', error);
            throw error;
        }
    }

    // Fetch paginated subcategories with filtering and formatting
    async findAllPaginated({ limit = 10, offset = 0, query = {} }) {
        try {
            console.log(query);
            const result = await SubCategory.findAndCountAll({
                where: query,
                attributes: [
                    'id',
                    'title',
                    'status',
                    'service_id',
                    'category_id',
                    'image',
                ],
                order: [['created_at', 'DESC']],
                limit,
                offset,
                subQuery: false
            });

            // Calculate pagination details
            const totalRecords = result.count;
            const totalPages = Math.ceil(totalRecords / limit);
            const currentPage = Math.floor(offset / limit) + 1;

            // Format data, prepend ASSET_URL to image if present
            const formattedData = result.rows.map(service => {
                const data = service.toJSON();
                if (data.image) {
                    data.image = `${ASSET_URL}/${data.image}`;
                }
                return data;
            });

            return {
                subCategories: formattedData,
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

    // Find a single service matching the query
    async findService(query={}) {
        try {
            const services = await Service.findOne(query);
            return services;
        } catch (error) {
          console.error('Error in finding admin:', error);
          throw error;
        }
    }

    // Find a single category matching the query
    async findCategory(query={}) {
        try {
            const category = await Category.findOne(query);
            return category;
        } catch (error) {
          console.error('Error in finding admin:', error);
          throw error;
        }
    }

    // Update a subcategory by id with given data and return updated record
    async updateSubCategory(id, updateData) {
        await SubCategory.update(updateData, {
            where: { id, deleted_at: null }
        });
        const updatedSubCategory = await SubCategory.findOne({
            where: { id: id, deleted_at: null }
        });
        return updatedSubCategory;
    }

    // Bulk create multiple service list entries
    async createBatch(data) {
        try {
            const serviceList = await ServiceList.bulkCreate(data, {
                returning: true
            });
            return serviceList;
        } catch (error) {
            console.error('Error in creating Service List:', error);
            throw error;
        }
    }

    // Update a service provider record based on query and return updated provider
    async updateProvider(data, query) {
        try {
          await ServiceProvider.update(data, {
            where: query,
          });
          const updatedServiceProvider = await ServiceProvider.findOne({
            where: query,
          }); 
          return updatedServiceProvider;  
        } catch (error) {
          console.error('Error in updating provider:', error);
          throw error;
        }
    }

    // Find a single provider matching the query
    async findProvider(query){
        return await ServiceProvider.findOne({where: query});
    }

    // Get all service lists of a provider including related models and attributes
    async getAllProviderServiceLists(query) {
        try {
            const serviceList = await ServiceList.findAll({
                where: query,
                attributes: [
                    "id",
                    "title",
                    "service_image",
                    "price",
                    "description"
                ],
                include: [
                    {
                        model: ServiceProvider,
                        as: 'serviceProvider', 
                        attributes: ['id','full_name'],
                    },
                    {
                        model: Category,
                        as : "category",
                        attributes: ["id", "title"]
                    },
                    {
                        model: SubCategory,
                        as : "subcategory",
                        attributes: ["id", "title"]
                    }
                ],
                order: [
                    ['created_at', 'DESC']
                ]
            });
            return serviceList;
        } catch (error) {
            console.error('Error in finding admin:', error);
            throw error;
        }
    }
}