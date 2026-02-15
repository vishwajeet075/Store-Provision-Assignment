const mysql = require('mysql2/promise');
const crypto = require('crypto');
require('dotenv').config();

class DatabaseService {
  constructor() {
    this.host = process.env.SHARED_MYSQL_HOST || 'localhost';
    this.port = process.env.SHARED_MYSQL_PORT || 3306;
    this.rootPassword = process.env.SHARED_MYSQL_ROOT_PASSWORD;
  }


  async getConnection() {
    return await mysql.createConnection({
      host: this.host,
      port: this.port,
      user: 'root',
      password: this.rootPassword
    });
  }

  /**
   * Generate secure random password
   */
  generatePassword(length = 16) {
    return crypto.randomBytes(length).toString('base64').slice(0, length);
  }

  /**
   * Create database and user for store
   */
  async createStoreDatabase(storeName, storeId) {
    const connection = await this.getConnection();
    
    try {
      const dbName = `wc_store_${storeId}`;
      const dbUser = `wc_user_${storeId}`;
      const dbPassword = this.generatePassword();

      // Create database
      await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      console.log(`Database created: ${dbName}`);

      // Create user
      await connection.execute(`CREATE USER IF NOT EXISTS '${dbUser}'@'%' IDENTIFIED BY '${dbPassword}'`);
      console.log(`User created: ${dbUser}`);

      // Grant privileges
      await connection.execute(`GRANT ALL PRIVILEGES ON \`${dbName}\`.* TO '${dbUser}'@'%'`);
      await connection.execute('FLUSH PRIVILEGES');
      console.log(`Privileges granted to ${dbUser}`);

      return {
        dbName,
        dbUser,
        dbPassword
      };
    } catch (error) {
      console.error('Error creating store database:', error);
      throw error;
    } finally {
      await connection.end();
    }
  }

  /**
   * Delete database and user for store
   */
  async deleteStoreDatabase(dbName, dbUser) {
    const connection = await this.getConnection();
    
    try {
      // Drop user
      await connection.execute(`DROP USER IF EXISTS '${dbUser}'@'%'`);
      console.log(`User deleted: ${dbUser}`);

      // Drop database
      await connection.execute(`DROP DATABASE IF EXISTS \`${dbName}\``);
      console.log(`Database deleted: ${dbName}`);

      return { success: true };
    } catch (error) {
      console.error('Error deleting store database:', error);
      throw error;
    } finally {
      await connection.end();
    }
  }

  /**
   * Check if database exists
   */
  async databaseExists(dbName) {
    const connection = await this.getConnection();
    
    try {
      const [rows] = await connection.execute(
        'SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?',
        [dbName]
      );
      return rows.length > 0;
    } catch (error) {
      console.error('Error checking database:', error);
      return false;
    } finally {
      await connection.end();
    }
  }
}

module.exports = new DatabaseService();