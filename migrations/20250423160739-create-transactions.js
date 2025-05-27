'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('transactions', {  // Table name in snake_case
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      service_provider_id: {  // snake_case applied
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'service_providers',
          key: 'id'
        },
        onUpdate: 'CASCADE'
      },
      user_id: {  // snake_case applied
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE'
      },
      service_list_id: {  // snake_case applied
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'service_lists',
          key: 'id'
        },
        onUpdate: 'CASCADE'
      },
      transaction_id: {  // snake_case applied
        type: Sequelize.STRING,
        allowNull: false
      },
      status: {
        type: Sequelize.TINYINT,
        allowNull: false,
        defaultValue: 0 // 0 = pending, 1 = success, 2 = failed
      },
      created_at: {  // snake_case applied
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {  // snake_case applied
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('transactions');
  }
};