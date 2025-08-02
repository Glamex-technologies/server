'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    /**
     * Add unique constraint on phone_code and phone_number combination
     * This ensures no duplicate phone numbers can exist in the users table
     */
    await queryInterface.addConstraint('users', {
      fields: ['phone_code', 'phone_number'],
      type: 'unique',
      name: 'unique_phone_number_constraint'
    });
  },

  async down (queryInterface, Sequelize) {
    /**
     * Remove the unique constraint on phone_code and phone_number
     */
    await queryInterface.removeConstraint('users', 'unique_phone_number_constraint');
  }
};
