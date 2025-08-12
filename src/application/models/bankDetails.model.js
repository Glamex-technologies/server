module.exports = (sequelize, DataTypes) => {
  const BankDetails = sequelize.define('BankDetails', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
    allowNull: false,
  },

  service_provider_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'service_providers',
      key: 'id'
    }
  },
  account_holder_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  bank_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  iban: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
}, {
  tableName: 'bank_details',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

  return BankDetails;
};