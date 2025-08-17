'use strict';
const bcrypt = require('bcryptjs');

module.exports = {
  async up(queryInterface, Sequelize) {
    const password = await bcrypt.hash('Test@123', 10);

    return queryInterface.bulkInsert('admins', [{
      first_name: 'Glamx',  // snake_case applied
      last_name: 'admin',  // snake_case applied
      full_name: 'Glamx admin',  // snake_case applied
      email: 'glam@yopmail.com',
      password: password,
      role: 1,
      status: 1,
      created_at: new Date(),  // snake_case applied
      updated_at: new Date()  // snake_case applied
    }], {});
  },

  async down(queryInterface, Sequelize) {
    return queryInterface.bulkDelete('admins', { email: 'glam@yopmail.com' }, {});
  }
};