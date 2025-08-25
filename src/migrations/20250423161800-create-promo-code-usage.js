'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('promo_code_usage', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      promo_code_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'promo_codes',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      customer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      booking_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'bookings',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      discount_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      used_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes for better performance
    await queryInterface.addIndex('promo_code_usage', ['promo_code_id']);
    await queryInterface.addIndex('promo_code_usage', ['customer_id']);
    await queryInterface.addIndex('promo_code_usage', ['booking_id']);
    await queryInterface.addIndex('promo_code_usage', ['used_at']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('promo_code_usage');
  }
};
