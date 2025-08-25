const db = require('../../../startup/model');
const { Op } = require('sequelize');

module.exports = class PromoCodesResources {
  /**
   * Create a new promo code
   */
  async createPromoCode(data) {
    const transaction = await db.sequelize.transaction();
    
    try {
      // Check if code already exists
      const existingCode = await db.models.PromoCode.findOne({
        where: { code: data.code },
        transaction
      });

      if (existingCode) {
        await transaction.rollback();
        throw new Error('Promo code already exists');
      }

      const promoCode = await db.models.PromoCode.create(data, { transaction });
      await transaction.commit();
      
      return promoCode;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Get promo codes with pagination
   */
  async getPromoCodes(filters = {}, pagination = {}) {
    const { page = 1, limit = 20 } = pagination;
    const offset = (page - 1) * limit;

    const whereClause = { ...filters };

    const { count, rows } = await db.models.PromoCode.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: db.models.ServiceProvider,
          as: 'provider',
          attributes: ['id', 'salon_name', 'provider_type']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Calculate usage percentage for each promo code
    const promoCodesWithUsage = rows.map(promoCode => {
      const usagePercentage = promoCode.max_usage_count 
        ? Math.round((promoCode.current_usage_count / promoCode.max_usage_count) * 100)
        : 0;

      return {
        ...promoCode.toJSON(),
        usage_percentage: usagePercentage
      };
    });

    return {
      promo_codes: promoCodesWithUsage,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        total_pages: Math.ceil(count / limit)
      }
    };
  }

  /**
   * Get promo code by ID
   */
  async getPromoCodeById(id) {
    return await db.models.PromoCode.findByPk(id, {
      include: [
        {
          model: db.models.ServiceProvider,
          as: 'provider',
          attributes: ['id', 'salon_name', 'provider_type']
        }
      ]
    });
  }

  /**
   * Update promo code
   */
  async updatePromoCode(id, data) {
    const transaction = await db.sequelize.transaction();
    
    try {
      const promoCode = await db.models.PromoCode.findByPk(id, { transaction });
      if (!promoCode) {
        await transaction.rollback();
        throw new Error('Promo code not found');
      }

      // If updating code, check uniqueness
      if (data.code && data.code !== promoCode.code) {
        const existingCode = await db.models.PromoCode.findOne({
          where: { code: data.code },
          transaction
        });

        if (existingCode) {
          await transaction.rollback();
          throw new Error('Promo code already exists');
        }
      }

      await promoCode.update(data, { transaction });
      await transaction.commit();
      
      return promoCode;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Delete promo code
   */
  async deletePromoCode(id) {
    const transaction = await db.sequelize.transaction();
    
    try {
      const promoCode = await db.models.PromoCode.findByPk(id, { transaction });
      if (!promoCode) {
        await transaction.rollback();
        throw new Error('Promo code not found');
      }

      await promoCode.destroy({ transaction });
      await transaction.commit();
      
      return true;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Validate promo code
   */
  async validatePromoCode(code, providerId, serviceIds, subtotal) {
    const promoCode = await db.models.PromoCode.findOne({
      where: { 
        code: code.toUpperCase(),
        provider_id: providerId
      }
    });

    if (!promoCode) {
      return { valid: false, error: 'Invalid promo code' };
    }

    if (!promoCode.is_active) {
      return { valid: false, error: 'Promo code is inactive' };
    }

    const now = new Date();
    const validFrom = new Date(promoCode.valid_from);
    const validUntil = new Date(promoCode.valid_until);
    
    console.log('🔍 Promo Code Validation Debug:', {
      code: promoCode.code,
      now: now.toISOString(),
      valid_from: validFrom.toISOString(),
      valid_until: validUntil.toISOString(),
      isActive: promoCode.is_active,
      currentUsage: promoCode.current_usage_count,
      maxUsage: promoCode.max_usage_count,
      subtotal: subtotal,
      minBillAmount: promoCode.minimum_bill_amount
    });

    if (now < validFrom || now > validUntil) {
      console.log('❌ Date validation failed:', {
        nowBeforeValidFrom: now < validFrom,
        nowAfterValidUntil: now > validUntil
      });
      return { valid: false, error: 'Promo code expired or not yet valid' };
    }

    if (promoCode.max_usage_count && promoCode.current_usage_count >= promoCode.max_usage_count) {
      return { valid: false, error: 'Promo code usage limit reached' };
    }

    if (subtotal < promoCode.minimum_bill_amount) {
      return { 
        valid: false, 
        error: `Minimum bill amount of $${promoCode.minimum_bill_amount} required` 
      };
    }

    // Calculate discount
    const discountAmount = promoCode.calculateDiscount(subtotal);
    const finalAmount = subtotal - discountAmount;

    console.log('✅ Promo code validation successful:', {
      discount_amount: discountAmount,
      final_amount: finalAmount
    });

    return {
      valid: true,
      discount_amount: discountAmount,
      final_amount: finalAmount,
      promo_code_id: promoCode.id,
      promo_code: {
        code: promoCode.code,
        name: promoCode.name,
        discount_type: promoCode.discount_type,
        discount_value: promoCode.discount_value,
        minimum_bill_amount: promoCode.minimum_bill_amount
      }
    };
  }

  /**
   * Track promo code usage
   */
  async trackPromoCodeUsage(promoCodeId, customerId, bookingId, discountAmount) {
    const transaction = await db.sequelize.transaction();
    
    try {
      // Update usage count
      await db.models.PromoCode.increment('current_usage_count', {
        where: { id: promoCodeId },
        transaction
      });

      // Create usage record
      await db.models.PromoCodeUsage.create({
        promo_code_id: promoCodeId,
        customer_id: customerId,
        booking_id: bookingId,
        discount_amount: discountAmount
      }, { transaction });

      // Check if usage limit reached and deactivate if necessary
      const promoCode = await db.models.PromoCode.findByPk(promoCodeId, { transaction });
      if (promoCode.max_usage_count && promoCode.current_usage_count >= promoCode.max_usage_count) {
        await promoCode.update({ is_active: false }, { transaction });
      }

      await transaction.commit();
      return true;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Get promo code details with usage information
   */
  async getPromoCodeDetails(id, providerId) {
    const promoCode = await db.models.PromoCode.findOne({
      where: { id, provider_id: providerId },
      include: [
        {
          model: db.models.ServiceProvider,
          as: 'provider',
          attributes: ['id', 'salon_name', 'provider_type']
        },
        {
          model: db.models.PromoCodeUsage,
          as: 'usageRecords',
          include: [
            {
              model: db.models.User,
              as: 'customer',
              attributes: ['id', 'first_name', 'last_name', 'full_name']
            },
            {
              model: db.models.Booking,
              as: 'booking',
              attributes: ['id', 'booking_number', 'status', 'total_amount', 'created_at']
            }
          ],
          order: [['used_at', 'DESC']],
          limit: 10
        }
      ]
    });

    if (!promoCode) {
      return null;
    }

    // Calculate additional statistics
    const totalUsage = await db.models.PromoCodeUsage.count({
      where: { promo_code_id: id }
    });

    const totalDiscountGiven = await db.models.PromoCodeUsage.sum('discount_amount', {
      where: { promo_code_id: id }
    });

    return {
      ...promoCode.toJSON(),
      total_usage: totalUsage,
      total_discount_given: totalDiscountGiven || 0,
      usage_percentage: promoCode.max_usage_count 
        ? Math.round((promoCode.current_usage_count / promoCode.max_usage_count) * 100)
        : 0
    };
  }

  /**
   * Get available promo codes for provider (Customer)
   */
  async getAvailablePromoCodes(providerId, subtotal = 0) {
    const promoCodes = await db.models.PromoCode.findAll({
      where: {
        provider_id: providerId,
        is_active: true,
        valid_from: { [db.sequelize.Op.lte]: new Date() },
        valid_until: { [db.sequelize.Op.gte]: new Date() }
      },
      order: [['discount_value', 'DESC']]
    });

    const availablePromoCodes = promoCodes
      .filter(promoCode => {
        // Check if meets minimum bill amount
        if (subtotal < promoCode.minimum_bill_amount) {
          return false;
        }

        // Check if usage limit reached
        if (promoCode.max_usage_count && promoCode.current_usage_count >= promoCode.max_usage_count) {
          return false;
        }

        return true;
      })
      .map(promoCode => ({
        id: promoCode.id,
        code: promoCode.code,
        name: promoCode.name,
        discount_type: promoCode.discount_type,
        discount_value: promoCode.discount_value,
        minimum_bill_amount: promoCode.minimum_bill_amount,
        valid_until: promoCode.valid_until,
        current_usage_count: promoCode.current_usage_count,
        max_usage_count: promoCode.max_usage_count,
        estimated_discount: promoCode.calculateDiscount(subtotal),
        estimated_final_amount: subtotal - promoCode.calculateDiscount(subtotal)
      }));

    return {
      available_promo_codes: availablePromoCodes,
      count: availablePromoCodes.length,
      subtotal: subtotal
    };
  }

  /**
   * Get promo code analytics
   */
  async getPromoCodeAnalytics(providerId, period = 'month', promoCodeId = null) {
    try {
      const startDate = this.getStartDate(period);
      
      // Convert promoCodeId to number if it's a string
      const numericPromoCodeId = promoCodeId ? parseInt(promoCodeId) : null;

      console.log('🔍 Analytics Debug:', {
        providerId,
        period,
        promoCodeId: numericPromoCodeId,
        startDate
      });

      const analytics = await db.sequelize.transaction(async (transaction) => {
      // Get total promo codes
      const totalPromoCodes = await db.models.PromoCode.count({
        where: { provider_id: providerId },
        transaction
      });

      // Get active promo codes
      const activePromoCodes = await db.models.PromoCode.count({
        where: { 
          provider_id: providerId, 
          is_active: true,
          valid_until: { [Op.gte]: new Date() }
        },
        transaction
      });

      // Get total usage for the period
      let totalUsage = 0;
      let totalDiscountGiven = 0;
      let detailedPromoCodes = [];

      if (numericPromoCodeId) {
        // For specific promo code - get detailed analytics
        const specificPromoCode = await db.models.PromoCode.findOne({
          where: { 
            id: numericPromoCodeId,
            provider_id: providerId
          },
          transaction
        });

        if (!specificPromoCode) {
          throw new Error('Promo code not found or does not belong to this provider');
        }

        totalUsage = await db.models.PromoCodeUsage.count({
          where: { promo_code_id: numericPromoCodeId },
          transaction
        });

        totalDiscountGiven = await db.models.PromoCodeUsage.sum('discount_amount', {
          where: { promo_code_id: numericPromoCodeId },
          transaction
        });

        // Get detailed usage records for this specific promo code
        const usageRecords = await db.models.PromoCodeUsage.findAll({
          where: { promo_code_id: numericPromoCodeId },
          include: [
            {
              model: db.models.User,
              as: 'customer',
              attributes: ['id', 'first_name', 'last_name', 'full_name']
            },
            {
              model: db.models.Booking,
              as: 'booking',
              attributes: ['id', 'booking_number', 'status', 'total_amount', 'created_at']
            }
          ],
          order: [['used_at', 'DESC']],
          limit: 20,
          transaction
        });

        // Get usage by date (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const usageByDate = await db.models.PromoCodeUsage.findAll({
          where: { 
            promo_code_id: numericPromoCodeId,
            used_at: { [Op.gte]: thirtyDaysAgo }
          },
          attributes: [
            [db.sequelize.fn('DATE', db.sequelize.col('used_at')), 'date'],
            [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'usage_count'],
            [db.sequelize.fn('SUM', db.sequelize.col('discount_amount')), 'total_discount']
          ],
          group: [db.sequelize.fn('DATE', db.sequelize.col('used_at'))],
          order: [[db.sequelize.fn('DATE', db.sequelize.col('used_at')), 'DESC']],
          transaction
        });

        detailedPromoCodes = [{
          id: specificPromoCode.id,
          code: specificPromoCode.code,
          name: specificPromoCode.name,
          discount_type: specificPromoCode.discount_type,
          discount_value: specificPromoCode.discount_value,
          minimum_bill_amount: specificPromoCode.minimum_bill_amount,
          valid_from: specificPromoCode.valid_from,
          valid_until: specificPromoCode.valid_until,
          is_active: specificPromoCode.is_active,
          current_usage_count: specificPromoCode.current_usage_count,
          max_usage_count: specificPromoCode.max_usage_count,
          usage_count: totalUsage,
          total_discount: totalDiscountGiven || 0,
          usage_percentage: specificPromoCode.max_usage_count 
            ? Math.round((specificPromoCode.current_usage_count / specificPromoCode.max_usage_count) * 100)
            : 0,
          recent_usage_records: usageRecords.map(record => ({
            id: record.id,
            used_at: record.used_at,
            discount_amount: record.discount_amount,
            customer: record.customer ? {
              id: record.customer.id,
              name: record.customer.full_name
            } : null,
            booking: record.booking ? {
              id: record.booking.id,
              booking_number: record.booking.booking_number,
              total_amount: record.booking.total_amount,
              status: record.booking.status
            } : null
          })),
          usage_by_date: usageByDate.map(day => ({
            date: day.dataValues.date,
            usage_count: parseInt(day.dataValues.usage_count),
            total_discount: parseFloat(day.dataValues.total_discount) || 0
          }))
        }];

      } else {
        // For all promo codes in period
        const promoCodeIds = await db.models.PromoCode.findAll({
          where: { 
            provider_id: providerId,
            created_at: { [Op.gte]: startDate }
          },
          attributes: ['id'],
          transaction
        });

        if (promoCodeIds.length > 0) {
          const ids = promoCodeIds.map(pc => pc.id);
          totalUsage = await db.models.PromoCodeUsage.count({
            where: { promo_code_id: { [Op.in]: ids } },
            transaction
          });

          totalDiscountGiven = await db.models.PromoCodeUsage.sum('discount_amount', {
            where: { promo_code_id: { [Op.in]: ids } },
            transaction
          });
        }

        // Get all promo codes with detailed usage data
        const allPromoCodes = await db.models.PromoCode.findAll({
          where: { provider_id: providerId },
          attributes: [
            'id',
            'code',
            'name',
            'discount_type',
            'discount_value',
            'minimum_bill_amount',
            'valid_from',
            'valid_until',
            'is_active',
            'current_usage_count',
            'max_usage_count'
          ],
          transaction
        });

        // Get usage data separately to avoid JOIN issues
        for (const promoCode of allPromoCodes) {
          const usageCount = await db.models.PromoCodeUsage.count({
            where: { promo_code_id: promoCode.id },
            transaction
          });

          const totalDiscount = await db.models.PromoCodeUsage.sum('discount_amount', {
            where: { promo_code_id: promoCode.id },
            transaction
          });

          // Get recent usage (last 5 records)
          const recentUsage = await db.models.PromoCodeUsage.findAll({
            where: { promo_code_id: promoCode.id },
            include: [
              {
                model: db.models.User,
                as: 'customer',
                attributes: ['id', 'first_name', 'last_name', 'full_name']
              }
            ],
            order: [['used_at', 'DESC']],
            limit: 5,
            transaction
          });

          detailedPromoCodes.push({
            id: promoCode.id,
            code: promoCode.code,
            name: promoCode.name,
            discount_type: promoCode.discount_type,
            discount_value: promoCode.discount_value,
            minimum_bill_amount: promoCode.minimum_bill_amount,
            valid_from: promoCode.valid_from,
            valid_until: promoCode.valid_until,
            is_active: promoCode.is_active,
            current_usage_count: promoCode.current_usage_count,
            max_usage_count: promoCode.max_usage_count,
            usage_count: usageCount,
            total_discount: totalDiscount || 0,
            usage_percentage: promoCode.max_usage_count 
              ? Math.round((promoCode.current_usage_count / promoCode.max_usage_count) * 100)
              : 0,
            recent_usage: recentUsage.map(record => ({
              used_at: record.used_at,
              discount_amount: record.discount_amount,
              customer_name: record.customer ? record.customer.full_name : 'Unknown'
            }))
          });
        }

        // Sort by usage count for top performing
        detailedPromoCodes.sort((a, b) => b.usage_count - a.usage_count);
      }

      // Get monthly stats
      const monthlyStats = await db.models.PromoCode.findAll({
        where: { provider_id: providerId },
        attributes: [
          [db.sequelize.fn('DATE_FORMAT', db.sequelize.col('created_at'), '%Y-%m'), 'month'],
          [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'new_promo_codes']
        ],
        group: [db.sequelize.fn('DATE_FORMAT', db.sequelize.col('created_at'), '%Y-%m')],
        order: [[db.sequelize.literal('month'), 'DESC']],
        limit: 12,
        transaction
      });

             return {
         total_promo_codes: totalPromoCodes,
         active_promo_codes: activePromoCodes,
         total_usage: totalUsage,
         total_discount_given: totalDiscountGiven || 0,
         promo_codes: detailedPromoCodes,
         top_performing_promo_codes: detailedPromoCodes.slice(0, 5), // Top 5 by usage
         monthly_stats: monthlyStats.map(ms => ({
           month: ms.dataValues.month,
           new_promo_codes: parseInt(ms.dataValues.new_promo_codes)
         }))
       };
      });

      console.log('✅ Analytics completed successfully');
      return analytics;
    } catch (error) {
      console.error('❌ Analytics Error:', error);
      throw error;
    }
  }

  /**
   * Get start date based on period
   */
  getStartDate(period) {
    const now = new Date();
    switch (period) {
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getFullYear(), now.getMonth(), 1);
      case 'year':
        return new Date(now.getFullYear(), 0, 1);
      default:
        return new Date(now.getFullYear(), now.getMonth(), 1);
    }
  }
};
