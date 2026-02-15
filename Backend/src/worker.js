const { testConnection } = require('./config/db');
const { syncDatabase } = require('./models');
require('./workers/store.worker');
require('dotenv').config();

/**
 * Start the worker process
 */
const startWorker = async () => {
  try {
    console.log('Starting Store Provisioning Worker...\n');

    await testConnection();
    await syncDatabase(false);

    console.log('Worker is ready to process jobs');
    console.log('   Queue: store-provisioning');
    console.log('   Concurrency: 3');
    console.log('   Watching for new jobs...\n');

    // Keep process alive
    process.on('SIGTERM', async () => {
      console.log('SIGTERM signal received: shutting down worker');
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log('SIGINT signal received: shutting down worker');
      process.exit(0);
    });

  } catch (error) {
    console.error('Error starting worker:', error);
    process.exit(1);
  }
};

startWorker();