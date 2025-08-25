const _ = require('lodash');
const Modles = require('../../../startup/model');
const db = require('../../../startup/model');
const { where } = require('sequelize');

const ServiceProvider = Modles.models.ServiceProvider;
const ServiceProviderDetail = Modles.models.ServiceProviderDetail;
const ServiceProviderAvailability = Modles.models.ServiceProviderAvailability;
const ServiceList = Modles.models.ServiceList;
const Token = Modles.models.Token;

module.exports = class ProviderResources {
  
  /**
   * Find a single ServiceProvider by a query object
   * @param {Object} query - Sequelize where query object
   * @returns {Promise<Object|null>} - Returns the found service provider or null if none found
   */
  async findOne(query) {
    try {
      const serviceProvider = await ServiceProvider.findOne({
        where: query,
      });
      return serviceProvider;
    } catch (error) {
      console.error('Error in finding admin:', error);
      throw error;
    }
  }

  /**
   * Get a ServiceProvider with associated details and availability
   * @param {Object} query - Sequelize where query object
   * @returns {Promise<Object|null>} - ServiceProvider including related detail and availability
   */
  async getAllDetails(query) {
    try {
      const serviceProvider = await ServiceProvider.findOne({
        where: query,
        include: [
          {
            model: ServiceProviderDetail,
            as: 'serviceProviderDetail', 
            attributes: ['id', 'service_provider_id', 'national_id', 'bank_account_name', 'bank_name', 'account_number', 'freelance_certificate', 'commertial_certificate'],
          },
          {
            model: ServiceProviderAvailability,
            as: 'serviceProviderAvailability',
            attributes: ['id', 'day', 'from_time', 'to_time', 'available'],
          },
        ],
      });
      return serviceProvider;
    } catch (error) {
      console.error('Error in finding admin:', error);
      throw error;
    }
  }

  /**
   * Create a new ServiceProvider (no longer uses phone_code/phone_number since those are in users table)
   * @param {Object} data - Data for ServiceProvider creation
   * @returns {Promise<Object>} - ServiceProvider model instance
   */
  async create(data) {
    try {
      const serviceProvider = await ServiceProvider.create(data);
      return serviceProvider;
    } catch (error) {
      console.error('Error in creating service provider:', error);
      throw error;
    }
  }

  /**
   * Update ServiceProvider matching query with provided data
   * @param {Object} data - Data to update
   * @param {Object} query - Where clause to find the provider(s)
   * @returns {Promise<Object>} - Updated ServiceProvider
   */
  async updateProvider(data, query) {
    try {
      await ServiceProvider.update(data, {
        where: query,
      });
      // Fetch and return updated record
      const updatedServiceProvider = await ServiceProvider.findOne({
        where: query,
      }); 
      return updatedServiceProvider;  
    } catch (error) {
      console.error('Error in updating provider:', error);
      throw error;
    }
  }

  /**
   * Cascade delete provider and all related data
   * @param {Number} providerId - ID of the service provider
   * @param {Object} transaction - Database transaction object
   * @returns {Promise<Object>} - Deletion result
   */
  async cascadeDeleteProvider(providerId, transaction = null) {
    try {
      const options = transaction ? { transaction } : {};
      const deletionResults = [];
      
      // Soft delete all related data with error handling
      const deletionPromises = [
        // Service lists
        ServiceList.update(
          { status: 0, deleted_at: new Date() },
          { where: { service_provider_id: providerId }, ...options }
        ).then(result => {
          deletionResults.push({ table: 'ServiceList', deleted: result[0] });
        }).catch(error => {
          console.log(`Error deleting ServiceList for provider ${providerId}:`, error.message);
          deletionResults.push({ table: 'ServiceList', error: error.message });
        }),
        
        // Availability records
        ServiceProviderAvailability.update(
          { available: 0, deleted_at: new Date() },
          { where: { service_provider_id: providerId }, ...options }
        ).then(result => {
          deletionResults.push({ table: 'ServiceProviderAvailability', deleted: result[0] });
        }).catch(error => {
          console.log(`Error deleting ServiceProviderAvailability for provider ${providerId}:`, error.message);
          deletionResults.push({ table: 'ServiceProviderAvailability', error: error.message });
        }),
        
        // Bank details
        BankDetails.update(
          { deleted_at: new Date() },
          { where: { service_provider_id: providerId }, ...options }
        ).then(result => {
          deletionResults.push({ table: 'BankDetails', deleted: result[0] });
        }).catch(error => {
          console.log(`Error deleting BankDetails for provider ${providerId}:`, error.message);
          deletionResults.push({ table: 'BankDetails', error: error.message });
        }),
        
        // Gallery images (if model exists)
        db.models.Gallery ? db.models.Gallery.update(
          { status: 0, deleted_at: new Date() },
          { where: { provider_id: providerId }, ...options }
        ).then(result => {
          deletionResults.push({ table: 'Gallery', deleted: result[0] });
        }).catch(error => {
          console.log(`Error deleting Gallery for provider ${providerId}:`, error.message);
          deletionResults.push({ table: 'Gallery', error: error.message });
        }) : Promise.resolve(),
        
        // Promo codes (if model exists)
        db.models.PromoCode ? db.models.PromoCode.update(
          { status: 0, deleted_at: new Date() },
          { where: { service_provider_id: providerId }, ...options }
        ).then(result => {
          deletionResults.push({ table: 'PromoCode', deleted: result[0] });
        }).catch(error => {
          console.log(`Error deleting PromoCode for provider ${providerId}:`, error.message);
          deletionResults.push({ table: 'PromoCode', error: error.message });
        }) : Promise.resolve()
      ];

      await Promise.all(deletionPromises);

      // Soft delete the service provider
      const providerResult = await ServiceProvider.update(
        {
          status: 0,
          is_available: 0,
          deleted_at: new Date(),
        },
        {
          where: { id: providerId },
          ...options
        }
      );

      deletionResults.push({ table: 'ServiceProvider', deleted: providerResult[0] });

      console.log(`Cascade deletion completed for provider ${providerId}:`, deletionResults);

      return { 
        success: true, 
        message: 'Provider and all related data deleted successfully',
        results: deletionResults
      };
    } catch (error) {
      console.error('Error in cascade delete provider:', error);
      throw error;
    }
  }

  /**
   * Create or update a ServiceProviderDetail record matching the query
   * @param {Object} data - Detail data to create or update
   * @param {Object} query - Where clause to find existing detail
   * @returns {Promise<Object>} - Created or updated ServiceProviderDetail
   */
  async createUpdateProviderDetail(data, query) {
    try {
      let serviceProviderDetail = await ServiceProviderDetail.findOne({ where: query });
      if (serviceProviderDetail) {
        await serviceProviderDetail.update(data);
      } else {
        serviceProviderDetail = await ServiceProviderDetail.create(data);
      }
      return serviceProviderDetail;
    } catch (error) {
      console.error('Error in creating/updating provider detail:', error);
      throw error;
    }
  }

  /**
   * Bulk create or update ServiceProviderAvailability records for a provider
   * Uses transaction to ensure all or nothing update
   * @param {Array} dataList - List of availability objects with day, from_time, to_time, available
   * @param {Number} service_provider_id - ID of the ServiceProvider
   * @returns {Promise<Boolean>} - True if successful
   */
  async createUpdateProviderAvailability(dataList, service_provider_id) {
    try {
      const availabilityRecords = dataList.map(item => ({
        service_provider_id: service_provider_id,
        day: item.day.toLowerCase(),
        from_time: item.from_time,
        to_time: item.to_time,
        available: item.available ?? 1
      }));
      const transaction = await ServiceProviderAvailability.sequelize.transaction();
      try {
        // Upsert availability records one by one inside transaction
        for (const record of availabilityRecords) {
          const existingRecord = await ServiceProviderAvailability.findOne({
            where: {
              service_provider_id: record.service_provider_id,
              day: record.day
            },
            transaction: transaction 
          });
          if (existingRecord) {
            await existingRecord.update({
              from_time: record.from_time,
              to_time: record.to_time,
              available: record.available
            }, { transaction });
          } else {
            await ServiceProviderAvailability.create(record, { transaction });
          }
        }
        await transaction.commit();
        return true;
      } catch (error) {
        // Rollback if any update fails
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      console.error('Error in bulk creating/updating provider availability:', error);
      throw error;
    }
  }

  /**
   * Fetch paginated list of ServiceProviders based on query, attributes and sorting options
   * @param {Object} query - Filter conditions for WHERE clause
   * @param {Array} attributes - List of attributes/columns to select
   * @param {String} sortBy - Column name to sort by
   * @param {String} sortOrder - Sort direction ('ASC' or 'DESC')
   * @param {Number} page - Current page number (1-based)
   * @param {Number} limit - Number of records per page
   * @returns {Promise<Object>} - Object with service providers and pagination info
   */
  async getAllWithPagination(query, attributes, sortBy, sortOrder, page, limit) {
    try {
      const offset = (page - 1) * limit;
      const result = await ServiceProvider.findAndCountAll({
        where: query,
        limit: limit ? parseInt(limit) : 10,
        offset: offset ? parseInt(offset) : 0,
        order: [
          [sortBy, sortOrder]  
        ],
        attributes: attributes,
        include: [
          {
            model: Modles.models.User,
            as: 'user',
            attributes: [
              'id',
              'first_name',
              'last_name',
              'full_name',
              'email',
              'phone_code',
              'phone_number',
              'gender',
              'is_verified',
              'verified_at',
              'profile_image',
              'status',
              'notification'
            ]
          }
        ]
      });
      const totalPages = Math.ceil(result.count / limit);
      return {
        service_providers: result.rows,
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

  /**
   * Find a single ServiceList record by query
   * @param {Object} query - Sequelize where clause
   * @returns {Promise<Object|null>} - ServiceList instance or null if none found
   */
  async findServiceList(query) {
    try {
      const serviceList = await ServiceList.findOne({
        where: query,
      });
      return serviceList;
    } catch (error) {
      console.error('Error in finding admin:', error);
      throw error;
    }
  }

  /**
   * Enhanced token invalidation with transaction safety and comprehensive error handling
   * @param {Object} query - Where clause for tokens to destroy
   * @returns {Promise<Number>} - Number of destroyed tokens
   */
  async logOut(query) {
    const transaction = await db.transaction();
    
    try {
      console.log('ProviderResources@logOut - Starting token invalidation');
      
      // Validate input parameters
      if (!query || !query.token) {
        throw new Error('Token parameter is required for logout');
      }

      // Verify token exists before deletion
      const existingToken = await Token.findOne({ 
        where: query,
        transaction: transaction 
      });

      if (!existingToken) {
        console.log('ProviderResources@logOut - Token not found in database');
        await transaction.rollback();
        return 0;
      }

      console.log('ProviderResources@logOut - Token found, proceeding with deletion');

      // Check if token is already expired
      if (new Date() > existingToken.expires_at) {
        console.log('ProviderResources@logOut - Token already expired, deleting anyway');
      }

      // Perform token deletion within transaction
      const deletedCount = await Token.destroy({ 
        where: query,
        transaction: transaction 
      });

      // Commit transaction
      await transaction.commit();

      console.log(`ProviderResources@logOut - Successfully deleted ${deletedCount} token(s)`);
      
      return deletedCount;

    } catch (error) {
      // Rollback transaction on error
      await transaction.rollback();
      
      console.error('ProviderResources@logOut - Error during token invalidation:', {
        error: error.message,
        stack: error.stack,
        query: query,
        timestamp: new Date().toISOString()
      });

      // Re-throw error for controller to handle
      throw error;
    }
  }

}