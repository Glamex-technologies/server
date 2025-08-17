'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('subcategories', [
      {
        title: 'Bob Cut',
        service_id: 1, // Haircut service
        category_id: 1, // Classic Haircut
        image: 'https://example.com/subcategories/bob-cut.jpg',
        status: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        title: 'Trimming',
        service_id: 1, // Haircut service
        category_id: 1, // Classic Haircut
        image: 'https://example.com/subcategories/trimming.jpg',
        status: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        title: 'Layered Cut',
        service_id: 1, // Haircut service
        category_id: 2, // Modern Haircut
        image: 'https://example.com/subcategories/layered-cut.jpg',
        status: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        title: 'Undercut',
        service_id: 1, // Haircut service
        category_id: 2, // Modern Haircut
        image: 'https://example.com/subcategories/undercut.jpg',
        status: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        title: 'Kids Bob Cut',
        service_id: 1, // Haircut service
        category_id: 3, // Kids Haircut
        image: 'https://example.com/subcategories/kids-bob-cut.jpg',
        status: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        title: 'Kids Trimming',
        service_id: 1, // Haircut service
        category_id: 3, // Kids Haircut
        image: 'https://example.com/subcategories/kids-trimming.jpg',
        status: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        title: 'Partial Highlights',
        service_id: 2, // Hair Coloring service
        category_id: 4, // Highlights
        image: 'https://example.com/subcategories/partial-highlights.jpg',
        status: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        title: 'Full Highlights',
        service_id: 2, // Hair Coloring service
        category_id: 4, // Highlights
        image: 'https://example.com/subcategories/full-highlights.jpg',
        status: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        title: 'Single Process Color',
        service_id: 2, // Hair Coloring service
        category_id: 5, // Full Color
        image: 'https://example.com/subcategories/single-process-color.jpg',
        status: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        title: 'Double Process Color',
        service_id: 2, // Hair Coloring service
        category_id: 5, // Full Color
        image: 'https://example.com/subcategories/double-process-color.jpg',
        status: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        title: 'Traditional Balayage',
        service_id: 2, // Hair Coloring service
        category_id: 6, // Balayage
        image: 'https://example.com/subcategories/traditional-balayage.jpg',
        status: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        title: 'Foil Balayage',
        service_id: 2, // Hair Coloring service
        category_id: 6, // Balayage
        image: 'https://example.com/subcategories/foil-balayage.jpg',
        status: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        title: 'Basic Facial',
        service_id: 3, // Facial service
        category_id: 7, // Classic Facial
        image: 'https://example.com/subcategories/basic-facial.jpg',
        status: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        title: 'Deep Cleansing Facial',
        service_id: 3, // Facial service
        category_id: 7, // Classic Facial
        image: 'https://example.com/subcategories/deep-cleansing-facial.jpg',
        status: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        title: 'Collagen Facial',
        service_id: 3, // Facial service
        category_id: 8, // Anti-Aging Facial
        image: 'https://example.com/subcategories/collagen-facial.jpg',
        status: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        title: 'Vitamin C Facial',
        service_id: 3, // Facial service
        category_id: 8, // Anti-Aging Facial
        image: 'https://example.com/subcategories/vitamin-c-facial.jpg',
        status: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        title: 'Full Body Deep Tissue',
        service_id: 4, // Massage service
        category_id: 9, // Deep Tissue Massage
        image: 'https://example.com/subcategories/full-body-deep-tissue.jpg',
        status: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        title: 'Back & Shoulders Deep Tissue',
        service_id: 4, // Massage service
        category_id: 9, // Deep Tissue Massage
        image: 'https://example.com/subcategories/back-shoulders-deep-tissue.jpg',
        status: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        title: 'Full Body Swedish',
        service_id: 4, // Massage service
        category_id: 10, // Swedish Massage
        image: 'https://example.com/subcategories/full-body-swedish.jpg',
        status: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        title: 'Relaxation Swedish',
        service_id: 4, // Massage service
        category_id: 10, // Swedish Massage
        image: 'https://example.com/subcategories/relaxation-swedish.jpg',
        status: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        title: 'Classic Manicure',
        service_id: 5, // Nail Services
        category_id: 11, // Manicure
        image: 'https://example.com/subcategories/classic-manicure.jpg',
        status: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        title: 'Gel Manicure',
        service_id: 5, // Nail Services
        category_id: 11, // Manicure
        image: 'https://example.com/subcategories/gel-manicure.jpg',
        status: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        title: 'Classic Pedicure',
        service_id: 5, // Nail Services
        category_id: 12, // Pedicure
        image: 'https://example.com/subcategories/classic-pedicure.jpg',
        status: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        title: 'Spa Pedicure',
        service_id: 5, // Nail Services
        category_id: 12, // Pedicure
        image: 'https://example.com/subcategories/spa-pedicure.jpg',
        status: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        title: 'Bridal Updo',
        service_id: 6, // Hair Styling service
        category_id: 13, // Bridal Styling
        image: 'https://example.com/subcategories/bridal-updo.jpg',
        status: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        title: 'Bridal Curls',
        service_id: 6, // Hair Styling service
        category_id: 13, // Bridal Styling
        image: 'https://example.com/subcategories/bridal-curls.jpg',
        status: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        title: 'Party Updo',
        service_id: 6, // Hair Styling service
        category_id: 14, // Party Styling
        image: 'https://example.com/subcategories/party-updo.jpg',
        status: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        title: 'Party Curls',
        service_id: 6, // Hair Styling service
        category_id: 14, // Party Styling
        image: 'https://example.com/subcategories/party-curls.jpg',
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