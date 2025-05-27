'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('service_provider_availability', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      service_provider_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'service_providers', // fixed model reference
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      day: {
        type: Sequelize.STRING,
        allowNull: true
      },
      from_time: {
        type: Sequelize.TIME,
        allowNull: true
      },
      to_time: {
        type: Sequelize.TIME,
        allowNull: true
      },
      available: { // fixed typo: "avilable" -> "available"
        type: Sequelize.TINYINT,
        defaultValue: 1
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('service_provider_availability');
  }
};