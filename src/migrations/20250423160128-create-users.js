"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("users", {
      // Table name in snake_case
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },

      // details needed in registration//
      first_name: {
        // snake_case applied
        type: Sequelize.STRING,
        allowNull: false,
      },
      last_name: {
        // snake_case applied
        type: Sequelize.STRING,
        allowNull: false,
      },

      full_name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      user_type: {
        type: Sequelize.ENUM(['user', 'provider']),
        allowNull: false,
        defaultValue: "user",
      },

      phone_code: {
        // snake_case applied
        type: Sequelize.STRING,
        allowNull: false,
      },
      phone_number: {
        // snake_case applied
        type: Sequelize.STRING,
        allowNull: false,
      },
      gender: {
        type: Sequelize.TINYINT,
        allowNull: false,
        defaultValue: 1, // 1 = Male, 2 = Female, 3 = Other
      },
      email: {
        type: Sequelize.STRING,
        allowNull: true,
      },

      password: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      terms_and_condition: {
        // snake_case applied
        type: Sequelize.TINYINT,
        allowNull: false,
        defaultValue: 0, // 0 = not agreed, 1 = agreed
      },

      is_verified: {
        type: Sequelize.TINYINT,
        allowNull: false,
        defaultValue: 0, // 0 = not verified, 1 = verified
      },
      verified_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      // details needed in registration//

      profile_image: {
        // snake_case applied
        type: Sequelize.STRING,
        allowNull: true,
      },
      


      status: {
        type: Sequelize.TINYINT,
        allowNull: false,
        defaultValue: 1, // 1 = Active, 0 = Inactive, 2 = Banned
      },

      notification: {
        type: Sequelize.TINYINT,
        allowNull: false,
        defaultValue: 1, // 1 = Notifications enabled, 0 = Disabled
      },
      fcm_token: {
        // snake_case applied
        type: Sequelize.STRING,
        allowNull: true,
      },
      deleted_at: {
        // snake_case applied
        type: Sequelize.DATE,
        allowNull: true, // Soft delete timestamp
      },
      created_at: {
        // snake_case applied
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        // snake_case applied
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("users");
  },
};
