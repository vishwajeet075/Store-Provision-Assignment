const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const { syncDatabase } = require('./models');
const authRoutes = require('./routes/auth.routes');
const storeRoutes = require('./routes/store.routes');

const app = express();

app.use(helmet()); 
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(morgan('dev')); 
app.use(express.json()); 
app.use(express.urlencoded({ extended: true })); 


app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/stores', storeRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'WooCommerce Store Provisioning API',
    version: '1.0.0',
    endpoints: {
      auth: {
        signup: 'POST /api/auth/signup',
        login: 'POST /api/auth/login',
        me: 'GET /api/auth/me',
        logout: 'POST /api/auth/logout'
      },
      stores: {
        list: 'GET /api/stores',
        get: 'GET /api/stores/:id',
        create: 'POST /api/stores',
        delete: 'DELETE /api/stores/:id',
        updateStatus: 'PATCH /api/stores/:id/status'
      }
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    message: 'Route not found',
    path: req.originalUrl 
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// Database sync and server start
const PORT = process.env.PORT || 8000;

const startServer = async () => {
  try {
    console.log('Synchronizing database...');
    await syncDatabase(false); 
    console.log('Database synchronized');

    // Start server
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`API: http://localhost:${PORT}`);
      console.log(`Health: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;