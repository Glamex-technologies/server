const PromoCodesResources = require('./promo-codes.resources');
const ResponseHelper = require('../../helpers/response.helpers');
const S3Helper = require('../../helpers/s3Helper.helpers');
const db = require('../../../startup/model');
const { Op } = require('sequelize');

const promoCodesResources = new PromoCodesResources();
const response = new ResponseHelper();
const s3Helper = new S3Helper();

module.exports = class PromoCodesController {
  /**
   * Create a new promo code (Provider)
   */
  async createPromoCode(req, res) {
    console.log('🎯 PromoCodesController@createPromoCode - START');
    
    try {
      const provider = req.user;
      const data = req.body;
      
      // Handle file upload if template image is provided
      let templateImageUrl = null;
      if (req.file) {
        const uploadResult = await s3Helper.uploadFile(
          req.file,
          'promo-codes/templates',
          `template_${Date.now()}_${req.file.originalname}`
        );
        templateImageUrl = uploadResult.Location;
      }

      // Generate unique promo code if not provided
      if (!data.code) {
        data.code = await this.generateUniqueCode();
      }

      const promoCodeData = {
        provider_id: provider.id,
        code: data.code.toUpperCase(),
        name: data.name,
        template_image_url: templateImageUrl,
        discount_type: data.discount_type,
        discount_value: parseFloat(data.discount_value),
        minimum_bill_amount: parseFloat(data.minimum_bill_amount) || 0,
        max_usage_count: data.max_usage_count ? parseInt(data.max_usage_count) : null,
        valid_from: new Date(data.valid_from),
        valid_until: new Date(data.valid_until),
        is_active: true
      };

      const promoCode = await promoCodesResources.createPromoCode(promoCodeData);
      
      return response.created('Promo code created successfully', res, promoCode);
    } catch (error) {
      console.error('❌ PromoCodesController@createPromoCode - ERROR:', error);
      return response.exception(error.message, res);
    }
  }

  /**
   * Get provider's promo codes
   */
  async getProviderPromoCodes(req, res) {
    console.log('🎯 PromoCodesController@getProviderPromoCodes - START');
    
    try {
      const provider = req.user;
      const { page = 1, limit = 20, is_active } = req.query;
      
      const filters = { provider_id: provider.id };
      if (is_active !== undefined) {
        filters.is_active = is_active === 'true';
      }

      const result = await promoCodesResources.getPromoCodes(filters, {
        page: parseInt(page),
        limit: parseInt(limit)
      });
      
      return response.success('Promo codes retrieved successfully', res, result);
    } catch (error) {
      console.error('❌ PromoCodesController@getProviderPromoCodes - ERROR:', error);
      return response.exception(error.message, res);
    }
  }

  /**
   * Update promo code
   */
  async updatePromoCode(req, res) {
    console.log('🎯 PromoCodesController@updatePromoCode - START');
    
    try {
      const provider = req.user;
      const { id } = req.params;
      const data = req.body;

      // Verify promo code belongs to provider
      const existingPromoCode = await promoCodesResources.getPromoCodeById(id);
      if (!existingPromoCode || existingPromoCode.provider_id !== provider.id) {
        return response.notFound('Promo code not found', res);
      }

      // Handle file upload if new template image is provided
      let templateImageUrl = existingPromoCode.template_image_url;
      if (req.file) {
        const uploadResult = await s3Helper.uploadFile(
          req.file,
          'promo-codes/templates',
          `template_${Date.now()}_${req.file.originalname}`
        );
        templateImageUrl = uploadResult.Location;
      }

      const updateData = {
        name: data.name,
        template_image_url: templateImageUrl,
        discount_value: data.discount_value ? parseFloat(data.discount_value) : undefined,
        minimum_bill_amount: data.minimum_bill_amount ? parseFloat(data.minimum_bill_amount) : undefined,
        max_usage_count: data.max_usage_count ? parseInt(data.max_usage_count) : undefined,
        valid_until: data.valid_until ? new Date(data.valid_until) : undefined,
        is_active: data.is_active !== undefined ? data.is_active : undefined
      };

      // Remove undefined values
      Object.keys(updateData).forEach(key => 
        updateData[key] === undefined && delete updateData[key]
      );

      const updatedPromoCode = await promoCodesResources.updatePromoCode(id, updateData);
      
      return response.success('Promo code updated successfully', res, updatedPromoCode);
    } catch (error) {
      console.error('❌ PromoCodesController@updatePromoCode - ERROR:', error);
      return response.exception(error.message, res);
    }
  }

  /**
   * Delete promo code
   */
  async deletePromoCode(req, res) {
    console.log('🎯 PromoCodesController@deletePromoCode - START');
    
    try {
      const provider = req.user;
      const { id } = req.params;

      // Verify promo code belongs to provider
      const existingPromoCode = await promoCodesResources.getPromoCodeById(id);
      if (!existingPromoCode || existingPromoCode.provider_id !== provider.id) {
        return response.notFound('Promo code not found', res);
      }

      await promoCodesResources.deletePromoCode(id);
      
      return response.success('Promo code deleted successfully', res);
    } catch (error) {
      console.error('❌ PromoCodesController@deletePromoCode - ERROR:', error);
      return response.exception(error.message, res);
    }
  }

  /**
   * Validate promo code (Customer)
   */
  async validatePromoCode(req, res) {
    console.log('🎯 PromoCodesController@validatePromoCode - START');
    
    try {
      const { promo_code, provider_id, service_ids, subtotal } = req.body;

      const validationResult = await promoCodesResources.validatePromoCode(
        promo_code,
        provider_id,
        service_ids,
        parseFloat(subtotal)
      );

      if (!validationResult.valid) {
        return response.badRequest(validationResult.error, res);
      }

      return response.success('Promo code validated successfully', res, validationResult);
    } catch (error) {
      console.error('❌ PromoCodesController@validatePromoCode - ERROR:', error);
      return response.exception(error.message, res);
    }
  }

  /**
   * Get promo code details
   */
  async getPromoCodeDetails(req, res) {
    console.log('🎯 PromoCodesController@getPromoCodeDetails - START');
    
    try {
      const { id } = req.params;
      const provider = req.user;

      const promoCode = await promoCodesResources.getPromoCodeDetails(id, provider.id);
      if (!promoCode) {
        return response.notFound('Promo code not found', res);
      }

      return response.success('Promo code details retrieved successfully', res, promoCode);
    } catch (error) {
      console.error('❌ PromoCodesController@getPromoCodeDetails - ERROR:', error);
      return response.exception(error.message, res);
    }
  }

  /**
   * Get promo code analytics
   */
  async getPromoCodeAnalytics(req, res) {
    console.log('🎯 PromoCodesController@getPromoCodeAnalytics - START');
    
    try {
      const provider = req.user;
      const { period = 'month', promo_code_id } = req.query;

      console.log('📊 Analytics Request:', {
        provider_id: provider.id,
        period: period,
        promo_code_id: promo_code_id
      });

      // Convert promo_code_id to number if it's a string
      const numericPromoCodeId = promo_code_id ? parseInt(promo_code_id) : null;

      const analytics = await promoCodesResources.getPromoCodeAnalytics(
        provider.id,
        period,
        numericPromoCodeId
      );

      return response.success('Analytics retrieved successfully', res, analytics);
    } catch (error) {
      console.error('❌ PromoCodesController@getPromoCodeAnalytics - ERROR:', error);
      return response.exception(error.message, res);
    }
  }

  /**
   * Get available promo codes for provider (Customer)
   */
  async getAvailablePromoCodes(req, res) {
    console.log('🎯 PromoCodesController@getAvailablePromoCodes - START');
    
    try {
      const { provider_id } = req.params;
      const { subtotal = 0 } = req.query;

      const result = await promoCodesResources.getAvailablePromoCodes(
        parseInt(provider_id),
        parseFloat(subtotal)
      );
      
      return response.success('Available promo codes retrieved successfully', res, result);
    } catch (error) {
      console.error('❌ PromoCodesController@getAvailablePromoCodes - ERROR:', error);
      return response.exception(error.message, res);
    }
  }

  /**
   * Get promo codes for provider (Hybrid - supports both user and provider tokens)
   */
  async getPromoCodesForProvider(req, res) {
    console.log('🎯 PromoCodesController@getPromoCodesForProvider - START');
    
    try {
      const { provider_id } = req.params;
      const { page = 1, limit = 20, is_active } = req.query;
      
      // Check if user is authenticated (either as user or provider)
      let isAuthenticated = false;
      let isOwner = false;
      
      if (req.user) {
        isAuthenticated = true;
        // Check if the authenticated user is the owner of these promo codes
        if (req.user.userType === 'provider' && req.user.id === parseInt(provider_id)) {
          isOwner = true;
        }
      }
      
      const filters = { provider_id: parseInt(provider_id) };
      if (is_active !== undefined) {
        filters.is_active = is_active === 'true';
      }

      // If not owner, only show active promo codes
      if (!isOwner) {
        filters.is_active = true;
        filters.valid_from = { [db.sequelize.Op.lte]: new Date() };
        filters.valid_until = { [db.sequelize.Op.gte]: new Date() };
      }

      const result = await promoCodesResources.getPromoCodes(filters, {
        page: parseInt(page),
        limit: parseInt(limit)
      });
      
      return response.success('Promo codes retrieved successfully', res, {
        ...result,
        is_owner: isOwner,
        is_authenticated: isAuthenticated
      });
    } catch (error) {
      console.error('❌ PromoCodesController@getPromoCodesForProvider - ERROR:', error);
      return response.exception(error.message, res);
    }
  }

  /**
   * Generate unique promo code
   */
  async generateUniqueCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code;
    let isUnique = false;
    
    while (!isUnique) {
      code = '';
      for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      
      const existingCode = await db.models.PromoCode.findOne({
        where: { code: code }
      });
      
      if (!existingCode) {
        isUnique = true;
      }
    }
    
    return code;
  }
};
