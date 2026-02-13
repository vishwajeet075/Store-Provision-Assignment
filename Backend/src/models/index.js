const { sequelize } = require('../config/db');
const User = require('./user.model');
const Store = require('./store.model');

const models = {
  User,
  Store
};

// Sync database (creates tables if they don't exist)
const syncDatabase = async (force = false) => {
  try {
    await sequelize.sync({ force, alter: !force });
    console.log('✅ Database synchronized successfully.');
  } catch (error) {
    console.error('❌ Error synchronizing database:', error);
    throw error;
  }
};

module.exports = {
  sequelize,
  ...models,
  syncDatabase
};