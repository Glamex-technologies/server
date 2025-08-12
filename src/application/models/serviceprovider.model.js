'use strict';

module.exports = (sequelize, DataTypes) => {
  const ServiceProvider = sequelize.define('ServiceProvider', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    provider_type: {
      type: DataTypes.ENUM('individual', 'salon'),
      allowNull: false,
      defaultValue: 'individual'
    },
    salon_name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    banner_image: {
      type: DataTypes.STRING,
      allowNull: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    location: {
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
    country_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'countries',
        key: 'id'
      }
    },
    city_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'cities',
        key: 'id'
      }
    },
    national_id_image_url: {
      type: DataTypes.STRING,
      allowNull: true
    },

    freelance_certificate_image_url: {
      type: DataTypes.STRING,
      allowNull: true
    },
    commercial_registration_image_url: {
      type: DataTypes.STRING,
      allowNull: true
    },
    overall_rating: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0
    },
    total_reviews: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    total_bookings: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    total_customers: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    is_approved: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 0
    },
    is_available: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1
    },
    step_completed: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    notification: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1
    },
    fcm_token: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    subscription_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    subscription_expiry: {
      type: DataTypes.DATE,
      allowNull: true
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'service_providers',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true,
    deletedAt: 'deleted_at'
  });

  ServiceProvider.associate = function(models) {
    // Association with User
    ServiceProvider.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });

    // Association with Country
    ServiceProvider.belongsTo(models.Country, {
      foreignKey: 'country_id',
      as: 'country'
    });

    // Association with City
    ServiceProvider.belongsTo(models.City, {
      foreignKey: 'city_id',
      as: 'city'
    });

    // Note: subscription_id is now a simple integer field for tracking subscription status

    // Association with BankDetails
    ServiceProvider.hasMany(models.BankDetails, {
      foreignKey: 'service_provider_id',
      as: 'bankDetails'
    });

    // Association with ServiceProviderAvailability
    ServiceProvider.hasMany(models.ServiceProviderAvailability, {
      foreignKey: 'service_provider_id',
      as: 'availability'
    });

    // Association with ServiceList
    ServiceProvider.hasMany(models.ServiceList, {
      foreignKey: 'service_provider_id',
      as: 'services'
    });

    // Association with Gallery
    ServiceProvider.hasMany(models.Gallery, {
      foreignKey: 'service_provider_id',
      as: 'gallery'
    });

    // Note: Booking and Transaction models will be added when they are created
  };

  return ServiceProvider;
};