'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('service_lists', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      title: {
        type: Sequelize.STRING,
        allowNull: true
      },
      service_provider_id: {  // snake_case applied
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'service_providers', // fixed model reference
          key: 'id'
        }
      },
      service_id: {  // snake_case applied
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'services',
          key: 'id'
        }
      },
      category_id: {  // snake_case applied
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'categories',
          key: 'id'
        }
      },
      sub_category_id: {  // snake_case applied
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'subcategories',
          key: 'id'
        }
      },
      is_sub_service: {  // snake_case applied
        type: Sequelize.TINYINT,
        allowNull: false,
        defaultValue: 0  // 0 = Not a sub-service, 1 = Sub-service
      },
      have_offers: {  // snake_case applied
        type: Sequelize.TINYINT,
        allowNull: false,
        defaultValue: 0  // 0 = No offers, 1 = Has offers
      },
      status: {
        type: Sequelize.TINYINT,
        allowNull: false,
        defaultValue: 1  // 1 = Active, 0 = Inactive
      },
      service_image: {  // snake_case applied
        type: Sequelize.STRING,
        allowNull: true  // Path to the service image
      },
      service_location: {  // snake_case applied
        type: Sequelize.TINYINT,
        allowNull: false,
        defaultValue: 1  // 1 = Location 1, 2 = Location 2, 3 = Location 3
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {  // snake_case applied
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {  // snake_case applied
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      deleted_at: {  // snake_case applied
        type: Sequelize.DATE,
        allowNull: true  // Soft delete timestamp
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('service_lists');
  }
};