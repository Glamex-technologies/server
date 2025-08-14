'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('subcategories', [
      {
        title: 'Hair Cut',
        image: 'https://example.com/subcategories/hair-cut.jpg',
        category_id: 1,  // Hair Services
        status: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        title: 'Hair Styling',
        image: 'https://example.com/subcategories/hair-styling.jpg',
        category_id: 1,  // Hair Services
        status: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        title: 'Hair Coloring',
        image: 'https://example.com/subcategories/hair-coloring.jpg',
        category_id: 1,  // Hair Services
        status: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        title: 'Facial',
        image: 'https://example.com/subcategories/facial.jpg',
        category_id: 2,  // Beauty Services
        status: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        title: 'Manicure',
        image: 'https://example.com/subcategories/manicure.jpg',
        category_id: 3,  // Nail Services
        status: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        title: 'Pedicure',
        image: 'https://example.com/subcategories/pedicure.jpg',
        category_id: 3,  // Nail Services
        status: 1,
        created_at: new Date(),
        updated_at: new Date()
      }
    ], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('subcategories', null, {});
  }
};