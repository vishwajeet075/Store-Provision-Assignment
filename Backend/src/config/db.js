const { Sequelize } = require('sequelize');
require('dotenv').config();

// Main database connection for users and stores metadata
const sequelize = new Sequelize(
  process.env.DB_NAME || 'woocommerce_platform',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || 'password',
  {
    host: process.env.DB_HOST || 'mysql-service',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      underscored: true,
      freezeTableName: true
    }
  }
);

const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
    
    // Create database if it doesn't exist
    await sequelize.query(
      `CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'woocommerce_platform'}\` 
       CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    console.log(`✅ Database '${process.env.DB_NAME || 'woocommerce_platform'}' ready`);
    
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
    throw error;
  }
};

testConnection();

module.exports = {
  sequelize
};