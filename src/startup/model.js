'use strict';
const sequelize = require("../config/database");
const Sequelize = require("sequelize");

const Token = require("../application/models/token.model");
const Country = require("../application/models/country.model");
const City = require("../application/models/city.model");
const Role = require("../application/models/roles.model");
const Admin = require("../application/models/admin.model");
const Service = require("../application/models/service.model");
const Category = require("../application/models/category.model");
const SubCategory = require("../application/models/subcategory.model");
const ServiceProvider = require("../application/models/serviceprovider.model");
const ServiceProviderAvailability = require("../application/models/serviceProviderAvailability.model");
const User = require("../application/models/user.model");
const ServiceList = require("../application/models/serviceList.model");
const Gallery = require("../application/models/gallery.model");
const OtpVerification = require("../application/models/otpVerification.model");
const BankDetails = require("../application/models/bankDetails.model");
const BannerImage = require("../application/models/bannerImage.model");
const ServiceImage = require("../application/models/serviceImage.model");
const ServiceLocation = require("../application/models/serviceLocation.model");
const UserAddress = require("../application/models/userAddress.model");
const ServiceProviderAddress = require("../application/models/serviceProviderAddress.model");
const Booking = require("../application/models/booking.model");
const BookingService = require("../application/models/bookingService.model");
const PromoCode = require("../application/models/promoCode.model");
const PromoCodeUsage = require("../application/models/promoCodeUsage.model");

const models = {
  Token: Token(sequelize, Sequelize.DataTypes),
  Country: Country(sequelize, Sequelize.DataTypes),
  City: City(sequelize, Sequelize.DataTypes),
  Role: Role(sequelize, Sequelize.DataTypes),  
  Admin: Admin(sequelize, Sequelize.DataTypes),
  Service: Service(sequelize, Sequelize.DataTypes),
  Category: Category(sequelize, Sequelize.DataTypes),
  subcategory: SubCategory(sequelize, Sequelize.DataTypes),
  ServiceProvider: ServiceProvider(sequelize, Sequelize.DataTypes),
  ServiceProviderAvailability : ServiceProviderAvailability(sequelize, Sequelize.DataTypes),
  User: User(sequelize, Sequelize.DataTypes),
  ServiceList: ServiceList(sequelize, Sequelize.DataTypes),
  Gallery: Gallery(sequelize, Sequelize.DataTypes),
  OtpVerification: OtpVerification(sequelize, Sequelize.DataTypes),
  BankDetails: BankDetails(sequelize, Sequelize.DataTypes),
  BannerImage: BannerImage(sequelize, Sequelize.DataTypes),
  ServiceImage: ServiceImage(sequelize, Sequelize.DataTypes),
  ServiceLocation: ServiceLocation(sequelize, Sequelize.DataTypes),
  UserAddress: UserAddress(sequelize, Sequelize.DataTypes),
  ServiceProviderAddress: ServiceProviderAddress(sequelize, Sequelize.DataTypes),
  Booking: Booking(sequelize, Sequelize.DataTypes),
  BookingService: BookingService(sequelize, Sequelize.DataTypes),
  PromoCode: PromoCode(sequelize, Sequelize.DataTypes),
  PromoCodeUsage: PromoCodeUsage(sequelize, Sequelize.DataTypes),
};

Object.values(models)
  .filter((model) => typeof model.associate === "function")
  .forEach((model) => model.associate(models));

const db = {
  models,
  sequelize,
};

module.exports = db;