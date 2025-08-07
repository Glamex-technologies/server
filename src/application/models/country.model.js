'use strict';
module.exports = (sequelize, DataTypes) => {
  const Country = sequelize.define('Country', {
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
    code: {
      type: DataTypes.STRING,
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
    tableName: 'countries',
    underscored: true,
    timestamps: false
  });

  Country.associate = function(models) {
    // Example association if you have cities or users referencing countries
    Country.hasMany(models.City, {
      foreignKey: 'country_id',
      as: 'city'
    });

    Country.hasMany(models.ServiceProvider, {
      foreignKey: 'country_id',
      as: 'serviceProvider'
    });
    
    Country.hasMany(models.User, {
      foreignKey: 'country_id',
      as: 'user'
    });
  };

  return Country;
};
