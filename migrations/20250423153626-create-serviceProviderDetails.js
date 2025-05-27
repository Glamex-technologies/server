'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('service_provider_details', {
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
          model: 'service_providers', // snake_case reference
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      national_id: {
        type: Sequelize.STRING,
        allowNull: true
      },
      bank_account_name: {
        type: Sequelize.STRING,
        allowNull: true
      },
      bank_name: {
        type: Sequelize.STRING,
        allowNull: true
      },
      account_number: {
        type: Sequelize.STRING,
        allowNull: true
      },
      freelance_certificate: {
        type: Sequelize.STRING,
        allowNull: true
      },
      commertial_certificate: {
        type: Sequelize.STRING,
        allowNull: true
      },
      is_vat_applicable: {
        type: Sequelize.TINYINT,
        allowNull: false,
        defaultValue: 1
      },
      vat_number: {
        type: Sequelize.STRING,
        allowNull: false
      },
      vat_amount: {
        type: Sequelize.FLOAT,
        allowNull: false
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
    await queryInterface.dropTable('service_provider_details');
  }
};