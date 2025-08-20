const db = require("../../../startup/model");
const ResponseHelper = require("../../helpers/response.helpers");

const response = new ResponseHelper();

// Models
const BannerImage = db.models.BannerImage;
const ServiceImage = db.models.ServiceImage;

class ReferenceDataController {
  constructor() {
    // Bind methods to ensure proper 'this' context
    this.getLocations = this.getLocations.bind(this);
    this.getBannerImages = this.getBannerImages.bind(this);
    this.getServiceImages = this.getServiceImages.bind(this);
    this.getServiceLocations = this.getServiceLocations.bind(this);
    this.getAvailableServices = this.getAvailableServices.bind(this);
  }

  /**
   * Get countries and cities for location dropdowns
   */
  async getLocations(req, res) {
    console.log("ReferenceDataController@getLocations");

    try {
      const countries = await db.models.Country.findAll({
        where: { status: 1 },
        include: [
          {
            model: db.models.City,
            as: "city",
            where: { status: 1 },
            required: false,
          },
        ],
        order: [["name", "ASC"]],
      });

      return response.success("Locations retrieved successfully", res, {
        countries: countries,
      });
    } catch (error) {
      console.error("Error getting locations:", error);
      return response.exception(error.message, res);
    }
  }

  /**
   * Get available predefined banner images
   */
  async getBannerImages(req, res) {
    console.log("ReferenceDataController@getBannerImages");

    try {
      const bannerImages = await BannerImage.findAll({
        where: { is_active: 1 },
        attributes: ['id', 'title', 'image_url', 'thumbnail_url', 'category'],
        order: [['sort_order', 'ASC'], ['title', 'ASC']]
      });

      return response.success(
        "Banner images retrieved successfully",
        res,
        { banner_images: bannerImages }
      );
    } catch (error) {
      console.error("Error getting banner images:", error);
      return response.exception(error.message, res);
    }
  }

  /**
   * Get available predefined service images
   */
  async getServiceImages(req, res) {
    console.log("ReferenceDataController@getServiceImages");

    try {
      const serviceImages = await ServiceImage.findAll({
        where: { is_active: 1 },
        attributes: ['id', 'title', 'image_url', 'thumbnail_url', 'category'],
        order: [['sort_order', 'ASC'], ['title', 'ASC']]
      });

      return response.success(
        "Service images retrieved successfully",
        res,
        { service_images: serviceImages }
      );
    } catch (error) {
      console.error("Error getting service images:", error);
      return response.exception(error.message, res);
    }
  }

  /**
   * Get available service locations
   */
  async getServiceLocations(req, res) {
    console.log("ReferenceDataController@getServiceLocations");

    try {
      const serviceLocations = await db.models.ServiceLocation.findAll({
        where: { status: 1 },
        attributes: ['id', 'title', 'description'],
        order: [['title', 'ASC']]
      });

      return response.success(
        "Service locations retrieved successfully",
        res,
        { service_locations: serviceLocations }
      );
    } catch (error) {
      console.error("Error getting service locations:", error);
      return response.exception(error.message, res);
    }
  }

  /**
   * Get available services from master catalog
   */
  async getAvailableServices(req, res) {
    console.log("ReferenceDataController@getAvailableServices");

    try {
      // Get services with their categories and subcategories for proper hierarchy
      const services = await db.models.Service.findAll({
        where: { status: 1 },
        include: [
          {
            model: db.models.Category,
            as: "categories",
            where: { status: 1 },
            required: false,
            attributes: ["id", "title", "image"],
            include: [
              {
                model: db.models.subcategory,
                as: "subcategories",
                where: { status: 1 },
                required: false,
                attributes: ["id", "title", "image"],
              },
            ],
          },
        ],
        attributes: ["id", "title", "image"],
        order: [["title", "ASC"]],
      });

      return response.success(
        "Available services, categories and subcategories retrieved successfully",
        res,
        {
          services: services,
        }
      );
    } catch (error) {
      console.error("Error getting available services:", error);
      return response.exception(error.message, res);
    }
  }
}

module.exports = ReferenceDataController;
