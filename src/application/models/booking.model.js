const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Booking = sequelize.define('Booking', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    booking_number: {
      type: DataTypes.STRING(20),
      unique: true,
      allowNull: false
    },
    customer_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    provider_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'service_providers',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    booking_type: {
      type: DataTypes.ENUM('regular', 'gift', 'offer'),
      allowNull: false,
      defaultValue: 'regular'
    },
    gift_id: {
      type: DataTypes.INTEGER,
      allowNull: true
      // references: {
      //   model: 'gifts',
      //   key: 'id'
      // }
    },
    offer_id: {
      type: DataTypes.INTEGER,
      allowNull: true
      // references: {
      //   model: 'offers',
      //   key: 'id'
      // }
    },
    scheduled_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    scheduled_time: {
      type: DataTypes.TIME,
      allowNull: false
    },
    total_duration_minutes: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    service_location_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'service_locations',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    customer_address_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'user_addresses',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    status: {
      type: DataTypes.ENUM('pending', 'accepted', 'on_the_way', 'completed', 'cancelled', 'rejected'),
      allowNull: false,
      defaultValue: 'pending'
    },
    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    discount_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    total_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    commission_rate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 15.0
    },
    commission_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    provider_earnings: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    promo_code_id: {
      type: DataTypes.INTEGER,
      allowNull: true
      // references: {
      //   model: 'promo_codes',
      //   key: 'id'
      // }
    },
    payment_status: {
      type: DataTypes.ENUM('pending', 'paid', 'failed', 'refunded'),
      allowNull: false,
      defaultValue: 'pending'
    },
    payment_intent_id: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    cancelled_by: {
      type: DataTypes.ENUM('customer', 'provider', 'system'),
      allowNull: true
    },
    cancellation_reason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    provider_current_lat: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true
    },
    provider_current_lng: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true
    },
    estimated_arrival: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'bookings',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true,
    deletedAt: 'deleted_at'
  });

  Booking.associate = function (models) {
    // Customer relationship
    if (models.User) {
      Booking.belongsTo(models.User, {
        foreignKey: 'customer_id',
        as: 'customer'
      });
    }

    // Provider relationship
    if (models.ServiceProvider) {
      Booking.belongsTo(models.ServiceProvider, {
        foreignKey: 'provider_id',
        as: 'provider'
      });
    }

    // Service location relationship
    if (models.ServiceLocation) {
      Booking.belongsTo(models.ServiceLocation, {
        foreignKey: 'service_location_id',
        as: 'serviceLocation'
      });
    }

    // Customer address relationship
    if (models.UserAddress) {
      Booking.belongsTo(models.UserAddress, {
        foreignKey: 'customer_address_id',
        as: 'customerAddress'
      });
    }

    // Promo code relationship
    if (models.PromoCode) {
      Booking.belongsTo(models.PromoCode, {
        foreignKey: 'promo_code_id',
        as: 'promoCode'
      });
    }

    // Booking services relationship
    if (models.BookingService) {
      Booking.hasMany(models.BookingService, {
        foreignKey: 'booking_id',
        as: 'bookingServices'
      });
    }
  };

  return Booking;
};
