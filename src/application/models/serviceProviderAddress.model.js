"use strict";

module.exports = (sequelize, DataTypes) => {
  const ServiceProviderAddress = sequelize.define(
    "ServiceProviderAddress",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      address: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Full address provided by provider"
      },
      latitude: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: true,
      },
      longitude: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true,
      },
      country_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'countries',
          key: 'id'
        },
        onUpdate: 'SET NULL',
        onDelete: 'SET NULL'
      },
      city_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'cities',
          key: 'id'
        },
        onUpdate: 'SET NULL',
        onDelete: 'SET NULL'
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
      tableName: "service_provider_addresses",
      timestamps: true,
      underscored: true,
    }
  );

  ServiceProviderAddress.associate = function (models) {
    ServiceProviderAddress.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "user",
    });

    ServiceProviderAddress.belongsTo(models.Country, {
      foreignKey: "country_id",
      as: "country",
    });

    ServiceProviderAddress.belongsTo(models.City, {
      foreignKey: "city_id",
      as: "city",
    });
  };

  return ServiceProviderAddress;
};
