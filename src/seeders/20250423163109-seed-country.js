'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.bulkInsert('countries', [{
      name: 'UAE',
      status: 1,
      code: 'AE',
      created_at: new Date(),  // snake_case applied
      updated_at: new Date()  // snake_case applied
    }], {});
  },

  async down(queryInterface, Sequelize) {
    return queryInterface.bulkDelete('countries', { name: 'UAE' }, {});
  }
};