"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("otp_verifications", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },

      entity_type: {
        type: Sequelize.ENUM(['user', 'provider', 'admin']),
        allowNull: false,
        comment: 'Which entity type this OTP is for',
      },

      entity_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'ID of the user/provider/admin',
      },

      phone_number: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },

      purpose: {
        type: Sequelize.ENUM(['registration', 'login', 'password_reset', 'phone_verification']),
        allowNull: false,
        defaultValue: 'registration',
        comment: 'Purpose of this OTP',
      },

      otp_code: {
        type: Sequelize.STRING(4),
        allowNull: false,
      },

      expires_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },

      attempts: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      is_verified: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },

      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Add indexes for better performance
    await queryInterface.addIndex("otp_verifications", ["phone_number"]);
    await queryInterface.addIndex("otp_verifications", ["expires_at"]);
    await queryInterface.addIndex("otp_verifications", ["entity_type", "entity_id"]);
    await queryInterface.addIndex("otp_verifications", ["phone_number", "entity_type", "purpose"]);
    await queryInterface.addIndex("otp_verifications", ["entity_type", "entity_id", "is_verified"]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("otp_verifications");
  },
};