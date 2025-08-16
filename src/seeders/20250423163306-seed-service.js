'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('services', [
      {
        title: 'Haircut',
        image: 'https://example.com/services/haircut.jpg',
        status: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        title: 'Hair Coloring',
        image: 'https://example.com/services/hair-coloring.jpg',
        status: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        title: 'Facial',
        image: 'https://example.com/services/facial.jpg',
        status: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        title: 'Massage',
        image: 'https://example.com/services/massage.jpg',
        status: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        title: 'Nail Services',
        image: 'https://example.com/services/nail-services.jpg',
        status: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        title: 'Hair Styling',
        image: 'https://example.com/services/hair-styling.jpg',
        status: 1,
        created_at: new Date(),
        updated_at: new Date()
      }
    ], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('services', null, {});
  }
};