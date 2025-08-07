'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.bulkInsert('cities', [{
      name: 'Riyadh',
      country_id: 1,  // snake_case applied
      created_at: new Date(),  // snake_case applied
      updated_at: new Date()  // snake_case applied
    }], {});
  },

  async down(queryInterface, Sequelize) {
    return queryInterface.bulkDelete('cities', { name: 'Riyadh' }, {});
  }
};