const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

const authMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        message: 'No token provided. Authorization denied.' 
      });
    }

    // Extract token
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
      return res.status(401).json({ 
        message: 'No token provided. Authorization denied.' 
      });
    }

    // Verify token
    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET || 'your-secret-key'
    );

    // Check if user exists and is active
    const user = await User.findByPk(decoded.id);

    if (!user) {
      return res.status(401).json({ 
        message: 'User not found. Token invalid.' 
      });
    }

    if (!user.is_active) {
      return res.status(403).json({ 
        message: 'Account is inactive. Authorization denied.' 
      });
    }

    // Attach user to request
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      isActive: user.is_active
    };

    next();

  } catch (error) {
    console.error('❌ Auth middleware error:', error);

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        message: 'Invalid token. Authorization denied.' 
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: 'Token expired. Please login again.' 
      });
    }

    res.status(500).json({ 
      message: 'Server error during authentication',
      error: error.message 
    });
  }
};

/**
 * Optional middleware - allows requests with or without auth
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        const decoded = jwt.verify(
          token, 
          process.env.JWT_SECRET || 'your-secret-key'
        );

        const user = await User.findByPk(decoded.id);

        if (user && user.is_active) {
          req.user = {
            id: user.id,
            username: user.username,
            email: user.email,
            isActive: user.is_active
          };
        }
      } catch (error) {
        // Token invalid or expired, but continue anyway
        console.warn('⚠️ Optional auth: Invalid token, continuing without auth');
      }
    }

    next();
  } catch (error) {
    console.error('❌ Optional auth middleware error:', error);
    next();
  }
};

module.exports = {
  authMiddleware,
  optionalAuth
};