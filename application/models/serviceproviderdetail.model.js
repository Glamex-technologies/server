'use strict';

module.exports = (sequelize, DataTypes) => {
  const ServiceProviderDetail = sequelize.define('ServiceProviderDetail', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    service_provider_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'ServiceProvider', 
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    national_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    bank_account_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    bank_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    account_number: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    freelance_certificate: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    commertial_certificate: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    is_vat_applicable: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1
    },
    vat_number: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    vat_amount: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
    },
  }, {
    tableName: 'service_provider_details',
    timestamps: true,
    underscored: true 
  });

  ServiceProviderDetail.associate = function(models) {
    ServiceProviderDetail.belongsTo(models.ServiceProvider, {
      foreignKey: 'service_provider_id',
      as: 'serviceProvider'
    });
  };

  return ServiceProviderDetail;
};
