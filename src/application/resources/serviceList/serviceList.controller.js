const path = require('path');
const ServiceListResources = require('./serviceList.resources');
const ResponseHelper = require('../../helpers/response.helpers');
const { rest } = require('lodash');
const { Op } = require('sequelize');

const response = new ResponseHelper();
const serviceListResources = new ServiceListResources();

module.exports = class ServiceListController { 

    // Fetch paginated list of all service list items with optional filters
    async getAllServiceList(req, res) {
        console.log("ServiceListController@getAllServiceList");
        try {
            // Destructure query params with default values
            const { page = 1, limit = 10, search = '', category_id, service_id } = req.query;
            const offset = ((page ? page : 1) - 1) * limit;

            // Base query to exclude soft deleted items
            const query= {
                deleted_at: null
            }
            // Filter by service_id if provided
            if(service_id) {
                query.service_id = service_id;
            }
            // Filter by category_id if provided
            if(category_id) {
                query.category_id = category_id
            }
            // Filter by search string on title, case insensitive
            if(search) {
                query.title = {
                    [Op.iLike]: `%${search}%`,
                };
            }
            // Fetch paginated results from resource
            const result = await serviceListResources.findAllPaginated({
                offset: parseInt(offset ? offset : 0),
                limit: parseInt(limit ? limit : 10),
                query: query,
            });
            // Return success response with data
            return response.success('All sub categories.', res, result);
        } catch (error) {
            // Log error and return exception response
            console.error("Error in getAllServiceList:", error);
            return response.exception('Failed to fetch Category', res);
        }
    }      

    // Create a new service list item for the authenticated provider
    async createServiceList(req, res) { 
        try {
            console.log('ServiceListController@createCategory');
            const { sub_category_id, service_id, category_id, service_location, price, description, service_image } = req.body;

            // Check if the service already exists for the provider (prevent duplicates)
            const serviceExist = await serviceListResources.findOne({
                where:{
                    service_id: service_id,
                    category_id: category_id,
                    sub_category_id: sub_category_id,
                    service_provider_id: req.provider.id,
                    deleted_at: null
                }
            });

            if (serviceExist) {
                // Return bad request if duplicate found
                return response.badRequest('This service is already added.', res, null);
            }

            // Create new service list entry
            const newCategory = await serviceListResources.create({
                service_id,
                category_id,
                sub_category_id,
                service_location,
                price,
                description,
                service_image,
                service_provider_id: req.provider.id,
            });

            // Update provider step progress (business logic)
            const serviceProviderUpdate = await serviceListResources.updateProvider(
                { step_completed: 6 },
                { id: req.provider.id }
            );

            // Prepare result object to return
            const result = {
                id: newCategory.id,
                title: newCategory.title,
                service_id: newCategory.service_id,
                category_id: newCategory.category_id,
                sub_category_id: newCategory.sub_category_id,
                service_location: newCategory.service_location,
                price: parseFloat(newCategory.price),
                description: newCategory.description,
                service_image: newCategory.service_image ? newCategory.service_image : null,
                status: newCategory.status
            }

            // Return success response with new service data
            return response.success('Service added successfully', res, result);
        } catch (error) {
            // Log error and return exception response
            console.error('Create service Error:', error);
            return response.exception('Failed to create service', res);
        }
    }

    // Create multiple service list items in batch for the authenticated provider
    async createServiceListBatch(req, res) { 
        try {
            console.log('ServiceListController@createCategory');
            const serviceList = req.body.serviceList; 

            // Validate serviceList is a non-empty array
            if (!Array.isArray(serviceList) || serviceList.length < 1) {
                return response.badRequest('ServiceList must be a non-empty array', res); 
            }

            // Append provider id to each service object
            const updatedServiceList = serviceList.map(service => ({
                ...service,
                service_provider_id: req.provider.id
            }));

            // Create batch of service list items
            const result = await serviceListResources.createBatch(updatedServiceList);

            // Update provider step progress (business logic)
            const serviceProviderUpdate = await serviceListResources.updateProvider(
                { step_completed: 6 },
                { id: req.provider.id }
            );

            // Return success response
            return response.success('Service added successfully', res, null);
        } catch (error) {
            // Log error and return exception response
            console.error('Create service Error:', error);
            return response.exception('Failed to create service', res);
        }
    }

    // Update an existing service list item
    async updateServiceList(req, res) {
        try {
            const { id, title } = req.body;
            const imagePath = req.file ? 'storage/images/' + req.file.filename : null;

            // 1. Check if service list item with given id exists and is not deleted
            const category = await serviceListResources.findOne({ where: { id, deleted_at: null } });
            if (!category) {
                return response.badRequest('Sub category not found', res, null);
            }

            // 2. Check if another item with the same title exists under the same service and category
            const categoryExist = await serviceListResources.findOne({
                where:{
                    service_id: category.service_id,
                    category_id: category.category_id,
                    title: title,
                    deleted_at: null
                }
            });
            console.log(categoryExist?.id, id);

            if (categoryExist && categoryExist.id != id) {
                return response.badRequest('Sub category already exists with the title.', res, null);
            }

            // 3. Prepare update data and update the item
            const updateData = {};
            if (title) updateData.title = title;
            if (imagePath) updateData.image = imagePath;

            const updatedCategory = await serviceListResources.updateServiceList(id, updateData);

            // Prepare the result with asset url for image
            const result = {
                id: updatedCategory.id,
                title: updatedCategory.title,
                service_id: updatedCategory.service_id,
                category_id: updatedCategory.category_id,
                image: updatedCategory.image ? `${process.env.ASSET_URL}/${updatedCategory.image}` : null,
                status: updatedCategory.status
            }

            // Return success response with updated data
            return response.success('Sub category updated successfully', res, result);
        } catch (error) {
            // Log error and return exception response
            console.error('Update sub category Error:', error);
            return response.exception('Failed to update Category', res);
        }
    }

    // Get all services for a specific provider
    async getProviderServices(req, res){
        try{
            // Find provider by id from query params
            const provider = await serviceListResources.findProvider({id: req.query.provider_id});

            if(!provider){
                // Corrected message: Provider not found
                return response.badRequest("Provider not found", res);
            }

            // Fetch all service lists associated with the provider
            const result = await serviceListResources.getAllProviderServiceLists({service_provider_id: req.query.provider_id});

            // Return success response with data
            return response.success("Service list got successfully", res, result);
        } catch(error){
            // Log error and return exception response
            console.log(error)
            return response.exception("server error",res);
        }
    }
};