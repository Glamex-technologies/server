const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const BookingService = sequelize.define('BookingService', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
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
    service_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'services',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    unit_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    total_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    }
  }, {
    tableName: 'booking_services',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  BookingService.associate = function (models) {
    // Booking relationship
    if (models.Booking) {
      BookingService.belongsTo(models.Booking, {
        foreignKey: 'booking_id',
        as: 'booking'
      });
    }

    // Service relationship
    if (models.Service) {
      BookingService.belongsTo(models.Service, {
        foreignKey: 'service_id',
        as: 'service'
      });
    }
  };

  return BookingService;
};
