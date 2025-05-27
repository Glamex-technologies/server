const { result } = require('lodash');
const bcrypt = require('bcryptjs');
const CountryResources  = require('./country.resources');
const ResponseHelper = require('../../helpers/response.helpers');  
const { Op } = require('sequelize');
const countryResources = new CountryResources();
const response = new ResponseHelper();

module.exports = class CountryController { 
    // Welcome message for testing
    async getWelcome(req, res) {
        return res.status(200).json({
            message: "I am Galmex........",
        });
    };

    // Fetch list of countries (non-admin and admin logic included)
    async getCountry(req, res) { 
        console.log('Country@getCountry');
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 100;
        const sortBy = req.query.sortBy || 'created_at'; 
        const sortOrder = req.query.sortOrder || 'DESC';
        const { search, status } = req.query;

        const query = {
            ...(search && {
                name: { [Op.like]: `%${search}%` },
            }),
            deleted_at: null
        };

        // Admin-specific logic for status filter
        if (req.admin) {
            if (status) {
                query.status = { [Op.like]: `%${status}%` };
            }
        } else {
            query.status = 1;
        }

        const attributes = ['id', 'name', 'code', 'status'];

        try {
            const country = await countryResources.getAllCountryWithPagination(query, attributes, sortBy, sortOrder, page, limit);  
            return response.success('Country fetched successfully', res, country);
        } catch (error) {
            console.error('Error fetching Country:', error);
            return response.exception('Error fetching Country', res);
        }
    }

    // Fetch list of countries (admin only with possibly more access)
    async getCountryAdmin(req, res) { 
        console.log('Country@getCountry');
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 100;
        const sortBy = req.query.sortBy || 'created_at'; 
        const sortOrder = req.query.sortOrder || 'DESC';
        const { search, status } = req.query;

        const query = {
            ...(search && {
                name: { [Op.like]: `%${search}%` },
            }),
            deleted_at: null
        };

        if (req.admin) {
            if (status) {
                query.status = { [Op.like]: `%${status}%` };
            }
        } else {
            query.status = 1;
        }

        const attributes = ['id', 'name', 'code', 'status'];

        try {
            const country = await countryResources.getAllCountryWithPaginationAdmin(query, attributes, sortBy, sortOrder, page, limit);  
            return response.success('Country fetched successfully', res, country);
        } catch (error) {
            console.error('Error fetching Country:', error);
            return response.exception('Error fetching Country', res);
        }
    }

    // Add a new country
    async addCountry(req, res) {    
        console.log('Country@addCountry');
        const { name } = req.body;

        if (!name) {
            return response.badRequest('Name is required', res);
        }

        try {
            const countryExist = await countryResources.findCountry({ name: req.body.name, deleted_at: null });
            if (countryExist) {
                return response.badRequest('Country with the name already exists', res);
            }

            const country = await countryResources.createCountry({ name, code: req.body.code });
            const result = {
                id: country.id,
                name: country.name,
                code: country.code
            };
            return response.success('Country created successfully', res, result);
        } catch (error) {
            console.error('Error creating Country:', error);
            return response.exception('Error creating Country', res);
        }
    }

    // Fetch list of cities (filter by country and admin logic)
    async getCity(req, res) { 
        console.log('Country@getCity');
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 100;
        const sortBy = req.query.sortBy || 'created_at'; 
        const sortOrder = req.query.sortOrder || 'DESC';
        const { search, status } = req.query;

        const query = {
            ...(search && {
                name: { [Op.like]: `%${search}%` },
            }),
            ...(req.query.country && {
                country_id: req.query.country,
            }),
            deleted_at: null
        };

        if (req.admin) {
            if (status) {
                query.status = { [Op.like]: `%${status}%` };
            }
        } else {
            query.status = 1;
        }

        const attributes = ['id', 'name', 'country_id', 'status'];

        try {
            const city = await countryResources.getAllCityWithPagination(query, attributes, sortBy, sortOrder, page, limit);  
            return response.success('City fetched successfully', res, city);
        } catch (error) {
            console.error('Error fetching City:', error);
            return response.exception('Error fetching City', res);
        }
    }

    // Fetch list of cities (admin version)
    async getCityAdmin(req, res) { 
        console.log('Country@getCity');
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 100;
        const sortBy = req.query.sortBy || 'created_at'; 
        const sortOrder = req.query.sortOrder || 'DESC';
        const { search, status } = req.query;

        const query = {
            ...(search && {
                name: { [Op.like]: `%${search}%` },
            }),
            ...(req.query.country && {
                country_id: req.query.country,
            }),
            deleted_at: null
        };

        if (req.admin) {
            if (status) {
                query.status = { [Op.like]: `%${status}%` };
            }
        } else {
            query.status = 1;
        }

        const attributes = ['id', 'name', 'country_id', 'status'];

        try {
            const city = await countryResources.getAllCityWithPaginationAdmin(query, attributes, sortBy, sortOrder, page, limit);  
            return response.success('City fetched successfully', res, city);
        } catch (error) {
            console.error('Error fetching City:', error);
            return response.exception('Error fetching City', res);
        }
    }

    // Add a new city under a country
    async addCity(req, res) {    
        console.log('Country@addCity');
        const { name } = req.body;

        if (!name) {
            return response.badRequest('Name is required', res);
        }

        try {
            const country = await countryResources.findCountry({ id: req.body.country_id, deleted_at: null });
            if (!country) {
                return response.badRequest('Country not found', res);
            }

            const city = await countryResources.createCity({ name, country_id: req.body.country_id });
            const result = {
                id: city.id,
                name: city.name,
                country_id: city.country_id
            };
            return response.success('City added successfully', res, result);
        } catch (error) {
            console.error('Error creating City:', error);
            return response.exception('Error creating City', res);
        }
    }

    // Update city details
    async updateCity(req, res) { 
        console.log('Country@updateCity');
        const { id, name, country_id, status } = req.body;

        if (!name) {
            return response.badRequest('Name is required', res);
        }

        try {
            const city = await countryResources.findCity({ id });
            if (!city) {
                return response.badRequest('City not found', res);
            }

            let updatedCity = await countryResources.updateCity({ name: name, country_id: country_id, status: status }, { id });
            return response.success('City updated successfully', res);
        } catch (error) {
            console.error('Error updating City:', error);
            return response.exception('Error updating City', res);
        }
    }

    // Delete a city
    async deleteCity(req, res) { 
        console.log('Country@deleteCity');
        const { id } = req.query;

        if (!id) {
            return response.badRequest('Id is required', res);
        }

        try {
            const city = await countryResources.findCity({ id });
            if (!city) {
                return response.badRequest('City not found', res);
            }

            await countryResources.deleteCity({ id });
            return response.success('City deleted successfully', res);
        } catch (error) {
            console.error('Error deleting City:', error);
            return response.exception('Error deleting City', res);
        }
    }

    // Update a country
    async updateCountry(req, res) { 
        console.log('Country@updateCountry');
        const { id } = req.body;
        const { name, status } = req.body;

        if (!name) {
            return response.badRequest('Name is required', res);
        }

        try {
            const country = await countryResources.findCountry({ id });
            if (!country) {
                return response.badRequest('Country not found', res);
            }

            let updatedCountry = await countryResources.updateCountry({ name }, { id });
            if (status) {
                updatedCountry = await countryResources.updateCountry({ status }, { id });
            }

            return response.success('Country updated successfully', res);
        } catch (error) {
            console.error('Error updating Country:', error);
            return response.exception('Error updating Country', res);
        }
    }

    // Delete a country
    async deleteCountry(req, res) { 
        console.log('Country@deleteCountry');
        const { id } = req.query;

        if (!id) {
            return response.badRequest('Id is required', res);
        }

        try {
            const city = await countryResources.findCountry({ id });
            if (!city) {
                return response.badRequest('Country not found', res);
            }

            await countryResources.deleteCountry({ id });
            return response.success('Country deleted successfully', res);
        } catch (error) {
            console.error('Error deleting Country:', error);
            return response.exception('Error deleting Country', res);
        }
    }
};