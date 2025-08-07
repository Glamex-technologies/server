require("dotenv").config();
const express = require("express");
const path = require('path');
const cors = require("cors");
const errorHandler = require("./utils/errorHandler");
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

// Error handler middleware
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

// Check if SSL certificates exist
const sslKeyPath = path.join(__dirname, 'ssl-certs', 'key.pem');
const sslCertPath = path.join(__dirname, 'ssl-certs', 'cert.pem');

if (fs.existsSync(sslKeyPath) && fs.existsSync(sslCertPath)) {
  // HTTPS server
  const options = {
    key: fs.readFileSync(sslKeyPath, { encoding: "utf8" }),
    cert: fs.readFileSync(sslCertPath, { encoding: "utf8" }),
  };
  const server = https.createServer(options, app);
  
  server.listen(PORT, () => {
    console.log(`HTTPS Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
} else {
  // HTTP server (fallback)
  const server = http.createServer(app);
  
  server.listen(PORT, () => {
    console.log(`HTTP Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

module.exports = app;