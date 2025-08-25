'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Get the first service provider for seeding
    const serviceProviders = await queryInterface.sequelize.query(
      'SELECT id FROM service_providers LIMIT 1',
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (serviceProviders.length === 0) {
      console.log('No service providers found. Skipping promo codes seeding.');
      return;
    }

    const providerId = serviceProviders[0].id;
    const now = new Date();
    const oneMonthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    // For development: set valid_from to past date so promo codes are immediately valid
    const pastDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

    await queryInterface.bulkInsert('promo_codes', [
      {
        provider_id: providerId,
        code: 'SUMMER25',
        name: 'Summer Discount',
        template_image_url: null,
        discount_type: 'percentage',
        discount_value: 25.00,
        minimum_bill_amount: 50.00,
        max_usage_count: 50,
        current_usage_count: 0,
        valid_from: pastDate,
        valid_until: oneMonthFromNow,
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        provider_id: providerId,
        code: 'WELCOME10',
        name: 'Welcome Offer',
        template_image_url: null,
        discount_type: 'fixed',
        discount_value: 10.00,
        minimum_bill_amount: 50.00,
        max_usage_count: 100,
        current_usage_count: 0,
        valid_from: pastDate,
        valid_until: oneMonthFromNow,
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        provider_id: providerId,
        code: 'FLASH30',
        name: 'Flash Sale',
        template_image_url: null,
        discount_type: 'percentage',
        discount_value: 30.00,
        minimum_bill_amount: 200.00,
        max_usage_count: 25,
        current_usage_count: 0,
        valid_from: pastDate,
        valid_until: oneMonthFromNow,
        is_active: true,
        created_at: now,
        updated_at: now
      }
    ], {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('promo_codes', null, {});
  }
};
