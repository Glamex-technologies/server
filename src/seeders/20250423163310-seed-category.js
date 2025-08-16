'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('categories', [
      {
        title: 'Classic Haircut',
        service_id: 1, // Haircut service
        image: 'https://example.com/categories/classic-haircut.jpg',
        status: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        title: 'Modern Haircut',
        service_id: 1, // Haircut service
        image: 'https://example.com/categories/modern-haircut.jpg',
        status: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        title: 'Kids Haircut',
        service_id: 1, // Haircut service
        image: 'https://example.com/categories/kids-haircut.jpg',
        status: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        title: 'Highlights',
        service_id: 2, // Hair Coloring service
        image: 'https://example.com/categories/highlights.jpg',
        status: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        title: 'Full Color',
        service_id: 2, // Hair Coloring service
        image: 'https://example.com/categories/full-color.jpg',
        status: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        title: 'Balayage',
        service_id: 2, // Hair Coloring service
        image: 'https://example.com/categories/balayage.jpg',
        status: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        title: 'Classic Facial',
        service_id: 3, // Facial service
        image: 'https://example.com/categories/classic-facial.jpg',
        status: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        title: 'Anti-Aging Facial',
        service_id: 3, // Facial service
        image: 'https://example.com/categories/anti-aging-facial.jpg',
        status: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        title: 'Deep Tissue Massage',
        service_id: 4, // Massage service
        image: 'https://example.com/categories/deep-tissue-massage.jpg',
        status: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        title: 'Swedish Massage',
        service_id: 4, // Massage service
        image: 'https://example.com/categories/swedish-massage.jpg',
        status: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        title: 'Manicure',
        service_id: 5, // Nail Services
        image: 'https://example.com/categories/manicure.jpg',
        status: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        title: 'Pedicure',
        service_id: 5, // Nail Services
        image: 'https://example.com/categories/pedicure.jpg',
        status: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        title: 'Bridal Styling',
        service_id: 6, // Hair Styling service
        image: 'https://example.com/categories/bridal-styling.jpg',
        status: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        title: 'Party Styling',
        service_id: 6, // Hair Styling service
        image: 'https://example.com/categories/party-styling.jpg',
        status: 1,
        created_at: new Date(),
        updated_at: new Date()
      }
    ], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('categories', null, {});
  }
};