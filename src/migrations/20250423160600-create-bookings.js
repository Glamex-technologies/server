'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('bookings', {  // Table name in snake_case
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      user_id: {  // snake_case applied
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      user_address_id: {  // snake_case applied
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'user_addresses',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      service_provider_id: {  // snake_case applied
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'service_providers',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      service_list_id: {  // snake_case applied
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'service_lists',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      date: {
        type: Sequelize.DATE,
        allowNull: false
      },
      timing: {
        type: Sequelize.DATE,
        allowNull: false
      },
      promo_code_id: {  // snake_case applied
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'promo_codes', // make sure you have this table
          key: 'id'
        },
        onUpdate: 'SET NULL',
        onDelete: 'SET NULL'
      },
      payment_status: {  // snake_case applied
        type: Sequelize.TINYINT,
        allowNull: false,
        defaultValue: 0  // 0 = Pending, 1 = Paid, 2 = Failed
      },
      status: {
        type: Sequelize.TINYINT,
        allowNull: false,
        defaultValue: 1  // 1 = Pending, 2 = Ongoing, 3 = Completed
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
    await queryInterface.dropTable('bookings');
  }
};