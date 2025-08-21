'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('service_providers', 'rejection_reason', {
      type: Sequelize.TEXT,
      allowNull: true,
      after: 'is_approved'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('service_providers', 'rejection_reason');
  }
};
