const Models = require('../../../startup/model');
const User = Models.models.User;
const ServiceProvider = Models.models.ServiceProvider;
const ServiceList = Models.models.ServiceList;
const Country = Models.models.Country;
const City = Models.models.City;

// AuthResources class handles authentication-related database operations for both users and providers
module.exports = class AuthResources {
    
    // User-related operations
    async findUser(query) {
        try {
            const user = await User.findOne({
                where: query,
                include: [
                    {
                        model: Country,
                        as: "country",
                        attributes: ['id', 'name'],
                    },
                    {
                        model: City,
                        as: "city",
                        attributes: ['id', 'name'],
                    },
                ],
            });
            return user;
        } catch (error) {
            console.error('Error in finding user:', error);
            throw error;
        }
    }

    async updateUser(data, query) {
        try {
            await User.update(data, {
                where: query,
            });
            // Fetch updated user
            const updatedUser = await User.findOne({
                where: query,
            }); 
            return updatedUser;  
        } catch (error) {
            console.error('Error in updating user:', error);
            throw error;
        }
    }

    // Provider-related operations
    async findProvider(query) {
        try {
            const provider = await ServiceProvider.findOne({
                where: query,
                include: [
                    {
                        model: Country,
                        as: "country",
                        attributes: ['id', 'name'],
                    },
                    {
                        model: City,
                        as: "city",
                        attributes: ['id', 'name'],
                    },
                ],
            });
            return provider;
        } catch (error) {
            console.error('Error in finding provider:', error);
            throw error;
        }
    }

    async updateProvider(data, query) {
        try {
            await ServiceProvider.update(data, {
                where: query,
            });
            // Fetch updated provider
            const updatedProvider = await ServiceProvider.findOne({
                where: query,
            }); 
            return updatedProvider;  
        } catch (error) {
            console.error('Error in updating provider:', error);
            throw error;
        }
    }

    // Provider service list check (for admin verification)
    async findProviderServiceList(query) {
        try {
            const serviceList = await ServiceList.findOne({
                where: query,
            });
            return serviceList;
        } catch (error) {
            console.error('Error in finding provider service list:', error);
            throw error;
        }
    }
};