'use strict';
module.exports = (sequelize, DataTypes) => {
  const SubCategory = sequelize.define('SubCategory', {
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
    service_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    service_id: {
      type: DataTypes.INTEGER,
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
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'subcategories',
    timestamps: true,
    paranoid: true, // Enables soft deletes using deletedAt
    underscored: true
  });

  SubCategory.associate = function(models) {
    SubCategory.belongsTo(models.Service, {
      foreignKey: 'service_id',
      as: 'service'
    });

    SubCategory.belongsTo(models.Category, {
      foreignKey: 'category_id',
      as: 'category'
    });

    // SubCategory.hasMany(models.ServiceList, {
    //   foreignKey: 'subcategoryId',
    //   as: 'serviceLists'
    // });
  };

  return SubCategory;
};
