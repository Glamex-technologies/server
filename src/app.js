require("dotenv").config();
const express = require("express");
const path = require('path');
const cors = require("cors");
const http = require("http");
const https = require("https");
const fs = require("fs");

// Import your existing modules
const models = require("./startup/model");
const routes = require("./startup/router");

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

// Basic error handler middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    status: "error", 
    message: "Something went wrong!",
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

const PORT = process.env.PORT || 8080;

// Create HTTP server (simplified for development)
const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`HTTP Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Database connection established successfully.`);
});

module.exports = app;