const _ = require('lodash')
const Modles = require('../../../startup/model');
const Country = Modles.models.Country;
const City = Modles.models.City;

module.exports = class CountryResources {
  // Fetch all countries with pagination, sorting, and filters (for general users)
  async getAllCountryWithPagination(query, attributes, sortBy, sortOrder, page, limit) {
    try {
      const offset = (page - 1) * limit;
      const result = await Country.findAndCountAll({
        where: query,
        limit: limit,
        offset: offset,
        order: [[sortBy, sortOrder]],
        attributes: attributes
      });
      const totalPages = Math.ceil(result.count / limit);
      return {
        country: result.rows,
        totalCount: result.count,
        totalPages: totalPages,
        currentPage: page,
        pageSize: limit
      };
    } catch (error) {
      console.error('Error in fetching providers with pagination, filter, and sort:', error);
      throw error;
    }
  }

  // Fetch all countries with pagination (for admin panel response format)
  async getAllCountryWithPaginationAdmin(query, attributes, sortBy, sortOrder, page, limit) {
    try {
      const offset = (page - 1) * limit;
      const result = await Country.findAndCountAll({
        where: query,
        limit: limit,
        offset: offset,
        order: [[sortBy, sortOrder]],
        attributes: attributes
      });
      const totalPages = Math.ceil(result.count / limit);
      return {
        country: result.rows,
        pagination: {
          totalRecords: result.count,
          perPage: limit,
          currentPage: page,
          totalPages
        }
      };
    } catch (error) {
      console.error('Error in fetching providers with pagination, filter, and sort:', error);
      throw error;
    }
  }

  // Fetch all cities with pagination, sorting, and filters (for general users)
  async getAllCityWithPagination(query, attributes, sortBy, sortOrder, page, limit) {
    try {
      const offset = (page - 1) * limit;
      const result = await City.findAndCountAll({
        where: query,
        limit: limit,
        offset: offset,
        order: [[sortBy, sortOrder]],
        attributes: attributes
      });
      const totalPages = Math.ceil(result.count / limit);
      return {
        city: result.rows,
        totalCount: result.count.length, // Note: result.count is a number, count.length might be incorrect
        totalPages: totalPages,
        currentPage: page,
        pageSize: limit
      };
    } catch (error) {
      console.error('Error in fetching providers with pagination, filter, and sort:', error);
      throw error;
    }
  }

  // Fetch all cities with pagination (for admin panel response format)
  async getAllCityWithPaginationAdmin(query, attributes, sortBy, sortOrder, page, limit) {
    try {
      const offset = (page - 1) * limit;
      const result = await City.findAndCountAll({
        where: query,
        limit: limit,
        offset: offset,
        order: [[sortBy, sortOrder]],
        attributes: attributes
      });
      const totalPages = Math.ceil(result.count / limit);
      return {
        city: result.rows,
        pagination: {
          totalRecords: result.count,
          perPage: limit,
          currentPage: page,
          totalPages
        }
      };
    } catch (error) {
      console.error('Error in fetching providers with pagination, filter, and sort:', error);
      throw error;
    }
  }

  // Create a new country entry
  async createCountry(data) {
    try {
      const country = await Country.create(data);
      return country;
    } catch (error) {
      console.error('Error creating country:', error);
      throw error;
    }
  }

  // Create a new city entry
  async createCity(data) {
    try {
      const city = await City.create(data);
      return city;
    } catch (error) {
      console.error('Error creating country:', error);
      throw error;
    }
  }

  // Find a country by specific conditions
  async findCountry(query) {
    try {
      const country = await Country.findOne({ where: query });
      return country;
    } catch (error) {
      console.error('Error finding country:', error);
      throw error;
    }
  }

  // Find a city by specific conditions
  async findCity(query) {
    try {
      const city = await City.findOne({ where: query });
      return city;
    } catch (error) {
      console.error('Error finding country:', error);
      throw error;
    }
  }

  // Update a city's data based on query
  async updateCity(data, query) {
    try {
      return await City.update(data, { where: query });
    } catch (error) {
      console.error('Error finding country:', error);
      throw error;
    }
  }

  // Soft delete a city by updating `deleted_at` field
  async deleteCity(query) {
    try {
      return await City.update({ deleted_at: new Date() }, { where: query });
    } catch (error) {
      console.error('Error finding country:', error);
      throw error;
    }
  }

  // Soft delete a country and all related cities by updating `deleted_at` field
  async deleteCountry(query) {
    try {
      await City.update({ deleted_at: new Date() }, { where: { country_id: query.id } });
      return await Country.update({ deleted_at: new Date() }, { where: query });
    } catch (error) {
      console.error('Error finding country:', error);
      throw error;
    }
  }

  // Update a country's data based on query
  async updateCountry(data, query) {
    try {
      return await Country.update(data, { where: query });
    } catch (error) {
      console.error('Error finding country:', error);
      throw error;
    }
  }
}