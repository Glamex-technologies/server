'use strict';
module.exports = (sequelize, DataTypes) => {
  const City = sequelize.define('City', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    country_id: {
      type: DataTypes.INTEGER,
      allowNull: false
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
    tableName: 'cities',
    timestamps: false,
    underscored: true,
  });

  City.associate = function(models) {
    // City belongs to a Country
    City.belongsTo(models.Country, {
      foreignKey: 'country_id',
      as: 'country'
    });

    // Example: City has many Users
    City.hasMany(models.ServiceProvider, {
      foreignKey: 'city_id',
      as: 'serviceProvider'
    });

    City.hasMany(models.User, {
      foreignKey: 'city_id',
      as: 'user'
    });
  };

  return City;
};
