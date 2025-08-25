const jwt = require('jsonwebtoken');
const db = require('../../startup/model');
const ResponseHelper = require('../helpers/response.helpers');

const response = new ResponseHelper();

/**
 * Hybrid authentication middleware that supports both user and provider tokens
 * For promo code endpoints that need to work with both user and provider apps
 */
const hybridAuth = async (req, res, next) => {
  console.log('🔐 HybridAuth Middleware - START');
  console.log('Request URL:', req.url);
  console.log('Request method:', req.method);
  
  try {
    const authHeader = req.headers.authorization;
    console.log('Authorization header:', authHeader);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ No token provided');
      // For hybrid routes, we allow unauthenticated access but with limited data
      req.user = null;
      req.isAuthenticated = false;
      return next();
    }

    const token = authHeader.split(' ')[1];
    console.log('Extracted token:', token ? 'Token exists' : 'No token');

    if (!token) {
      console.log('❌ No token provided');
      req.user = null;
      req.isAuthenticated = false;
      return next();
    }

    console.log('🔍 Verifying token...');
    
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token decoded:', decoded);

    if (!decoded) {
      console.log('❌ Invalid token');
      req.user = null;
      req.isAuthenticated = false;
      return next();
    }

    // Check if it's a provider token
    if (decoded.userType === 'provider' || decoded.user_type === 'provider') {
      console.log('🔍 Finding provider with ID:', decoded.user_id || decoded.id);
      
      const user = await db.models.User.findByPk(decoded.user_id || decoded.id);
      if (!user) {
        console.log('User found: NO');
        req.user = null;
        req.isAuthenticated = false;
        return next();
      }
      console.log('User found: YES');
      console.log('User type:', user.user_type);

      if (user.status !== 1) {
        console.log('❌ User is inactive');
        req.user = null;
        req.isAuthenticated = false;
        return next();
      }
      console.log('🔍 Checking user status:', user.status);

      // Find the provider
      const provider = await db.models.ServiceProvider.findOne({
        where: { user_id: user.id }
      });
      console.log('Provider found:', provider ? 'YES' : 'NO');

      if (provider) {
        console.log('Provider step_completed:', provider.step_completed);
        
        // Attach provider info to request
        req.user = {
          ...user.toJSON(),
          provider_id: provider.id,
          userType: 'provider'
        };
        req.isAuthenticated = true;
        console.log('✅ Provider user authenticated successfully, attaching to request');
        return next();
      }
    }
    
    // Check if it's a regular user token
    if (decoded.userType === 'user' || decoded.user_type === 'user') {
      console.log('🔍 Finding user with ID:', decoded.user_id || decoded.id);
      
      const user = await db.models.User.findByPk(decoded.user_id || decoded.id);
      if (!user) {
        console.log('User found: NO');
        req.user = null;
        req.isAuthenticated = false;
        return next();
      }
      console.log('User found: YES');
      console.log('User type:', user.user_type);

      if (user.status !== 1) {
        console.log('❌ User is inactive');
        req.user = null;
        req.isAuthenticated = false;
        return next();
      }

      // Attach user info to request
      req.user = {
        ...user.toJSON(),
        userType: 'user'
      };
      req.isAuthenticated = true;
      console.log('✅ User authenticated successfully, attaching to request');
      return next();
    }

    // If we reach here, the token is invalid or has unknown user type
    console.log('❌ Invalid token type');
    req.user = null;
    req.isAuthenticated = false;
    return next();

  } catch (error) {
    console.error('❌ HybridAuth Middleware - ERROR:', error);
    req.user = null;
    req.isAuthenticated = false;
    return next();
  }
};

module.exports = hybridAuth;
