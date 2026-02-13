const { Queue } = require('bullmq');
const Redis = require('ioredis');
require('dotenv').config();

// Redis connection configuration
const connection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false
});

// Test Redis connection
connection.on('connect', () => {
  console.log('✅ Redis connected successfully');
});

connection.on('error', (err) => {
  console.error('❌ Redis connection error:', err);
});

// Create queue for store provisioning
const storeProvisioningQueue = new Queue('store-provisioning', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 1000
    },
    removeOnFail: {
      age: 7 * 24 * 3600 // Keep failed jobs for 7 days
    }
  }
});

/**
 * Add store provisioning job to queue
 * @param {Object} storeData - Store data including storeId, storeName
 * @returns {Promise<Job>}
 */
const addStoreProvisioningJob = async (storeData) => {
  try {
    const job = await storeProvisioningQueue.add(
      'provision-store',
      storeData,
      {
        jobId: `job-${storeData.storeId}`,
        priority: 1
      }
    );
    
    console.log(`✅ Job added to queue: ${job.id} for store: ${storeData.storeName}`);
    return job;
  } catch (error) {
    console.error('❌ Error adding job to queue:', error);
    throw error;
  }
};

/**
 * Get job status
 * @param {string} jobId
 * @returns {Promise<Object>}
 */
const getJobStatus = async (jobId) => {
  try {
    const job = await storeProvisioningQueue.getJob(jobId);
    if (!job) {
      return null;
    }
    
    const state = await job.getState();
    return {
      id: job.id,
      state,
      progress: job.progress,
      data: job.data,
      returnvalue: job.returnvalue,
      failedReason: job.failedReason
    };
  } catch (error) {
    console.error('❌ Error getting job status:', error);
    throw error;
  }
};

/**
 * Get queue metrics
 * @returns {Promise<Object>}
 */
const getQueueMetrics = async () => {
  try {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      storeProvisioningQueue.getWaitingCount(),
      storeProvisioningQueue.getActiveCount(),
      storeProvisioningQueue.getCompletedCount(),
      storeProvisioningQueue.getFailedCount(),
      storeProvisioningQueue.getDelayedCount()
    ]);
    
    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed
    };
  } catch (error) {
    console.error('❌ Error getting queue metrics:', error);
    throw error;
  }
};

module.exports = {
  storeProvisioningQueue,
  connection,
  addStoreProvisioningJob,
  getJobStatus,
  getQueueMetrics
};