'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('bookings', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      booking_number: {
        type: Sequelize.STRING(20),
        allowNull: false,
        unique: true
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
      provider_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'service_providers',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      booking_type: {
        type: Sequelize.ENUM('regular', 'gift', 'offer'),
        allowNull: false,
        defaultValue: 'regular'
      },
      gift_id: {
        type: Sequelize.INTEGER,
        allowNull: true
        // references: {
        //   model: 'gifts',
        //   key: 'id'
        // }
      },
      offer_id: {
        type: Sequelize.INTEGER,
        allowNull: true
        // references: {
        //   model: 'offers',
        //   key: 'id'
        // }
      },
      scheduled_date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      scheduled_time: {
        type: Sequelize.TIME,
        allowNull: false
      },
      total_duration_minutes: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      service_location_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'service_locations',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      customer_address_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'user_addresses',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      status: {
        type: Sequelize.ENUM('pending', 'accepted', 'on_the_way', 'completed', 'cancelled', 'rejected'),
        allowNull: false,
        defaultValue: 'pending'
      },
      subtotal: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      discount_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      },
      total_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      commission_rate: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 15.0
      },
      commission_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      },
      provider_earnings: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      promo_code_id: {
        type: Sequelize.INTEGER,
        allowNull: true
        // references: {
        //   model: 'promo_codes',
        //   key: 'id'
        // }
      },
      payment_status: {
        type: Sequelize.ENUM('pending', 'paid', 'failed', 'refunded'),
        allowNull: false,
        defaultValue: 'pending'
      },
      payment_intent_id: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      cancelled_by: {
        type: Sequelize.ENUM('customer', 'provider', 'system'),
        allowNull: true
      },
      cancellation_reason: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      provider_current_lat: {
        type: Sequelize.DECIMAL(10, 8),
        allowNull: true
      },
      provider_current_lng: {
        type: Sequelize.DECIMAL(11, 8),
        allowNull: true
      },
      estimated_arrival: {
        type: Sequelize.DATE,
        allowNull: true
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE
      },
      deleted_at: {
        type: Sequelize.DATE
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('bookings');
  }
};