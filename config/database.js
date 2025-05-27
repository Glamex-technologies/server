"use strict";
const { Sequelize } = require("sequelize");
const dotenv = require("dotenv");

dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: process.env.DB_DIALECT || "mysql",
    logging: false, // Disable logging; set to true for debugging
  }
);

sequelize.authenticate().then(() => {
    console.log("Database connection established successfully.");
  }).catch((err) => {
    console.error("Unable to connect to the database:", err);
  }
);
module.exports = sequelize;