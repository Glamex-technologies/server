'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const bannerImages = [
      {
        title: 'Elegant Salon Banner',
        image_url: 'https://example-bucket.s3.amazonaws.com/banners/elegant-salon-banner.jpg',
        thumbnail_url: 'https://example-bucket.s3.amazonaws.com/banners/thumbnails/elegant-salon-banner-thumb.jpg',
        category: 'salon',
        is_active: 1,
        sort_order: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        title: 'Modern Beauty Spa',
        image_url: 'https://example-bucket.s3.amazonaws.com/banners/modern-beauty-spa.jpg',
        thumbnail_url: 'https://example-bucket.s3.amazonaws.com/banners/thumbnails/modern-beauty-spa-thumb.jpg',
        category: 'spa',
        is_active: 1,
        sort_order: 2,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        title: 'Luxury Hair Salon',
        image_url: 'https://example-bucket.s3.amazonaws.com/banners/luxury-hair-salon.jpg',
        thumbnail_url: 'https://example-bucket.s3.amazonaws.com/banners/thumbnails/luxury-hair-salon-thumb.jpg',
        category: 'salon',
        is_active: 1,
        sort_order: 3,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        title: 'Professional Nail Studio',
        image_url: 'https://example-bucket.s3.amazonaws.com/banners/professional-nail-studio.jpg',
        thumbnail_url: 'https://example-bucket.s3.amazonaws.com/banners/thumbnails/professional-nail-studio-thumb.jpg',
        category: 'nail',
        is_active: 1,
        sort_order: 4,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        title: 'Wellness Center',
        image_url: 'https://example-bucket.s3.amazonaws.com/banners/wellness-center.jpg',
        thumbnail_url: 'https://example-bucket.s3.amazonaws.com/banners/thumbnails/wellness-center-thumb.jpg',
        category: 'wellness',
        is_active: 1,
        sort_order: 5,
        created_at: new Date(),
        updated_at: new Date()
      }
    ];

    await queryInterface.bulkInsert('banner_images', bannerImages, {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('banner_images', null, {});
  }
};
