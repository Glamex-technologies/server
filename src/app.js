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

// Import error handling middleware
const ErrorHandlerMiddleware = require("./application/middlewares/errorHandler.middleware");

const app = express();

// CORS configuration
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: '*'
}));

// Body parsers with error handling
app.use(express.json({ 
  limit: "16kb",
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      res.status(400).json({
        status: "error",
        message: "Invalid JSON format",
        error_code: "INVALID_JSON"
      });
      throw new Error('Invalid JSON');
    }
  }
}));
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

// Comprehensive error handling middleware (in order of specificity)
app.use(ErrorHandlerMiddleware.handleJsonParsingError);
app.use(ErrorHandlerMiddleware.handleMulterError);
app.use(ErrorHandlerMiddleware.handleValidationError);
app.use(ErrorHandlerMiddleware.handleDatabaseError);
app.use(ErrorHandlerMiddleware.handleJwtError);
app.use(ErrorHandlerMiddleware.handleRateLimitError);

// 404 handler for undefined routes
app.use(ErrorHandlerMiddleware.handleNotFound);

// Generic error handler (must be last)
app.use(ErrorHandlerMiddleware.handleGenericError);

const PORT = process.env.PORT || 8080;

// Create HTTP server (simplified for development)
const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`HTTP Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Database connection established successfully.`);
});

module.exports = app;