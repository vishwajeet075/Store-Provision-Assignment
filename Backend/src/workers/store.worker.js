const { Worker } = require('bullmq');
const { connection } = require('../services/queue.service');
const helmService = require('../services/helm.service');
const Store = require('../models/store.model');
const { exec } = require('child_process');
const { promisify } = require('util');
require('dotenv').config();

const execAsync = promisify(exec);

const storeProvisioningWorker = new Worker(
  'store-provisioning',
  async (job) => {
    const { storeId, storeDbId, storeName, adminEmail, adminPassword } = job.data;

    console.log(`Processing store provisioning for: ${storeName} (ID: ${storeId})`);
    
    try {
      await job.updateProgress(10);

const finalAdminPassword = (adminPassword && adminPassword.trim()) 
  ? adminPassword 
  : `${Math.random().toString(36).substring(2, 10).toUpperCase()}${Math.random().toString(36).substring(2, 6)}`;

console.log(`Admin password: ${adminPassword ? 'Using provided password' : 'Generated random password'}`);
      
      await job.updateProgress(30);

      console.log('Deploying to Kubernetes...');
      await job.updateProgress(50);

      const helmResult = await helmService.installRelease({
        storeId: storeId,
        storeName: storeName,
        adminEmail: adminEmail,
        adminPassword: finalAdminPassword
      });

      console.log(`Helm deployment completed: ${helmResult.releaseName}`);

      await Store.update(
        {
          url: helmResult.url,
          status: 'deploying',
          admin_email: adminEmail,
          admin_password: finalAdminPassword
        },
        { where: { id: storeDbId } }
      );

      await job.updateProgress(70);

      console.log('Waiting for pod to become ready...');
      
      let attempts = 0;
      const maxAttempts = 30;
      let isReady = false;

      while (attempts < maxAttempts && !isReady) {
        attempts++;
        console.log(`Checking readiness (attempt ${attempts}/${maxAttempts})...`);
        isReady = await helmService.isStoreReady(storeId);
        
        const progress = 70 + Math.floor((attempts / maxAttempts) * 20);
        await job.updateProgress(progress);
        
        if (isReady) {
          console.log(`Pod is READY after ${attempts} attempts`);
          break;
        } else {
          await new Promise(resolve => setTimeout(resolve, 10000));
        }
      }

      await job.updateProgress(90);

      console.log('Updating WordPress URLs with NodePort...');

      let actualUrl = helmResult.url;

      try {
        const releaseName = helmResult.releaseName;
        const namespace = helmResult.namespace;
        
        console.log(`Looking for service: ${releaseName}`);
        
        const { stdout: nodePortOutput } = await execAsync(
          `kubectl get svc -n ${namespace} ${releaseName} -o jsonpath='{.spec.ports[0].nodePort}'`
        );
        
        const nodePort = nodePortOutput.trim();
        
        if (nodePort) {
          const nodeIP = process.env.NODE_IP || 'localhost';
          actualUrl = `http://${nodeIP}:${nodePort}`;
          
          console.log(`NodePort URL: ${actualUrl}`);
          
          const { stdout: podOutput } = await execAsync(
            `kubectl get pods -n ${namespace} -l app.kubernetes.io/instance=${releaseName} -o jsonpath='{.items[0].metadata.name}'`
          );
          
          const podName = podOutput.trim();
          
          if (podName && isReady) {
            console.log(`Updating WordPress URLs in pod: ${podName}`);
            
await execAsync(`
kubectl exec -n ${namespace} ${podName} -- bash -c '
cd /var/www/html &&
php -r "
require_once \\"wp-load.php\\";
update_option(\\"home\\", \\"${actualUrl}\\");
update_option(\\"siteurl\\", \\"${actualUrl}\\");
echo \\"URL updated\\n\\";
"
'
`);

const { stdout: verifyUrl } = await execAsync(`
kubectl exec -n ${namespace} ${podName} -- bash -c '
cd /var/www/html &&
php -r "
require_once \\"wp-load.php\\";
echo get_option(\\"home\\");
"
'
`);

console.log("Verified home URL:", verifyUrl.trim());
      
            
            console.log('WordPress URLs updated successfully!');
          }
        }
      } catch (error) {
        console.error('Could not update WordPress URLs:', error.message);
      }

      await job.updateProgress(95);

      const finalStatus = isReady ? 'ready' : 'deploying';
      
      const loginUrl = `${actualUrl}/wp-login.php`;
      
      await Store.update(
        {
          url: loginUrl,  
          status: finalStatus,
          error_message: isReady ? null : 'Pod taking longer than expected'
        },
        { where: { id: storeDbId } }
      );

      await job.updateProgress(100);

      console.log(`Store provisioned successfully: ${storeName}`);
      console.log(`   URL: ${loginUrl}`);

      return {
        success: true,
        storeId: storeId,
        storeName: storeName,
        url: loginUrl,
        status: finalStatus,
        isReady: isReady
      };

    } catch (error) {
      console.error(`Error provisioning store ${storeName}:`, error);

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

storeProvisioningWorker.on('completed', (job, result) => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Job ${job.id} completed successfully`);
  console.log(`   Store URL: ${result.url}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});

storeProvisioningWorker.on('failed', (job, error) => {
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error(`Job ${job.id} failed:`, error.message);
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});

storeProvisioningWorker.on('progress', (job, progress) => {
  console.log(`   Job ${job.id} progress: ${progress}%`);
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing worker...');
  await storeProvisioningWorker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing worker...');
  await storeProvisioningWorker.close();
  process.exit(0);
});

console.log('Store provisioning worker started');
console.log('Concurrency: 3');
console.log('Rate limit: 5 jobs per minute');
console.log('Waiting for jobs...');

module.exports = storeProvisioningWorker;