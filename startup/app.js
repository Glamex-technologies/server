const express = require("express");
const path = require('path');
const cors = require("cors");
// const sequelize = require("../config/database");
const models = require("./model");
const routes = require("./router");

const app = express();

// CORS configuration
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: '*'
}));

// Body parsers
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));

// Static folder
app.use(express.static("public"));

// Mount your API routes here
app.use("/api/v1", routes);
// Mount storage folder for images
app.use('/storage/images', express.static(path.join(path.join(__dirname, '..'), 'storage/images')));

// Default route (optional)
app.get("/", (req, res) => {
  console.log("I am Galmex........");
  return res.status(200).json({
    message: "I am Galmex........",
  });
});

module.exports = app;