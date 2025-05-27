const path = require('path');
const ServiceResources = require('./services.resources');
const serviceResources = new ServiceResources();
const ResponseHelper = require('../../helpers/response.helpers');
const response = new ResponseHelper();
const ASSET_URL = process.env.ASSET_URL;

module.exports = class ServiceController { 

    // Fetch all services with optional pagination, search, and status filtering
    async getAllServices(req, res) {
        console.log("ServiceController@getAllServices");
        try {
            // Extract pagination and filtering parameters from query string, set defaults
            const { page = 1, limit = 10, search = '', status } = req.query;
            const offset = ((page ? page : 1) - 1) * limit;

            // Default query for non-admin users: status=1 and no search term
            let result = await serviceResources.findAllPaginated({
                offset: parseInt(offset ? offset : 0),
                limit: parseInt(limit ? limit : 10),
                search: '',
                status: 1
            });

            // For admin users, apply provided search and status filters
            if(req.admin){
                result = await serviceResources.findAllPaginated({
                    offset: parseInt(offset ? offset : 0),
                    limit: parseInt(limit ? limit : 10),
                    search,
                    status
                });
            }
        
            return response.success('All services', res, result);
        } catch (error) {
            console.error("Error in getAllServices:", error);
            return response.exception('Failed to fetch services', res);
        }
    }      

    // Create a new service
    async createService(req, res) { 
        try {
            console.log("ServiceController@createService");
            const { title, image } = req.body;

            // Check if a service with the same title already exists (and not deleted)
            const serviceExists = await serviceResources.findOne({where:{ title: title, deleted_at: null }});
            if (serviceExists) {
                return response.badRequest('Service already exists', res, null);
            }

            // Create the new service
            const newService = await serviceResources.create({
                title,
                image
            });

            // Prepare and send response with new service details
            const result = {
                id: newService.id,
                title: newService.title,
                image: newService.image,
                status: newService.status
            }
            return response.success('Service created successfully', res, result);
        } catch (error) {
            console.error('Create Service Error:', error);
            return response.exception('Failed to create service', res);
        }
    }

    // Update an existing service by ID
    async updateService(req, res) {
        try {
            console.log("ServiceController@updateService");
            const { id, title, image, status } = req.body;

            // 1. Verify service exists and is not deleted
            const service = await serviceResources.findOne({ where: { id, deleted_at: null } });
            if (!service) {
                return response.notFound('Service not found', res);
            }

            // 2. If new title provided and different, check if it already exists to avoid duplicates
            if (title && title !== service.title) {
                const titleExists = await serviceResources.findOne({
                    where: { title, deleted_at: null }
                });
                if (titleExists) {
                    return response.badRequest('Service with this title already exists', res);
                }
            }

            // 3. Collect update fields only if provided
            const updateData = {};
            if (title) updateData.title = title;
            if (image) updateData.image = image;
            if (status) updateData.status = status;

            // Perform the update
            const updateService = await serviceResources.updateService(id, updateData);

            // Respond with updated service details
            const result = {
                id: updateService.id,
                title: updateService.title,
                image: updateService.image,
                status: updateService.status
            }
            return response.success('Service updated successfully', res, result);
        } catch (error) {
            console.error('Update Service Error:', error);
            return response.exception('Failed to update service', res);
        }
    }    

    // Delete a service by ID
    async deleteService(req, res) {
        console.log("ServiceController@deleteService");
        try {
            const { id } = req.query;

            // 1. Verify service exists and not deleted
            const service = await serviceResources.findOne({ where: { id, deleted_at: null } });
            if (!service) {
                return response.notFound('Service not found', res);
            }

            // 2. Delete the service (likely a soft delete)
            await serviceResources.deleteService(id);

            return response.success('Service deleted successfully', res, null);
        } catch (error) {
            console.error('Delete Service Error:', error);
            return response.exception('Failed to delete service', res);
        }
    }
};