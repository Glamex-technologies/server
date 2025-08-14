'use strict';
module.exports = (sequelize, DataTypes) => {
  const Category = sequelize.define('Category', {
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

    status: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1
    },
    image: {
      type: DataTypes.STRING,
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
    tableName: 'categories',
    timestamps: true,
    underscored: true,
    paranoid: true,
  });

  Category.associate = function(models) {
    // Categories have many subcategories
    Category.hasMany(models.SubCategory, {
      foreignKey: 'category_id',
      as: 'subcategories'
    });

    // Categories have many service lists
    Category.hasMany(models.ServiceList, {
      foreignKey: 'category_id',
      as: 'serviceLists'
    });
  };

  return Category;
};
