'use strict';
module.exports = (sequelize, DataTypes) => {
  const Service = sequelize.define('Service', {
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
    image: {
      type: DataTypes.STRING,
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
    tableName: 'services',
    timestamps: false,
    underscored: true,
    paranoid: true,
  });

  Service.associate = function(models) {
    // Example: Service has many ServiceLists
    Service.hasMany(models.Category, {
      foreignKey: 'service_id',
      as: 'categories'
    });

    Service.hasMany(models.SubCategory, {
      foreignKey: 'service_id',
      as: 'subcategories'
    });


    // Service.hasMany(models.ServiceList, {
    //   foreignKey: 'service_id',
    //   as: 'serviceLists'
    // });
  };

  return Service;
};
