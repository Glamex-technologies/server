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
    const serviceList = await providerResource.findServiceList({ service_provider_id: provider.id, deleted_at: null });
    if(provider?.step_completed == 6 && provider.admin_verified != 1 && serviceList) {
      return response.forbidden('Wait for the admin to verify your profile', res, null);
    }
    if (provider.status != 1) {
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