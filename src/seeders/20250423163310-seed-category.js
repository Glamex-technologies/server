'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('categories', [{
      title: 'Trim',
      service_id: 1,  // snake_case applied
      status: 1,
      created_at: new Date(),  // snake_case applied
      updated_at: new Date()   // snake_case applied
    }], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('categories', { title: 'Trim' }, {});
  }
};