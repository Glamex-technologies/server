const jwt = require("jsonwebtoken");
const AdminResource = require("../resources/admin/admin.resources");
const ProviderResources = require("../resources/provider/provider.resources");
const UserResources = require("../resources/users/user.resources");

const providerResource = new ProviderResources();
const adminResource = new AdminResource();
const userResources = new UserResources();

const ResponseHelper = require("../helpers/response.helpers");
const { verifyToken } = require("../helpers/jwtToken.helpers");
const response = new ResponseHelper();

const adminAuth = async (req, res, next) => {
  console.log("🔐 AdminAuth Middleware - START");
  console.log("Request URL:", req.url);
  console.log("Request method:", req.method);
  console.log("Authorization header:", req.headers.authorization);
  
  try {
    const token = req.headers.authorization?.split(" ")[1];
    console.log("Extracted token:", token ? "Token exists" : "No token");
    
    if (!token) {
      console.log("❌ No token provided");
      return response.forbidden("Authentication failed", res, null);
    }

    // Verify JWT token
    console.log("🔍 Verifying token...");
    const decoded = await verifyToken(token);
    console.log("Token decoded:", decoded ? JSON.stringify(decoded, null, 2) : "Token verification failed");
    
    if (!decoded || !decoded.role || decoded.userType != "admin") {
      console.log("❌ Token verification failed or wrong user type:", decoded?.userType);
      return response.forbidden("Authentication failed", res, null);
    }

    // Find admin and include the role
    console.log("🔍 Finding admin with ID:", decoded.id);
    const admin = await adminResource.findOne({ id: decoded.id });
    console.log("Admin found:", admin ? "YES" : "NO");
    
    if (!admin) {
      console.log("❌ Admin not found");
      return response.forbidden("Authentication failed", res, null);
    }

    // Check if admin account is active
    console.log("🔍 Checking admin status:", admin.status);
    if (admin.status !== 1) {
      console.log("❌ Admin account not active. Status:", admin.status);
      return response.forbidden("Your account is not active", res);
    }

    // Attach to request
    console.log("✅ Admin authenticated successfully, attaching to request");
    req.admin = admin;
    next();
  } catch (error) {
    console.error("❌ Admin Auth Middleware Error:", error.message);
    console.error("Error stack:", error.stack);
    return response.forbidden("Authentication failed", res, null);
  }
};

const providerAuth = async (req, res, next) => {
  console.log("🔐 ProviderAuth Middleware - START");
  console.log("Request URL:", req.url);
  console.log("Request method:", req.method);
  console.log("Authorization header:", req.headers.authorization);
  
  try {
    const token = req.headers.authorization?.split(" ")[1];
    console.log("Extracted token:", token ? "Token exists" : "No token");
    
    if (!token) {
      console.log("❌ No token provided");
      return response.forbidden("Authentication failed", res, null);
    }
    
    // Verify JWT token
    console.log("🔍 Verifying token...");
    const decoded = await verifyToken(token);
    console.log("Token decoded:", decoded ? JSON.stringify(decoded, null, 2) : "Token verification failed");
    
    if (!decoded || decoded.userType != "provider") {
      console.log("❌ Token verification failed or wrong user type:", decoded?.userType);
      return response.forbidden("Authentication failed", res, null);
    }

    // Find user first (providers are linked to users)
    console.log("🔍 Finding user with ID:", decoded.user_id);
    const user = await userResources.findOne({ id: decoded.user_id });
    console.log("User found:", user ? "YES" : "NO");
    console.log("User type:", user?.user_type);
    
    if (!user || user.user_type !== "provider") {
      console.log("❌ User not found or wrong user type");
      return response.forbidden("Authentication failed", res, null);
    }

    // Check if user account is active
    console.log("🔍 Checking user status:", user.status);
    if (user.status !== 1) {
      console.log("❌ User account not active. Status:", user.status);
      return response.forbidden("Your account is not active", res);
    }

    // Find service provider linked to the user (optional - may not exist yet)
    console.log("🔍 Finding provider for user ID:", user.id);
    const provider = await providerResource.findOne({ user_id: user.id });
    console.log("Provider found:", provider ? "YES" : "NO");
    console.log("Provider step_completed:", provider?.step_completed);

    // Attach user to request (provider may be null if profile not created yet)
    console.log("✅ Provider user authenticated successfully, attaching to request");
    req.user = user;
    req.provider = provider; // This can be null for create-profile route
    next();
  } catch (error) {
    console.error("❌ Provider Auth Middleware Error:", error.message);
    console.error("Error stack:", error.stack);
    return response.forbidden("Authentication failed", res, null);
  }
};

const userAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return response.forbidden("Authentication failed", res, null);
    }
    // Verify JWT token
    const decoded = await verifyToken(token);
    if (!decoded || decoded.userType != "user") {
      return response.forbidden("Authentication failed", res, null);
    }
    // Find user - handle both user_id and id from token
    const userId = decoded.user_id || decoded.id;
    const user = await userResources.findOne({ id: userId });
    if (!user) {
      return response.forbidden("Authentication failed", res, null);
    }
    if (user.status != 1) {
      return response.forbidden("Your account is not active", res, null);
    }
    // Attach to request
    req.user = user;
    next();
  } catch (error) {
    console.error("User Auth Middleware Error:", error.message);
    return response.forbidden("Authentication failed", res, null);
  }
};

module.exports = {
  adminAuth,
  providerAuth,
  userAuth,
};
