const _ = require('lodash');
const Modles = require('../../../startup/model');
const Admin = Modles.models.Admin;
const Role = Modles.models.Role;
const Token = Modles.models.Token;

/**
 * AdminResources: Handles all database operations related to Admins.
 */
module.exports = class AdminResources {

  /**
   * Finds a single admin by a query and includes associated role data.
   * 
   * @param {Object} query - Sequelize where clause to find the admin.
   * @returns {Promise<Object|null>} - Returns the found admin or null.
   */
  async findOne(query) {
    try {
      const admin = await Admin.findOne({
        where: query,
        include: [
          {
            model: Role,
            as: 'roleData',
            attributes: ['id', 'title'], // Select only specific fields from Role
          },
        ],
      });
      return admin;
    } catch (error) {
      console.error('Error in finding admin:', error);
      throw error;
    }
  }

  /**
   * Updates admin data based on the query, then fetches and returns the updated admin.
   * 
   * @param {Object} data - The fields to update.
   * @param {Object} query - Sequelize where clause to locate the admin.
   * @returns {Promise<Object>} - Returns the updated admin object.
   */
  async updateAdmin(data, query) {
    try {
      await Admin.update(data, {
        where: query,
      });
      const updatedAdmin = await Admin.findOne({
        where: query,
      });
      return updatedAdmin;
    } catch (error) {
      console.error('Error in updating admin:', error);
      throw error;
    }
  }

  /**
   * Log out admin by destroying token(s)
   * 
   * @param {Object} query - Sequelize where clause to find tokens.
   * @returns {Promise<Number>} - Returns number of destroyed token records.
   */
  async logOut(query) {
    try {
      console.log('AdminResources@logOut - Starting token invalidation');
      return await Token.destroy({ where: query });
    } catch (error) {
      console.error('AdminResources@logOut - Error during token invalidation:', error);
      throw error;
    }
  }

};