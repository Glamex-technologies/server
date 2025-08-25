const BookingResources = require('./booking.resources');
const ResponseHelper = require('../../helpers/response.helpers');
const db = require('../../../startup/model');

const bookingResources = new BookingResources();
const response = new ResponseHelper();

module.exports = class BookingController {
  /**
   * Create a new booking (Customer)
   */
  async createBooking(req, res) {
    console.log('🎯 BookingController@createBooking - START');
    console.log('📋 Request body:', JSON.stringify(req.body, null, 2));
    console.log('🔐 Authorization header:', req.headers.authorization ? 'Present' : 'Missing');
    
    try {
      // Handle authentication mismatch - user tokens contain 'id' but middleware expects 'user_id'
      let customer = req.user;
      if (!customer && req.headers.authorization) {
        const { verifyToken } = require('../../helpers/jwtToken.helpers');
        const token = req.headers.authorization.split(' ')[1];
        const decoded = await verifyToken(token);
        if (decoded && decoded.userType === 'user') {
          // Find user using the id from token
          customer = await db.models.User.findByPk(decoded.id);
        }
      }
      
      if (!customer) {
        return response.forbidden('Authentication failed', res, null);
      }
      
      const data = req.body;

      console.log('🔍 Step 1: Validating provider...');
      console.log('📋 Provider ID:', data.provider_id);
      
      // Validate provider exists and is available
      const provider = await db.models.ServiceProvider.findByPk(data.provider_id);
      console.log('👤 Provider found:', provider ? 'YES' : 'NO');
      if (provider) {
        console.log('📊 Provider details:', {
          id: provider.id,
          is_available: provider.is_available,
          step_completed: provider.step_completed,
          salon_name: provider.salon_name
        });
      }
      
      if (!provider || !provider.is_available) {
        console.log('❌ Provider validation failed: Not available');
        return response.badRequest('Provider is not available', res, false);
      }
      
      // For now, allow providers who have completed all steps (step_completed >= 6)
      // In production, this should check is_approved field
      if (provider.step_completed < 6) {
        console.log('❌ Provider validation failed: Profile incomplete (step_completed:', provider.step_completed, ')');
        return response.badRequest('Provider profile is not complete', res, false);
      }
      
      console.log('✅ Provider validation passed');

      console.log('🔍 Step 2: Validating services...');
      console.log('📋 Service IDs:', data.service_ids);
      console.log('📋 Provider ID:', data.provider_id);
      
      // Get services from ServiceList and validate they belong to provider
      const serviceLists = await db.models.ServiceList.findAll({
        where: { 
          service_id: data.service_ids,
          service_provider_id: data.provider_id,
          status: 1
        },
        include: [
          {
            model: db.models.Service,
            as: 'service',
            attributes: ['id', 'title']
          }
        ]
      });

      console.log('📊 ServiceLists found:', serviceLists.length);
      console.log('📊 Expected services:', data.service_ids.length);
      console.log('📋 ServiceLists details:', serviceLists.map(sl => ({
        id: sl.id,
        service_id: sl.service_id,
        service_provider_id: sl.service_provider_id,
        price: sl.price,
        service_title: sl.service?.title
      })));

      if (serviceLists.length !== data.service_ids.length) {
        console.log('❌ Service validation failed: Not all services available');
        return response.badRequest('Some services are not available from this provider', res, false);
      }
      
      console.log('✅ Service validation passed');

      console.log('🔍 Step 3: Calculating totals...');
      
      // Calculate totals
      let subtotal = 0;
      let totalDuration = 0;
      const bookingServices = [];

      for (const serviceList of serviceLists) {
        const quantity = 1; // Default quantity
        const totalPrice = serviceList.price * quantity;
        subtotal += totalPrice;
        totalDuration += 60; // Default duration since Service model doesn't have duration_minutes

        bookingServices.push({
          service_id: serviceList.service_id,
          quantity: quantity,
          unit_price: serviceList.price,
          total_price: totalPrice
        });
        
        console.log('💰 Service calculation:', {
          service_id: serviceList.service_id,
          service_title: serviceList.service?.title,
          price: serviceList.price,
          quantity: quantity,
          total_price: totalPrice
        });
      }
      
      console.log('📊 Total calculation:', {
        subtotal: subtotal,
        total_duration_minutes: totalDuration,
        services_count: bookingServices.length
      });

      // Apply promo code if provided
      let discountAmount = 0;
      let promoCodeId = null;
      if (data.promo_code) {
        const PromoCodesResources = require('../promo-codes/promo-codes.resources');
        const promoCodesResources = new PromoCodesResources();
        
        const validationResult = await promoCodesResources.validatePromoCode(
          data.promo_code,
          data.provider_id,
          data.service_ids,
          subtotal
        );
        
        if (validationResult.valid) {
          discountAmount = validationResult.discount_amount;
          promoCodeId = validationResult.promo_code_id;
        } else {
          return response.badRequest(validationResult.error, res, false);
        }
      }

      const totalAmount = subtotal - discountAmount;
      const commissionAmount = (totalAmount * 15.0) / 100; // 15% commission
      const providerEarnings = totalAmount - commissionAmount;
      
      console.log('💰 Final calculation:', {
        subtotal: subtotal,
        discount_amount: discountAmount,
        total_amount: totalAmount,
        commission_amount: commissionAmount,
        provider_earnings: providerEarnings
      });

      console.log('🔍 Step 4: Checking availability...');
      console.log('📅 Scheduled date:', data.scheduled_date);
      console.log('⏰ Scheduled time:', data.scheduled_time);
      console.log('⏱️ Duration:', totalDuration, 'minutes');
      
      // Check availability
      const availability = await bookingResources.checkAvailability(
        data.provider_id,
        data.scheduled_date,
        data.scheduled_time,
        totalDuration
      );

      console.log('📊 Availability result:', availability);

      if (!availability.available) {
        console.log('❌ Availability check failed');
        return response.badRequest('Selected time slot is not available', res, false);
      }
      
      console.log('✅ Availability check passed');

      console.log('🔍 Step 5: Creating booking...');
      
      // Generate booking number
      const bookingNumber = await bookingResources.generateBookingNumber();
      console.log('📋 Generated booking number:', bookingNumber);

      // Create booking
      const bookingData = {
        booking_number: bookingNumber,
        customer_id: customer.id,
        provider_id: data.provider_id,
        scheduled_date: data.scheduled_date,
        scheduled_time: data.scheduled_time,
        total_duration_minutes: totalDuration,
        service_location_id: data.service_location_id,
        customer_address_id: data.customer_address_id,
        subtotal: subtotal,
        discount_amount: discountAmount,
        total_amount: totalAmount,
        commission_amount: commissionAmount,
        provider_earnings: providerEarnings,
        promo_code_id: promoCodeId,
        payment_status: 'pending',
        notes: data.notes
      };
      
      console.log('📋 Booking data to create:', JSON.stringify(bookingData, null, 2));

      const booking = await bookingResources.create(bookingData);
      console.log('✅ Booking created successfully:', {
        id: booking.id,
        booking_number: booking.booking_number
      });

      console.log('🔍 Step 6: Creating booking services...');
      
      // Create booking services
      for (const serviceData of bookingServices) {
        const bookingServiceData = {
          booking_id: booking.id,
          ...serviceData
        };
        console.log('📋 Creating booking service:', JSON.stringify(bookingServiceData, null, 2));
        
        await db.models.BookingService.create(bookingServiceData);
        console.log('✅ Booking service created for service_id:', serviceData.service_id);
      }
      
      console.log('✅ All booking services created successfully');

      // Track promo code usage if promo code was applied
      if (promoCodeId && discountAmount > 0) {
        console.log('🔍 Step 7: Tracking promo code usage...');
        try {
          const PromoCodesResources = require('../promo-codes/promo-codes.resources');
          const promoCodesResources = new PromoCodesResources();
          
          await promoCodesResources.trackPromoCodeUsage(
            promoCodeId,
            customer.id,
            booking.id,
            discountAmount
          );
          console.log('✅ Promo code usage tracked successfully');
        } catch (error) {
          console.error('❌ Failed to track promo code usage:', error.message);
          // Don't fail the booking creation if tracking fails
        }
      }

      console.log('🔍 Step 8: Creating payment intent...');
      
      // Mock payment intent (replace with actual Stripe integration)
      const paymentIntent = {
        client_secret: `pi_${booking.id}_secret_${Date.now()}`,
        amount: Math.round(totalAmount * 100), // Convert to cents
        currency: 'usd'
      };
      
      console.log('💳 Payment intent created:', paymentIntent);

      // Get promo code details if applied
      let promoCodeDetails = null;
      if (promoCodeId) {
        const PromoCodesResources = require('../promo-codes/promo-codes.resources');
        const promoCodesResources = new PromoCodesResources();
        const promoCode = await promoCodesResources.getPromoCodeById(promoCodeId);
        if (promoCode) {
          promoCodeDetails = {
            id: promoCode.id,
            code: promoCode.code,
            name: promoCode.name,
            discount_type: promoCode.discount_type,
            discount_value: promoCode.discount_value,
            minimum_bill_amount: promoCode.minimum_bill_amount
          };
        }
      }

      const result = {
        booking_id: booking.id,
        booking_number: booking.booking_number,
        total_duration_minutes: totalDuration,
        subtotal: subtotal,
        discount_amount: discountAmount,
        total_amount: totalAmount,
        promo_code: promoCodeDetails,
        payment_intent: paymentIntent
      };
      
      console.log('🎉 Final result:', JSON.stringify(result, null, 2));
      console.log('✅ BookingController@createBooking - SUCCESS');

      return response.success('Booking created successfully', res, result);
    } catch (error) {
      console.error('❌ BookingController@createBooking - ERROR');
      console.error('🔍 Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      if (error.errors) {
        console.error('📋 Validation errors:', error.errors);
      }
      
      if (error.sql) {
        console.error('🗄️ SQL Query:', error.sql);
      }
      
      return response.exception(error.message, res);
    }
  }

  /**
   * Get customer bookings
   */
  async getCustomerBookings(req, res) {
    console.log('BookingController@getCustomerBookings');
    try {
      // Handle authentication mismatch - user tokens contain 'id' but middleware expects 'user_id'
      let customer = req.user;
      if (!customer && req.headers.authorization) {
        const { verifyToken } = require('../../helpers/jwtToken.helpers');
        const token = req.headers.authorization.split(' ')[1];
        const decoded = await verifyToken(token);
        if (decoded && decoded.userType === 'user') {
          // Find user using the id from token
          customer = await db.models.User.findByPk(decoded.id);
        }
      }
      
      if (!customer) {
        return response.forbidden('Authentication failed', res, null);
      }
      
      const filters = req.query;

      const result = await bookingResources.getCustomerBookings(customer.id, filters);

      // Format response
      const formattedBookings = result.bookings.map(booking => ({
        id: booking.id,
        booking_number: booking.booking_number,
        provider: {
          id: booking.provider.id,
          name: booking.provider.salon_name || `${booking.provider.first_name} ${booking.provider.last_name}`,
          provider_type: booking.provider.provider_type,
          banner_image_url: booking.provider.banner_image
        },
        services: booking.bookingServices.map(bs => ({
          id: bs.service.id,
          name: bs.service.title,
          price: bs.unit_price,
          duration_minutes: 60 // Default duration since Service model doesn't have duration_minutes
        })),
        scheduled_date: booking.scheduled_date,
        scheduled_time: booking.scheduled_time,
        service_location: booking.serviceLocation ? {
          id: booking.serviceLocation.id,
          title: booking.serviceLocation.title,
          description: booking.serviceLocation.description
        } : null,
        customer_address: booking.customerAddress ? {
          id: booking.customerAddress.id,
          address: booking.customerAddress.address,
          latitude: booking.customerAddress.latitude,
          longitude: booking.customerAddress.longitude
        } : null,
        status: booking.status,
        total_amount: booking.total_amount,
        payment_status: booking.payment_status,
        created_at: booking.created_at
      }));

      return response.success('Customer bookings retrieved successfully', res, {
        bookings: formattedBookings,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Error in getCustomerBookings:', error);
      return response.exception(error.message, res);
    }
  }

  /**
   * Get booking details
   */
  async getBookingDetails(req, res) {
    console.log('BookingController@getBookingDetails');
    try {
      // Handle authentication mismatch - user tokens contain 'id' but middleware expects 'user_id'
      let customer = req.user;
      if (!customer && req.headers.authorization) {
        const { verifyToken } = require('../../helpers/jwtToken.helpers');
        const token = req.headers.authorization.split(' ')[1];
        const decoded = await verifyToken(token);
        if (decoded && decoded.userType === 'user') {
          // Find user using the id from token
          customer = await db.models.User.findByPk(decoded.id);
        }
      }
      
      if (!customer) {
        return response.forbidden('Authentication failed', res, null);
      }
      
      const bookingId = req.params.id;

      const booking = await bookingResources.findById(bookingId);

      if (!booking) {
        return response.notFound('Booking not found', res);
      }

      // Check if customer owns this booking
      if (booking.customer_id !== customer.id) {
        return response.forbidden('Access denied', res);
      }

      const result = {
        id: booking.id,
        booking_number: booking.booking_number,
        provider: {
          id: booking.provider.id,
          name: booking.provider.salon_name || `${booking.provider.first_name} ${booking.provider.last_name}`,
          provider_type: booking.provider.provider_type,
          banner_image_url: booking.provider.banner_image,
          phone_number: booking.provider.phone_number
        },
        services: booking.bookingServices.map(bs => ({
          id: bs.service.id,
          name: bs.service.title,
          price: bs.unit_price,
          duration_minutes: 60 // Default duration since Service model doesn't have duration_minutes
        })),
        scheduled_date: booking.scheduled_date,
        scheduled_time: booking.scheduled_time,
        service_location: booking.serviceLocation ? {
          id: booking.serviceLocation.id,
          title: booking.serviceLocation.title,
          description: booking.serviceLocation.description
        } : null,
        customer_address: booking.customerAddress ? {
          id: booking.customerAddress.id,
          address: booking.customerAddress.address,
          latitude: booking.customerAddress.latitude,
          longitude: booking.customerAddress.longitude,
          country: booking.customerAddress.country ? {
            id: booking.customerAddress.country.id,
            name: booking.customerAddress.country.name
          } : null,
          city: booking.customerAddress.city ? {
            id: booking.customerAddress.city.id,
            name: booking.customerAddress.city.name
          } : null
        } : null,
        status: booking.status,
        subtotal: booking.subtotal,
        discount_amount: booking.discount_amount,
        total_amount: booking.total_amount,
        payment_status: booking.payment_status,
        notes: booking.notes,
        provider_current_lat: booking.provider_current_lat,
        provider_current_lng: booking.provider_current_lng,
        estimated_arrival: booking.estimated_arrival,
        created_at: booking.created_at
      };

      return response.success('Booking details retrieved successfully', res, { booking: result });
    } catch (error) {
      console.error('Error in getBookingDetails:', error);
      return response.exception(error.message, res);
    }
  }

  /**
   * Cancel booking (Customer)
   */
  async cancelBooking(req, res) {
    console.log('BookingController@cancelBooking');
    try {
      // Handle authentication mismatch - user tokens contain 'id' but middleware expects 'user_id'
      let customer = req.user;
      if (!customer && req.headers.authorization) {
        const { verifyToken } = require('../../helpers/jwtToken.helpers');
        const token = req.headers.authorization.split(' ')[1];
        const decoded = await verifyToken(token);
        if (decoded && decoded.userType === 'user') {
          // Find user using the id from token
          customer = await db.models.User.findByPk(decoded.id);
        }
      }
      
      if (!customer) {
        return response.forbidden('Authentication failed', res, null);
      }
      
      const bookingId = req.params.id;
      const { reason } = req.body;

      const booking = await db.models.Booking.findByPk(bookingId);

      if (!booking) {
        return response.notFound('Booking not found', res);
      }

      if (booking.customer_id !== customer.id) {
        return response.forbidden('Access denied', res);
      }

      if (booking.status === 'cancelled') {
        return response.badRequest('Booking is already cancelled', res, false);
      }

      if (booking.status === 'completed') {
        return response.badRequest('Cannot cancel completed booking', res, false);
      }

      // Check cancellation policy (2 hours before booking)
      const bookingDateTime = new Date(`${booking.scheduled_date} ${booking.scheduled_time}`);
      const now = new Date();
      const hoursDifference = (bookingDateTime - now) / (1000 * 60 * 60);

      if (hoursDifference < 2) {
        return response.badRequest('Cannot cancel booking less than 2 hours before scheduled time', res, false);
      }

      await bookingResources.cancelBooking(bookingId, 'customer', reason);

      return response.success('Booking cancelled successfully', res, {
        refund_amount: booking.total_amount
      });
    } catch (error) {
      console.error('Error in cancelBooking:', error);
      return response.exception(error.message, res);
    }
  }

  /**
   * Get provider bookings
   */
  async getProviderBookings(req, res) {
    console.log('BookingController@getProviderBookings');
    try {
      const provider = req.provider;
      const filters = req.query;

      const result = await bookingResources.getProviderBookings(provider.id, filters);

      // Format response
      const formattedBookings = result.bookings.map(booking => ({
        id: booking.id,
        booking_number: booking.booking_number,
        customer: {
          id: booking.customer.id,
          first_name: booking.customer.first_name,
          last_name: booking.customer.last_name,
          phone_number: `${booking.customer.phone_code}${booking.customer.phone_number}`,
          profile_image_url: booking.customer.profile_image
        },
        services: booking.bookingServices.map(bs => ({
          id: bs.service.id,
          name: bs.service.title,
          price: bs.unit_price,
          duration_minutes: 60 // Default duration since Service model doesn't have duration_minutes
        })),
        scheduled_date: booking.scheduled_date,
        scheduled_time: booking.scheduled_time,
        service_location: booking.serviceLocation ? {
          id: booking.serviceLocation.id,
          title: booking.serviceLocation.title,
          description: booking.serviceLocation.description
        } : null,
        customer_address: booking.customerAddress ? {
          id: booking.customerAddress.id,
          address: booking.customerAddress.address,
          latitude: booking.customerAddress.latitude,
          longitude: booking.customerAddress.longitude
        } : null,
        status: booking.status,
        total_amount: booking.total_amount,
        provider_earnings: booking.provider_earnings,
        created_at: booking.created_at
      }));

      return response.success('Provider bookings retrieved successfully', res, {
        bookings: formattedBookings,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Error in getProviderBookings:', error);
      return response.exception(error.message, res);
    }
  }

  /**
   * Update booking status (Provider)
   */
  async updateBookingStatus(req, res) {
    console.log('BookingController@updateBookingStatus');
    try {
      const provider = req.provider;
      const bookingId = req.params.id;
      const { status, notes } = req.body;

      const booking = await db.models.Booking.findByPk(bookingId);

      if (!booking) {
        return response.notFound('Booking not found', res);
      }

      if (booking.provider_id !== provider.id) {
        return response.forbidden('Access denied', res);
      }

      await bookingResources.updateStatus(bookingId, status, notes);

      return response.success('Booking status updated successfully', res, {
        booking: {
          id: booking.id,
          status: status,
          notes: notes
        }
      });
    } catch (error) {
      console.error('Error in updateBookingStatus:', error);
      return response.exception(error.message, res);
    }
  }

  /**
   * Update provider location
   */
  async updateProviderLocation(req, res) {
    console.log('BookingController@updateProviderLocation');
    try {
      const provider = req.provider;
      const bookingId = req.params.id;
      const { latitude, longitude, estimated_arrival } = req.body;

      const booking = await db.models.Booking.findByPk(bookingId);

      if (!booking) {
        return response.notFound('Booking not found', res);
      }

      if (booking.provider_id !== provider.id) {
        return response.forbidden('Access denied', res);
      }

      await bookingResources.updateProviderLocation(bookingId, latitude, longitude, estimated_arrival);

      return response.success('Location updated successfully', res);
    } catch (error) {
      console.error('Error in updateProviderLocation:', error);
      return response.exception(error.message, res);
    }
  }

  /**
   * Get booking map view (Provider)
   */
  async getBookingMapView(req, res) {
    console.log('BookingController@getBookingMapView');
    try {
      const provider = req.provider;
      const { date, status } = req.query;

      const whereClause = {
        provider_id: provider.id
      };

      if (date) {
        whereClause.scheduled_date = date;
      }

      if (status) {
        whereClause.status = status;
      }

      const bookings = await db.models.Booking.findAll({
        where: whereClause,
        include: [
          {
            model: db.models.User,
            as: 'customer',
            attributes: ['first_name', 'last_name']
          }
        ],
        attributes: ['id', 'booking_number', 'scheduled_time', 'customer_lat', 'customer_lng', 'customer_address', 'status']
      });

      const result = bookings.map(booking => ({
        id: booking.id,
        booking_number: booking.booking_number,
        customer: {
          first_name: booking.customer.first_name,
          last_name: booking.customer.last_name
        },
        scheduled_time: booking.scheduled_time,
        customer_lat: booking.customer_lat,
        customer_lng: booking.customer_lng,
        customer_address: booking.customer_address,
        status: booking.status
      }));

      return response.success('Booking map view retrieved successfully', res, { bookings: result });
    } catch (error) {
      console.error('Error in getBookingMapView:', error);
      return response.exception(error.message, res);
    }
  }

  /**
   * Get booking statistics (Provider)
   */
  async getBookingStats(req, res) {
    console.log('BookingController@getBookingStats');
    try {
      const provider = req.provider;
      const { period } = req.query;

      const stats = await bookingResources.getProviderStats(provider.id, period);

      return response.success('Booking statistics retrieved successfully', res, { stats });
    } catch (error) {
      console.error('Error in getBookingStats:', error);
      return response.exception(error.message, res);
    }
  }
};
