const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PromoCode = sequelize.define('PromoCode', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
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
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        len: [3, 50],
        is: /^[A-Z0-9]+$/i // Alphanumeric only
      }
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        len: [3, 100]
      }
    },
    template_image_url: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    discount_type: {
      type: DataTypes.ENUM('percentage', 'fixed'),
      allowNull: false
    },
    discount_value: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    minimum_bill_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    max_usage_count: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1
      }
    },
    current_usage_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    valid_from: {
      type: DataTypes.DATE,
      allowNull: false
    },
    valid_until: {
      type: DataTypes.DATE,
      allowNull: false
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'promo_codes',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true,
    deletedAt: 'deleted_at',
    indexes: [
      {
        fields: ['code']
      },
      {
        fields: ['provider_id']
      },
      {
        fields: ['is_active', 'valid_until']
      }
    ]
  });

  PromoCode.associate = function (models) {
    // Provider relationship
    if (models.ServiceProvider) {
      PromoCode.belongsTo(models.ServiceProvider, {
        foreignKey: 'provider_id',
        as: 'provider'
      });
    }

    // Bookings relationship
    if (models.Booking) {
      PromoCode.hasMany(models.Booking, {
        foreignKey: 'promo_code_id',
        as: 'bookings'
      });
    }

    // Promo code usage relationship
    if (models.PromoCodeUsage) {
      PromoCode.hasMany(models.PromoCodeUsage, {
        foreignKey: 'promo_code_id',
        as: 'usageRecords'
      });
    }
  };

  // Instance methods
  PromoCode.prototype.isValid = function() {
    const now = new Date();
    return this.is_active && 
           now >= this.valid_from && 
           now <= this.valid_until &&
           (!this.max_usage_count || this.current_usage_count < this.max_usage_count);
  };

  PromoCode.prototype.calculateDiscount = function(subtotal) {
    if (subtotal < this.minimum_bill_amount) {
      return 0;
    }

    if (this.discount_type === 'percentage') {
      return (subtotal * this.discount_value) / 100;
    } else {
      return Math.min(this.discount_value, subtotal);
    }
  };

  PromoCode.prototype.canBeUsed = function(subtotal) {
    return this.isValid() && subtotal >= this.minimum_bill_amount;
  };

  return PromoCode;
};
