'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Remove the service_id column from service_lists table
    await queryInterface.removeColumn('service_lists', 'service_id');
  },

  down: async (queryInterface, Sequelize) => {
    // Add back the service_id column if we need to rollback
    await queryInterface.addColumn('service_lists', 'service_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'services',
        key: 'id'
      }
    });
  }
};
