'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('categories', [
      {
        title: 'Hair Services',
        image: 'https://example.com/categories/hair-services.jpg',
        status: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        title: 'Beauty Services',
        image: 'https://example.com/categories/beauty-services.jpg',
        status: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        title: 'Nail Services',
        image: 'https://example.com/categories/nail-services.jpg',
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