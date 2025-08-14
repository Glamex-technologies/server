'use strict';

module.exports = (sequelize, DataTypes) => {
  const ServiceLocation = sequelize.define('ServiceLocation', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'service_locations',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  ServiceLocation.associate = function(models) {
    // Define associations here if needed
    ServiceLocation.hasMany(models.ServiceList, { foreignKey: 'service_location', as: 'services' });
  };

  return ServiceLocation;
};
