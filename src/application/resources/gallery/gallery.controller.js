const path = require('path');
const GalleryResources = require('./gallery.resources');
const galleryResources = new GalleryResources();
const ResponseHelper = require('../../helpers/response.helpers');
const { Op } = require('sequelize');
const response = new ResponseHelper();

module.exports = class GalleryController {

  // Get all gallery images for admin or provider based on type
  async getAllGalary(req, res) {
    console.log("GalleryController@getAllGalary"); // Method start
    try {
      const { page = 1, limit = 10, search = '', type } = req.query;
      const offset = ((page ? page : 1) - 1) * limit;

      // Default query to get only non-deleted items
      let query = {
        deleted_at: null,
      };

      // Admin-based logic
      if (req.admin) {
        if (type == 1) {
          query.provider_id = null;
        } else {
          query.provider_id = {
            [Op.ne]: null 
          };
        }
      }

      // Provider-based logic
      if(req.provider){
        if (type == 1) {
          query[Op.or] = [
            { provider_id: null },
            { provider_id: req.provider.id }
          ];
        } else {
          query.provider_id = req.provider.id; 
        }
      }

      const result = await galleryResources.findAllPaginated({
        offset: parseInt(offset ? offset : 0),
        limit: parseInt(limit ? limit : 10),
        query
      });

      return response.success('All Gallery', res, result);
    } catch (error) {
      console.error("Error in getAllGallery:", error);
      return response.exception('Failed to fetch gallery', res);
    }
  }  

  // Get all gallery images specifically for admin
  async getAdminAllGalary(req, res) {
    console.log("GalleryController@getAllGalary");
    try {
      const { page = 1, limit = 10, search = '', type } = req.query;
      const offset = ((page ? page : 1) - 1) * limit;

      let query = {
        deleted_at: null,
      };

      if (req.admin) {
        if (type == 1) {
          query.provider_id = null;
        } else {
          query.provider_id = {
            [Op.ne]: null 
          };
        }
      }

      if(req.provider){
        if (type == 1) {
          query[Op.or] = [
            { provider_id: null },
            { provider_id: req.provider.id }
          ];
        } else {
          query.provider_id = req.provider.id; 
        }
      }

      const result = await galleryResources.findAllPaginatedAdmin({
        offset: parseInt(offset ? offset : 0),
        limit: parseInt(limit ? limit : 10),
        query
      });

      return response.success('All Gallery', res, result);
    } catch (error) {
      console.error("Error in getAllGallery:", error);
      return response.exception('Failed to fetch gallery', res);
    }
  }

  // Create a new gallery image
  async createGalary(req, res) {
    console.log("GalleryController@createGalary");
    try {
      const { image } = req.body;

      // Prepare data with provider_id if present
      let data = {
        image: image
      }
      if(req.provider){
        data.provider_id = req.provider.id;
      }

      const gallery = await galleryResources.create(data);
      const result = {
        id: gallery.id,
        image: gallery.image,
        status: gallery.status,
        type: gallery.type
      }

      return response.success('Image added to the gallery sucessfully.', res, result);
    } catch (error) {
      console.error("Error in createGallery:", error);
      return response.exception('Failed to add gallery image', res);
    }
  }

  // Update an existing gallery image
  async updateGalary(req, res) {
    console.log("GalleryController@updateGalary");
    try {
      const { id, image } = req.body;

      // Check if gallery exists
      let gallery = await galleryResources.findOne({id: id});
      if(!gallery){
        return response.badRequest("Gallery not Found", res);
      }

      // Only allow update if provider owns the image
      if(req.provider){
        if(gallery.provider_id != req.provider.id){
          return response.badRequest("You can't update the image", res);
        }
      }

      gallery = await galleryResources.updateGalary({image}, {id: id});
      const result = {
        id: gallery.id,
        image: gallery.image,
        status: gallery.status,
        type: gallery.type
      }

      return response.success('Image updated Suceesfully', res, result);
    } catch (error) {
      console.error("Error in updateGallery:", error);
      return response.exception('Failed to update gallery', res);
    }
  }

  // Soft delete a gallery image
  async deleteGalary(req, res) {
    console.log("GalleryController@deleteGalary");
    try {
      const { id } = req.query;

      // Check if image exists and is not already deleted
      let gallery = await galleryResources.findOne({id: id, deleted_at: null});
      if(!gallery){
        return response.badRequest("Gallery not Found", res);
      }

      // Only allow delete if provider owns the image
      if(req.provider){
        if(gallery.provider_id != req.provider.id){
          return response.badRequest("You can't delete the image", res);
        }
      }

      await galleryResources.updateGalary({deleted_at: new Date}, {id: id});
      return response.success('Image Removed Sucessfully', res);
    } catch (error) {
      console.error("Error in deleteGallery:", error);
      return response.exception('Failed to delete gallery', res);
    }
  }

};