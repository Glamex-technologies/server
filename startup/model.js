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
const ServiceProviderDetail = require("../application/models/serviceproviderdetail.model");
const ServiceProviderAvailability = require("../application/models/serviceProviderAvailability.model");
const User = require("../application/models/user.model");
const ServiceList = require("../application/models/serviceList.model");
const Gallery = require("../application/models/gallery.model");

const models = {
  Token: Token(sequelize, Sequelize.DataTypes),
  Country: Country(sequelize, Sequelize.DataTypes),
  City: City(sequelize, Sequelize.DataTypes),
  Role: Role(sequelize, Sequelize.DataTypes),  
  Admin: Admin(sequelize, Sequelize.DataTypes),
  Service: Service(sequelize, Sequelize.DataTypes),
  Category: Category(sequelize, Sequelize.DataTypes),
  SubCategory: SubCategory(sequelize, Sequelize.DataTypes),
  ServiceProvider: ServiceProvider(sequelize, Sequelize.DataTypes),
  ServiceProviderDetail: ServiceProviderDetail(sequelize, Sequelize.DataTypes),
  ServiceProviderAvailability : ServiceProviderAvailability(sequelize, Sequelize.DataTypes),
  User: User(sequelize, Sequelize.DataTypes),
  ServiceList: ServiceList(sequelize, Sequelize.DataTypes),
  Gallery: Gallery(sequelize, Sequelize.DataTypes),
};

Object.values(models)
  .filter((model) => typeof model.associate === "function")
  .forEach((model) => model.associate(models));

const db = {
  models,
  sequelize,
};

module.exports = db;