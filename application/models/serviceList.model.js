'use strict';

module.exports = (sequelize, DataTypes) => {
  const ServiceList = sequelize.define('ServiceList', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false
    },
    title: {
      type: DataTypes.STRING,
      allowNull: true
    },
    service_provider_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    service_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    category_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    sub_category_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    is_sub_service: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 0
    },
    have_offers: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 0
    },
    status: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1
    },
    service_image: {
      type: DataTypes.STRING,
      allowNull: true
    },
    service_location: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
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
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'service_lists',
    timestamps: false,
    underscored: true,
    paranoid: true
  });

  ServiceList.associate = function(models) {
    ServiceList.belongsTo(models.ServiceProvider, {
      foreignKey: 'service_provider_id',
      as: 'serviceProvider'
    });

    ServiceList.belongsTo(models.Service, {
      foreignKey: 'service_id',
      as: 'service'
    });

    ServiceList.belongsTo(models.Category, {
      foreignKey: 'category_id',
      as: 'category'
    });

    ServiceList.belongsTo(models.SubCategory, {
      foreignKey: 'sub_category_id',
      as: 'subcategory'
    });
  };

  return ServiceList;
};