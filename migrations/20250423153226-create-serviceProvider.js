'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('service_providers', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      // details needed in registration//
      first_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      last_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      full_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      type: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: "service_provider"
      },
      phone_code: {
        type: Sequelize.STRING,
        allowNull: false
      },
      phone_number: {
        type: Sequelize.STRING,
        allowNull: false
      },
      gender: {
        type: Sequelize.TINYINT,
        allowNull: false,
        defaultValue: 1
      },  
      email: {
        type: Sequelize.STRING,
        allowNull: true
      },
      password: {
        type: Sequelize.STRING,
        allowNull: false
      },
      terms_and_condition: {
        type: Sequelize.TINYINT,
        allowNull: false,
        defaultValue: 0
      },
      verification_otp: {
        // snake_case applied
        type: Sequelize.STRING,
        allowNull: true,
      },
      verification_otp_created_at: {
        // snake_case applied - timestamp when OTP was created for timeout logic
        type: Sequelize.DATE,
        allowNull: true,
      },
      is_verified: {
        type: Sequelize.TINYINT,
        allowNull: false,
        defaultValue: 0, // 0 = not verified, 1 = verified
      },
      verified_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      // details needed in registration//

      step_completed: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      admin_verified: {
        type: Sequelize.TINYINT,
        allowNull: false,
        defaultValue: 0
      },
      provider_type: {
        type: Sequelize.TINYINT,
        allowNull: false,
        defaultValue: 1
      },
      salon_name: {
        type: Sequelize.STRING,
        allowNull: true
      },
      country_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'countries',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      city_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'cities',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      banner_image: {
        type: Sequelize.STRING,
        allowNull: true
      },
      latitude: {
        type: Sequelize.DECIMAL(10, 8),
        allowNull: true
      },
      longitude: {
        type: Sequelize.DECIMAL(11, 8),
        allowNull: true
      },
      location: {
        type: Sequelize.STRING,
        allowNull: true
      },
      status: {
        type: Sequelize.TINYINT,
        allowNull: false,
        defaultValue: 1
      },
      fcm_token: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      notification: {
        type: Sequelize.TINYINT,
        allowNull: false,
        defaultValue: 1
      },
      avg_rating: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      review_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      subscription_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      subscription_expiry: {
        type: Sequelize.DATE,
        allowNull: true
      },
      
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true
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
    await queryInterface.dropTable('service_providers');
  }
};