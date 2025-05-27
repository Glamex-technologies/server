'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('services', [{
      title: 'Haircut',
      status: 1,
      created_at: new Date(),  // snake_case applied
      updated_at: new Date()   // snake_case applied
    }], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('services', { title: 'Haircut' }, {});
  }
};