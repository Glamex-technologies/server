const _ = require('lodash')
const Modles = require('../../../startup/model');
const { where } = require('sequelize');
const User = Modles.models.User;
const UserAddress = Modles.models.UserAddress;
const Token = Modles.models.Token;

// UserResources class handles user-related database operations
module.exports = class UserResources {
  // Find a single user by query
  async findOne(query) {
    try {
      const user = await User.findOne({
          where: query,
      });
      return user;
    } catch (error) {
      console.error('Error in finding admin:', error);
      throw error;
    }
  }

  // Get user details along with address info
  async getAllDetails(query) {
    try {
      const user = await User.findOne({
        where: query,
        include: [
          {
            model: UserAddress,
            as: "addresses",
            attributes: ['id', 'address', 'latitude', 'longitude', 'country_id', 'city_id'],
          },
        ],
      });
      return user;
    } catch (error) {
      console.error('Error in finding admin:', error);
      throw error;
    }
  }

  // Create a new user (validation should prevent duplicates)
  async create(data) {
    try {
      const user = await User.create(data);
      return user;
    } catch (error) {
      console.error('Error in creating user:', error);
      throw error;
    }
  }

  // Update user data based on query
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
      console.error('Error in updating provider:', error);
      throw error;
    }
  }
      
  // Get users with pagination, sorting, and status counts
  async getAllWithPagination(query, attributes,sortBy, sortOrder, page, limit) {
    try {
      const offset = (page - 1) * limit;
      const result = await User.findAndCountAll({
        where: query,
        limit: limit ? limit : 10,
        offset: offset ? offset : 0,
        order: [
          [sortBy, sortOrder]  
        ],
        attributes: attributes,
        include: [
          {
            model: UserAddress,
            as: "addresses",
            attributes: ['id', 'address', 'latitude', 'longitude', 'country_id', 'city_id'],
          },
        ],
      });
      // Calculate total pages
      const totalPages = Math.ceil(result.count / limit);
      // Count users by status
      const [activeCount, inactiveCount, blockedCount] = await Promise.all([
        User.count({ where: { ...query, status: 1 } }),
        User.count({ where: { ...query, status: 2 } }),
        User.count({ where: { ...query, status: 3 } }),
      ]);
      return {
        users: result.rows,
        active_users: activeCount,
        in_active_users: inactiveCount,
        blocked_users: blockedCount,
        total_users: result.count,
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

  // Log out user by destroying token(s)
  async logOut(query){
    try{
      return await Token.destroy({where: query});
    } catch(err){
      console.log(err);
      throw err;
    }
  }
  
}