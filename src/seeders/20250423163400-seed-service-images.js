'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('service_images', [
      {
        title: 'Hair Cut',
        image_url: 'https://example.com/service-images/hair-cut.jpg',
        thumbnail_url: 'https://example.com/service-images/hair-cut-thumb.jpg',
        category: 'hair',
        is_active: 1,
        sort_order: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        title: 'Hair Styling',
        image_url: 'https://example.com/service-images/hair-styling.jpg',
        thumbnail_url: 'https://example.com/service-images/hair-styling-thumb.jpg',
        category: 'hair',
        is_active: 1,
        sort_order: 2,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        title: 'Hair Coloring',
        image_url: 'https://example.com/service-images/hair-coloring.jpg',
        thumbnail_url: 'https://example.com/service-images/hair-coloring-thumb.jpg',
        category: 'hair',
        is_active: 1,
        sort_order: 3,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        title: 'Facial',
        image_url: 'https://example.com/service-images/facial.jpg',
        thumbnail_url: 'https://example.com/service-images/facial-thumb.jpg',
        category: 'beauty',
        is_active: 1,
        sort_order: 4,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        title: 'Manicure',
        image_url: 'https://example.com/service-images/manicure.jpg',
        thumbnail_url: 'https://example.com/service-images/manicure-thumb.jpg',
        category: 'nails',
        is_active: 1,
        sort_order: 5,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        title: 'Pedicure',
        image_url: 'https://example.com/service-images/pedicure.jpg',
        thumbnail_url: 'https://example.com/service-images/pedicure-thumb.jpg',
        category: 'nails',
        is_active: 1,
        sort_order: 6,
        created_at: new Date(),
        updated_at: new Date()
      }
    ], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('service_images', null, {});
  }
};
