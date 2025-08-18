const { Op } = require('sequelize');
const db = require('../../../startup/model');

module.exports = class BookingResources {
  // Create a new booking
  async create(data) {
    try {
      const booking = await db.models.Booking.create(data);
      return booking;
    } catch (error) {
      console.error('Error in creating booking:', error);
      throw error;
    }
  }

  // Find booking by ID with all related data
  async findById(id) {
    try {
      const booking = await db.models.Booking.findByPk(id, {
        include: [
          {
            model: db.models.User,
            as: 'customer',
            attributes: ['id', 'first_name', 'last_name', 'full_name', 'phone_code', 'phone_number', 'profile_image']
          },
          {
            model: db.models.ServiceProvider,
            as: 'provider',
            attributes: ['id', 'salon_name', 'provider_type', 'banner_image', 'description']
          },
          {
            model: db.models.ServiceLocation,
            as: 'serviceLocation',
            attributes: ['id', 'title', 'description']
          },
          {
            model: db.models.UserAddress,
            as: 'customerAddress',
            attributes: ['id', 'address', 'latitude', 'longitude'],
            include: [
              {
                model: db.models.Country,
                as: 'country',
                attributes: ['id', 'name']
              },
              {
                model: db.models.City,
                as: 'city',
                attributes: ['id', 'name']
              }
            ]
          },
          {
            model: db.models.BookingService,
            as: 'bookingServices',
            include: [
              {
                model: db.models.Service,
                as: 'service',
                attributes: ['id', 'title', 'description']
              }
            ]
          },
          // Promo code relationship (commented out as PromoCode model doesn't exist yet)
          // {
          //   model: db.models.PromoCode,
          //   as: 'promoCode',
          //   attributes: ['id', 'code', 'discount_percentage']
          // }
        ]
      });
      return booking;
    } catch (error) {
      console.error('Error in finding booking:', error);
      throw error;
    }
  }

  // Get customer bookings with pagination and filters
  async getCustomerBookings(customerId, filters = {}) {
    try {
      const {
        status,
        filter,
        page = 1,
        limit = 20
      } = filters;

      // Convert pagination parameters to integers
      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);

      const whereClause = {
        customer_id: customerId
      };

      // Add status filter
      if (status) {
        whereClause.status = status;
      }

      // Add date filter
      if (filter === 'upcoming') {
        whereClause.scheduled_date = {
          [Op.gte]: new Date().toISOString().split('T')[0]
        };
      } else if (filter === 'past') {
        whereClause.scheduled_date = {
          [Op.lt]: new Date().toISOString().split('T')[0]
        };
      }

      const offset = (pageNum - 1) * limitNum;

      const result = await db.models.Booking.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: db.models.ServiceProvider,
            as: 'provider',
            attributes: ['id', 'salon_name', 'provider_type', 'banner_image']
          },
          {
            model: db.models.ServiceLocation,
            as: 'serviceLocation',
            attributes: ['id', 'title', 'description']
          },
          {
            model: db.models.UserAddress,
            as: 'customerAddress',
            attributes: ['id', 'address', 'latitude', 'longitude']
          },
          {
            model: db.models.BookingService,
            as: 'bookingServices',
            include: [
              {
                model: db.models.Service,
                as: 'service',
                attributes: ['id', 'title']
              }
            ]
          }
        ],
        order: [['created_at', 'DESC']],
        limit: limitNum,
        offset: offset
      });

      return {
        bookings: result.rows,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: result.count,
          total_pages: Math.ceil(result.count / limitNum)
        }
      };
    } catch (error) {
      console.error('Error in getting customer bookings:', error);
      throw error;
    }
  }

  // Get provider bookings with pagination and filters
  async getProviderBookings(providerId, filters = {}) {
    try {
      const {
        status,
        filter,
        date,
        page = 1,
        limit = 20
      } = filters;

      // Convert pagination parameters to integers
      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);

      const whereClause = {
        provider_id: providerId
      };

      // Add status filter
      if (status) {
        whereClause.status = status;
      }

      // Add date filter
      if (date) {
        whereClause.scheduled_date = date;
      } else if (filter === 'upcoming') {
        whereClause.scheduled_date = {
          [Op.gte]: new Date().toISOString().split('T')[0]
        };
      } else if (filter === 'past') {
        whereClause.scheduled_date = {
          [Op.lt]: new Date().toISOString().split('T')[0]
        };
      }

      const offset = (pageNum - 1) * limitNum;

      const result = await db.models.Booking.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: db.models.User,
            as: 'customer',
            attributes: ['id', 'first_name', 'last_name', 'phone_code', 'phone_number', 'profile_image']
          },
          {
            model: db.models.BookingService,
            as: 'bookingServices',
            include: [
              {
                model: db.models.Service,
                as: 'service',
                attributes: ['id', 'title']
              }
            ]
          }
        ],
        order: [['scheduled_date', 'ASC'], ['scheduled_time', 'ASC']],
        limit: limitNum,
        offset: offset
      });

      return {
        bookings: result.rows,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: result.count,
          total_pages: Math.ceil(result.count / limitNum)
        }
      };
    } catch (error) {
      console.error('Error in getting provider bookings:', error);
      throw error;
    }
  }

  // Update booking status
  async updateStatus(bookingId, status, notes = null) {
    try {
      const booking = await db.models.Booking.findByPk(bookingId);
      if (!booking) {
        throw new Error('Booking not found');
      }

      const updateData = { status };
      if (notes) {
        updateData.notes = notes;
      }

      await booking.update(updateData);
      return booking;
    } catch (error) {
      console.error('Error in updating booking status:', error);
      throw error;
    }
  }

  // Update provider location
  async updateProviderLocation(bookingId, latitude, longitude, estimatedArrival = null) {
    try {
      const booking = await db.models.Booking.findByPk(bookingId);
      if (!booking) {
        throw new Error('Booking not found');
      }

      const updateData = {
        provider_current_lat: latitude,
        provider_current_lng: longitude
      };

      if (estimatedArrival) {
        updateData.estimated_arrival = estimatedArrival;
      }

      await booking.update(updateData);
      return booking;
    } catch (error) {
      console.error('Error in updating provider location:', error);
      throw error;
    }
  }

  // Cancel booking
  async cancelBooking(bookingId, cancelledBy, reason = null) {
    try {
      const booking = await db.models.Booking.findByPk(bookingId);
      if (!booking) {
        throw new Error('Booking not found');
      }

      await booking.update({
        status: 'cancelled',
        cancelled_by: cancelledBy,
        cancellation_reason: reason
      });

      return booking;
    } catch (error) {
      console.error('Error in cancelling booking:', error);
      throw error;
    }
  }

  // Get booking statistics for provider
  async getProviderStats(providerId, period = 'month') {
    try {
      const now = new Date();
      let startDate;

      switch (period) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      const bookings = await db.models.Booking.findAll({
        where: {
          provider_id: providerId,
          created_at: {
            [Op.gte]: startDate
          }
        },
        attributes: ['status', 'total_amount', 'provider_earnings']
      });

      const stats = {
        total_bookings: bookings.length,
        pending_bookings: bookings.filter(b => b.status === 'pending').length,
        accepted_bookings: bookings.filter(b => b.status === 'accepted').length,
        completed_bookings: bookings.filter(b => b.status === 'completed').length,
        cancelled_bookings: bookings.filter(b => b.status === 'cancelled').length,
        total_earnings: bookings.reduce((sum, b) => sum + parseFloat(b.provider_earnings || 0), 0),
        average_booking_value: bookings.length > 0 ? 
          bookings.reduce((sum, b) => sum + parseFloat(b.total_amount || 0), 0) / bookings.length : 0,
        completion_rate: bookings.length > 0 ? 
          (bookings.filter(b => b.status === 'completed').length / bookings.length) * 100 : 0
      };

      return stats;
    } catch (error) {
      console.error('Error in getting provider stats:', error);
      throw error;
    }
  }

  // Check booking availability
  async checkAvailability(providerId, date, time, duration) {
    try {
      const startTime = new Date(`${date} ${time}`);
      const endTime = new Date(startTime.getTime() + duration * 60000);

      const conflictingBookings = await db.models.Booking.findAll({
        where: {
          provider_id: providerId,
          scheduled_date: date,
          status: {
            [Op.notIn]: ['cancelled', 'rejected']
          },
          [Op.or]: [
            {
              scheduled_time: {
                [Op.gte]: time,
                [Op.lt]: endTime.toTimeString().slice(0, 8)
              }
            },
            {
              scheduled_time: {
                [Op.lte]: time
              }
            }
          ]
        }
      });

      return {
        available: conflictingBookings.length === 0,
        conflicting_bookings: conflictingBookings
      };
    } catch (error) {
      console.error('Error in checking availability:', error);
      throw error;
    }
  }

  // Generate booking number
  async generateBookingNumber() {
    try {
      const lastBooking = await db.models.Booking.findOne({
        order: [['id', 'DESC']]
      });

      const nextNumber = lastBooking ? parseInt(lastBooking.booking_number.slice(3)) + 1 : 1;
      return `GLX${nextNumber.toString().padStart(6, '0')}`;
    } catch (error) {
      console.error('Error in generating booking number:', error);
      throw error;
    }
  }
};
