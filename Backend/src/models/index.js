const { sequelize } = require('../config/db');
const User = require('./user.model');
const Store = require('./store.model');

const models = {
  User,
  Store
};

const syncDatabase = async (force = false) => {
  try {
    if (force) {
      await sequelize.sync({ force: true });
      console.log('Database dropped and recreated.');
    } else {
      await sequelize.sync();
      console.log('Database synchronized safely.');
    }
  } catch (error) {
    console.error('Error synchronizing database:', error);
    throw error;
  }
};


module.exports = {
  sequelize,
  ...models,
  syncDatabase
};