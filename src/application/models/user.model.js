"use strict";
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    "User",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      // details needed in registration//
      first_name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      last_name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      full_name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      user_type: {
        type: DataTypes.ENUM(['user', 'provider']),
        allowNull: false,
        defaultValue: "user",
      },
      
      phone_code: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      phone_number: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      gender: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 1,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      terms_and_condition: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 0,
      },

      is_verified: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 0, // 0 = not verified, 1 = verified
      },
      verified_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      // details needed in registration//
      profile_image: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      status: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 1,
      },

      notification: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 1,
      },
      fcm_token: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
      },
    },
    {
      tableName: "users",
      timestamps: true,
      paranoid: true, // For soft deletes using `deleted_at`
      underscored: true, // Maps camelCase fields to snake_case columns
      defaultScope: {
        attributes: { 
          exclude: ['country_id', 'city_id', 'latitude', 'longitude', 'location'] 
        }
      },
      indexes: [
        {
          unique: true,
          fields: ['phone_code', 'phone_number'],
          name: 'unique_phone_number_constraint'
        }
      ]
    }
  );

  User.associate = function (models) {
    User.hasOne(models.ServiceProvider, {
      foreignKey: "user_id",
      as: "serviceProvider",
    });

    User.hasMany(models.UserAddress, {
      foreignKey: "user_id",
      as: "addresses",
    });

    User.hasMany(models.ServiceProviderAddress, {
      foreignKey: "user_id",
      as: "providerAddresses",
    });
  };

  return User;
};
