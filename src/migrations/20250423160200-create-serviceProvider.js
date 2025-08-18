"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("service_providers", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
      },
      provider_type: {
        type: Sequelize.ENUM("individual", "salon"),
        allowNull: false,
        defaultValue: "individual",
      },
      salon_name: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      banner_image: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      national_id_image_url: {
        type: Sequelize.STRING,
        allowNull: true,
      },

      freelance_certificate_image_url: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      commercial_registration_image_url: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      overall_rating: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      total_reviews: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      total_bookings: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      total_customers: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      is_approved: {
        type: Sequelize.TINYINT,
        allowNull: false,
        defaultValue: 0,
      },
      is_available: {
        type: Sequelize.TINYINT,
        allowNull: false,
        defaultValue: 1,
      },
      step_completed: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      notification: {
        type: Sequelize.TINYINT,
        allowNull: false,
        defaultValue: 1,
      },
      fcm_token: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      subscription_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment: "Simple subscription tracking (0=free, 1=paid, etc.)"
      },
      subscription_expiry: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("service_providers");
  },
};
