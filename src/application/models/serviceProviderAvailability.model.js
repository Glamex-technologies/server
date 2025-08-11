'use strict';

module.exports = (sequelize, DataTypes) => {
  const ServiceProviderAvailability = sequelize.define('ServiceProviderAvailability', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false
    },
    service_provider_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    day: {
      type: DataTypes.STRING,
      allowNull: true
    },
    from_time: {
      type: DataTypes.TIME,
      allowNull: true
    },
    to_time: {
      type: DataTypes.TIME,
      allowNull: true
    },
    available: {
      type: DataTypes.TINYINT,
      defaultValue: 1
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
    }
  }, {
    tableName: 'service_provider_availability',
    underscored: true,
    timestamps: false
  });

  ServiceProviderAvailability.associate = function(models) {
    ServiceProviderAvailability.belongsTo(models.ServiceProvider, {
      foreignKey: 'service_provider_id',
      as: 'serviceProvider'
    });
  };

  return ServiceProviderAvailability;
};