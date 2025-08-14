'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Remove the service_id column from subcategories table
    await queryInterface.removeColumn('subcategories', 'service_id');
  },

  down: async (queryInterface, Sequelize) => {
    // Add back the service_id column if we need to rollback
    await queryInterface.addColumn('subcategories', 'service_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'services',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });
  }
};
