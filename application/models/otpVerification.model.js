"use strict";

const { Op } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const OtpVerification = sequelize.define(
    "OtpVerification",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },

      entity_type: {
        type: DataTypes.ENUM(['user', 'provider', 'admin']),
        allowNull: false,
        validate: {
          isIn: [['user', 'provider', 'admin']],
        },
      },

      entity_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          isInt: true,
          min: 1,
        },
      },

      phone_number: {
        type: DataTypes.STRING(20),
        allowNull: false,
        validate: {
          notEmpty: true,
          len: [1, 20],
        },
      },

      purpose: {
        type: DataTypes.ENUM(['registration', 'login', 'password_reset', 'phone_verification']),
        allowNull: false,
        defaultValue: 'registration',
        validate: {
          isIn: [['registration', 'login', 'password_reset', 'phone_verification']],
        },
      },

      otp_code: {
        type: DataTypes.STRING(4),
        allowNull: false,
        validate: {
          notEmpty: true,
          len: [4, 4],
          isNumeric: true,
        },
      },

      expires_at: {
        type: DataTypes.DATE,
        allowNull: false,
        validate: {
          isDate: true,
          isAfter: new Date().toISOString(),
        },
      },

      attempts: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0,
          max: 10, // Reasonable limit for security
        },
      },

      is_verified: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },

      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "otp_verifications",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        {
          fields: ["phone_number"],
        },
        {
          fields: ["expires_at"],
        },
        {
          fields: ["entity_type", "entity_id"],
        },
        {
          fields: ["phone_number", "entity_type", "purpose"],
        },
        {
          fields: ["entity_type", "entity_id", "is_verified"],
        },
      ],
    }
  );

  // Instance methods
  OtpVerification.prototype.isExpired = function () {
    return new Date() > this.expires_at;
  };

  OtpVerification.prototype.incrementAttempts = function () {
    return this.increment("attempts");
  };

  OtpVerification.prototype.markAsVerified = function () {
    return this.update({ is_verified: true });
  };

  // Class methods
  OtpVerification.generateOtp = function () {
    return "1111"; // Hardcoded for testing
  };

  OtpVerification.getExpirationTime = function (minutes = 5) {
    const now = new Date();
    return new Date(now.getTime() + minutes * 60000);
  };

  // Create OTP for specific entity
  OtpVerification.createForEntity = async function (entityType, entityId, phoneNumber, purpose = 'registration') {
    // Invalidate any existing OTPs for this entity and purpose
    await this.update(
      { is_verified: true }, // Mark as used/expired
      {
        where: {
          entity_type: entityType,
          entity_id: entityId,
          purpose: purpose,
          is_verified: false,
        },
      }
    );

    // Create new OTP
    const otp = this.generateOtp();
    const expiresAt = this.getExpirationTime(5); // 5 minutes

    return await this.create({
      entity_type: entityType,
      entity_id: entityId,
      phone_number: phoneNumber,
      purpose: purpose,
      otp_code: otp,
      expires_at: expiresAt,
    });
  };

  // Find valid OTP for entity
  OtpVerification.findValidForEntity = async function (entityType, entityId, purpose = 'registration') {
    return await this.findOne({
      where: {
        entity_type: entityType,
        entity_id: entityId,
        purpose: purpose,
        is_verified: false,
        expires_at: {
          [Op.gt]: new Date(),
        },
      },
      order: [['created_at', 'DESC']],
    });
  };

  // Verify OTP for entity
  OtpVerification.verifyForEntity = async function (entityType, entityId, otpCode, purpose = 'registration') {
    const otpRecord = await this.findValidForEntity(entityType, entityId, purpose);
    
    if (!otpRecord) {
      return { success: false, message: 'OTP not found or expired' };
    }

    // Increment attempts
    await otpRecord.incrementAttempts();

    // Check if too many attempts
    if (otpRecord.attempts >= 5) {
      await otpRecord.update({ is_verified: true }); // Mark as used
      return { success: false, message: 'Too many failed attempts' };
    }

    // Check OTP code
    if (otpRecord.otp_code !== otpCode) {
      return { success: false, message: 'Invalid OTP' };
    }

    // Mark as verified
    await otpRecord.markAsVerified();
    return { success: true, message: 'OTP verified successfully', otpRecord };
  };

  // Associations
  OtpVerification.associate = function (models) {
    // Define associations here if needed
    // Example: OtpVerification.belongsTo(models.User, { foreignKey: 'phone_number', targetKey: 'phone_number' });
  };

  return OtpVerification;
};