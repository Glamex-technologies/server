const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PromoCodeUsage = sequelize.define('PromoCodeUsage', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    promo_code_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'promo_codes',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
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
    booking_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'bookings',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    discount_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    used_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'promo_code_usage',
    timestamps: false, // We only have used_at timestamp
    indexes: [
      {
        fields: ['promo_code_id']
      },
      {
        fields: ['customer_id']
      },
      {
        fields: ['booking_id']
      },
      {
        fields: ['used_at']
      }
    ]
  });

  PromoCodeUsage.associate = function (models) {
    // Promo code relationship
    if (models.PromoCode) {
      PromoCodeUsage.belongsTo(models.PromoCode, {
        foreignKey: 'promo_code_id',
        as: 'promoCode'
      });
    }

    // Customer relationship
    if (models.User) {
      PromoCodeUsage.belongsTo(models.User, {
        foreignKey: 'customer_id',
        as: 'customer'
      });
    }

    // Booking relationship
    if (models.Booking) {
      PromoCodeUsage.belongsTo(models.Booking, {
        foreignKey: 'booking_id',
        as: 'booking'
      });
    }
  };

  return PromoCodeUsage;
};
