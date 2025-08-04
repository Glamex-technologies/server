const jwt = require('jsonwebtoken');
const AdminResource = require('../resources/admin/admin.resources');
const ProviderResources = require('../resources/provider/provider.resources');
const UserResources = require('../resources/users/user.resources');

const providerResource = new ProviderResources();
const adminResource = new AdminResource();
const userResources = new UserResources();

const ResponseHelper = require('../helpers/response.helpers');
const { verifyToken } = require('../helpers/jwtToken.helpers');
const response = new ResponseHelper();

const adminAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]; 
    if (!token) {
        return response.forbidden('Authentication failed', res, null);
    }
    // Verify JWT token
    const decoded = await verifyToken(token);
    if(!decoded || !decoded.role || decoded.userType != 'admin') {
        return response.forbidden('Authentication failed', res, null);
    }
    // Find admin and include the role
    const admin = await adminResource.findOne({ id: decoded.id });
    if (!admin) {
        return response.forbidden('Authentication failed', res, null);
    }
    // Attach to request
    req.admin = admin;
    next();
  } catch (error) {
    console.error('Admin Auth Middleware Error:', error.message);
    return response.forbidden('Authentication failed', res, null);
  }
};

const providerAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]; 
    if (!token) {
      return response.forbidden('Authentication failed', res, null);
    }
    // Verify JWT token
    const decoded = await verifyToken(token);
    if(!decoded || decoded.userType != 'provider') {
      return response.forbidden('Authentication failed', res, null);
    }
    // Find admin and include the role
    const provider = await providerResource.getAllDetails({ id: decoded.id });
    if (!provider) {
      return response.forbidden('Authentication failed', res, null);
    }
    // Check profile completion status first
    if (provider.step_completed < 6) {
      return response.forbidden('Please complete your profile setup first', res, null);
    }
    
    // Check if profile is approved by admin (only if steps are completed)
    if (provider.step_completed === 6 && provider.is_approved !== 1) {
      return response.forbidden('Wait for the admin to verify your profile', res, null);
    }
    
    // Check if account is active (should be 1 by default for registered providers)
    if (provider.status !== 1) {
      return response.forbidden('Your account is not active', res);
    }
    // Attach to request
    req.provider = provider;
    next();
  } catch (error) {
    console.error('Admin Auth Middleware Error:', error.message);
    return response.forbidden('Authentication failed', res, null);
  }
};

const userAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]; 
    if (!token) {
      return response.forbidden('Authentication failed', res, null);
    }
    // Verify JWT token
    const decoded = await verifyToken(token);
    if(!decoded || decoded.userType != 'user') {
      return response.forbidden('Authentication failed', res, null);
    }
    // Find admin and include the role
    const user = await userResources.getAllDetails({ id: decoded.id });
    if (!user) {
      return response.forbidden('Authentication failed', res, null);
    }
    if (user.status != 1) {
      return response.forbidden('Your account is not active', res, null);
    }
    // Attach to request
    req.user = user;
    next();
  } catch (error) {
    console.error('Admin Auth Middleware Error:', error.message);
    return response.forbidden('Authentication failed', res, null);
  }
};

module.exports = {
  adminAuth,
  providerAuth,
  userAuth
};