'use strict';
module.exports = (sequelize, DataTypes) => {
  const ServiceProvider = sequelize.define('ServiceProvider', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false
    },
    // details needed in registration//
    first_name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    last_name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    full_name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "service_provider"
    },
    phone_code: {
      type: DataTypes.STRING,
      allowNull: false
    },
    phone_number: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    terms_and_condition: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 0
    },
    verification_otp: {
      type: DataTypes.STRING,
      allowNull: true
    },
    verification_otp_created_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    is_verified: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 0
    },
    verified_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    // details needed in registration//

    admin_verified: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 0
    },
    provider_type: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1
    },
    step_completed: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    salon_name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    country_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    city_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    banner_image: {
      type: DataTypes.STRING,
      allowNull: true
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true
    },
    location: {
      type: DataTypes.STRING,
      allowNull: true
    },
    status: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1
    },
    fcm_token: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    notification: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1
    },
    avg_rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    review_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    subscription_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    subscription_expiry: {
      type: DataTypes.DATE,
      allowNull: true
    },
    gender: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1
    },
    deleted_at: {
      type: DataTypes.DATE,
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
    }
  }, {
    tableName: 'service_providers',
    timestamps: true,
    paranoid: true,   // for soft deletes using `deleted_at`
    underscored: true // because your columns are like `created_at`, `updated_at`
  });

  ServiceProvider.associate = function(models) {
    ServiceProvider.belongsTo(models.Country, {
      foreignKey: 'country_id',
      as: 'country'
    });

    ServiceProvider.belongsTo(models.City, {
      foreignKey: 'city_id',
      as: 'city'
    });

    ServiceProvider.hasOne(models.ServiceProviderDetail, {
      foreignKey: 'service_provider_id',
      as: 'serviceProviderDetail'
    });

    ServiceProvider.hasMany(models.ServiceProviderAvailability, {
      foreignKey: 'service_provider_id',
      as: 'serviceProviderAvailability'
    });
  };

  return ServiceProvider;
};