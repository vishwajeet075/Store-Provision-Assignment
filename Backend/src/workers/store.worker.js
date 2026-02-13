const { Worker } = require('bullmq');
const { connection } = require('../services/queue.service');
const helmService = require('../services/helm.service');
const databaseService = require('../services/database.service');
const Store = require('../models/store.model');
require('dotenv').config();

/**
 * Worker to process store provisioning jobs
 */
const storeProvisioningWorker = new Worker(
  'store-provisioning',
  async (job) => {
    const { storeId, storeDbId, storeName, adminEmail, adminPassword } = job.data;

    console.log(`🚀 Processing store provisioning for: ${storeName} (ID: ${storeId})`);
    
    try {
      // Update job progress
      await job.updateProgress(10);

      // **STEP 1: Generate admin password if not provided**
      const finalAdminPassword = adminPassword || `${Math.random().toString(36).substring(2, 10).toUpperCase()}${Math.random().toString(36).substring(2, 6)}`;
      console.log(`🔐 Generated admin password`);
      
      await job.updateProgress(30);

      // **STEP 2: Deploy to Kubernetes via Helm**
      console.log('☸️ Deploying to Kubernetes...');
      
      await job.updateProgress(50);

      const helmResult = await helmService.installRelease({
        storeId: storeId,
        storeName: storeName,
        adminEmail: adminEmail,
        adminPassword: finalAdminPassword
      });

      console.log(`✅ Helm deployment completed: ${helmResult.releaseName}`);
      console.log(`🌐 Store URL: ${helmResult.url}`);

      // Update store with URL immediately after Helm install
      await Store.update(
        {
          url: helmResult.url,
          status: 'deploying',
          admin_email: adminEmail,
          admin_password: finalAdminPassword // Store it (encrypt in production!)
        },
        { where: { id: storeDbId } }
      );

      await job.updateProgress(70);

      // **STEP 3: Wait for pod to be ready**
      console.log('⏳ Waiting for pod to become ready...');
      
      let attempts = 0;
      const maxAttempts = 30; // 5 minutes max
      let isReady = false;

      while (attempts < maxAttempts && !isReady) {
        attempts++;
        
        console.log(`🔍 Checking readiness (attempt ${attempts}/${maxAttempts})...`);
        isReady = await helmService.isStoreReady(storeId);
        
        const progress = 70 + Math.floor((attempts / maxAttempts) * 20); // 70% to 90%
        await job.updateProgress(progress);
        
        if (isReady) {
          console.log(`✅ Pod is READY after ${attempts} attempts (${attempts * 10}s)`);
          break;
        } else {
          console.log(`⏳ Pod not ready yet, waiting 10s...`);
          await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
        }
      }

      // **STEP 4: Update final status in database**
      const finalStatus = isReady ? 'ready' : 'deploying';
      
      console.log(`📝 Updating database status to: ${finalStatus}`);
      
      await Store.update(
        {
          status: finalStatus,
          error_message: isReady ? null : 'Pod taking longer than expected to be ready'
        },
        { where: { id: storeDbId } }
      );

      await job.updateProgress(100);

      console.log(`✅ Store provisioned successfully: ${storeName}`);
      console.log(`   URL: ${helmResult.url}`);
      console.log(`   Admin Email: ${adminEmail}`);
      console.log(`   Admin Password: ${finalAdminPassword}`);

      // Return result
      return {
        success: true,
        storeId: storeId,
        storeName: storeName,
        url: helmResult.url,
        status: finalStatus,
        isReady: isReady
      };

    } catch (error) {
      console.error(`❌ Error provisioning store ${storeName}:`, error);
      console.error('Error details:', error.message);

      // Update store record with failed status
      await Store.update(
        {
          status: 'failed',
          error_message: error.message
        },
        { where: { id: storeDbId } }
      );

      throw error;
    }
  },
  {
    connection,
    concurrency: 3,
    limiter: {
      max: 5,
      duration: 60000
    }
  }
);

// Event handlers
storeProvisioningWorker.on('completed', (job, result) => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Job ${job.id} completed successfully`);
  console.log(`   Store URL: ${result.url}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});

storeProvisioningWorker.on('failed', (job, error) => {
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error(`❌ Job ${job.id} failed:`, error.message);
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});

storeProvisioningWorker.on('progress', (job, progress) => {
  console.log(`   Job ${job.id} progress: ${progress}%`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('⚠️ SIGTERM received, closing worker...');
  await storeProvisioningWorker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('⚠️ SIGINT received, closing worker...');
  await storeProvisioningWorker.close();
  process.exit(0);
});

console.log('👷 Store provisioning worker started');
console.log('   Concurrency: 3');
console.log('   Rate limit: 5 jobs per minute');
console.log('   Waiting for jobs...');

module.exports = storeProvisioningWorker;