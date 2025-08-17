'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('service_locations', [
      {
        title: 'At Salon',
        description: 'Service provided at the salon location',
        status: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        title: 'At Artist Location',
        description: 'Service provided at artist\'s location',
        status: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        title: 'At Customer Location',
        description: 'Service provided at customer\'s location',
        status: 1,
        created_at: new Date(),
        updated_at: new Date()
      }
    ], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('service_locations', null, {});
  }
};
