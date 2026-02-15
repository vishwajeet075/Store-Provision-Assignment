const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        message: 'No token provided. Authorization denied.' 
      });
    }


    const token = authHeader.substring(7); 

    if (!token) {
      return res.status(401).json({ 
        message: 'No token provided. Authorization denied.' 
      });
    }

    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET || 'your-secret-key'
    );

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

    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      isActive: user.is_active
    };

    next();

  } catch (error) {
    console.error('Auth middleware error:', error);

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
        console.warn('ptional auth: Invalid token, continuing without auth');
      }
    }

    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    next();
  }
};

module.exports = {
  authMiddleware,
  optionalAuth
};