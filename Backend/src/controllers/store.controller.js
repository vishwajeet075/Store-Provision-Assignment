const Store = require('../models/store.model');
const User = require('../models/user.model');
const { addStoreProvisioningJob } = require('../services/queue.service'); 
const helmService = require('../services/helm.service'); 
const databaseService = require('../services/database.service'); 

/**
 * GET /api/stores
 */
exports.getStores = async (req, res) => {
  try {
    const userId = req.user.id; 
    const stores = await Store.findAll({
      where: { user_id: userId },
      order: [['createdAt', 'DESC']],
      attributes: [
        'id',
        'store_name',
        'url',
        'status',
        'namespace',
        'helm_release_name',
        'error_message',
        'resource_quota',
        'createdAt',
        'updatedAt'
      ]
    });

    const formattedStores = stores.map(store => ({
      id: store.id,
      name: store.store_name,
      storeName: store.store_name,
      url: store.url,
      storeUrl: store.url,
      status: store.status,
      namespace: store.namespace,
      helmReleaseName: store.helm_release_name,
      errorMessage: store.error_message,
      resourceQuota: store.resource_quota,
      createdAt: store.createdAt,
      updatedAt: store.updatedAt
    }));

    res.status(200).json({
      stores: formattedStores,
      count: formattedStores.length
    });

  } catch (error) {
    console.error('Error fetching stores:', error);
    res.status(500).json({
      message: 'Error fetching stores',
      error: error.message
    });
  }
};

/**
 * Get a single store by ID
 * GET /api/stores/:id
 */
exports.getStoreById = async (req, res) => {
  try {
    const userId = req.user.id;
    const storeId = req.params.id;

    const store = await Store.findOne({
      where: {
        id: storeId,
        user_id: userId 
      }
    });

    if (!store) {
      return res.status(404).json({
        message: 'Store not found'
      });
    }

    res.status(200).json({
      store: {
        id: store.id,
        name: store.store_name,
        storeName: store.store_name,
        url: store.url,
        status: store.status,
        namespace: store.namespace,
        helmReleaseName: store.helm_release_name,
        dbName: store.db_name,
        adminEmail: store.admin_email,
        errorMessage: store.error_message,
        resourceQuota: store.resource_quota,
        createdAt: store.createdAt,
        updatedAt: store.updatedAt
      }
    });

  } catch (error) {
    console.error('Error fetching store:', error);
    res.status(500).json({
      message: 'Error fetching store',
      error: error.message
    });
  }
};

/**
 * Create a new store
 * POST /api/stores
 */
exports.createStore = async (req, res) => {
  try {
    const userId = req.user.id;
    const { storeName, adminEmail, adminPassword } = req.body;

    if (!storeName || !adminEmail || !adminPassword) {
      return res.status(400).json({
        message: 'Store name, admin email, and admin password are required'
      });
    }

    // Validate store name format (alphanumeric and hyphens only)
    const storeNameRegex = /^[a-z0-9-]+$/i;
    if (!storeNameRegex.test(storeName)) {
      return res.status(400).json({
        message: 'Store name must contain only alphanumeric characters and hyphens'
      });
    }

    const existingStore = await Store.findOne({
      where: { store_name: storeName }
    });

    if (existingStore) {
      return res.status(409).json({
        message: 'Store name already exists. Please choose a different name.'
      });
    }

    const timestamp = Date.now();
    const storeId = timestamp.toString();
    const helmReleaseName = `store-${storeId}`;
    const namespace = 'woocommerce-stores';

    const newStore = await Store.create({
      store_name: storeName,
      user_id: userId,
      status: 'provisioning',
      namespace: namespace,
      helm_release_name: helmReleaseName,
      admin_email: adminEmail,
      admin_password: adminPassword,
      resource_quota: {
        cpu: '500m',
        memory: '1Gi',
        storage: '10Gi'
      }
    });

    console.log(`Store record created in DB: ${newStore.id} (${storeName})`);
    console.log(`Helm release will be: ${helmReleaseName}`);

    const job = await addStoreProvisioningJob({
      storeId: storeId,
      storeDbId: newStore.id,
      storeName: storeName,
      adminEmail: adminEmail,
      adminPassword: adminPassword,
      userId: userId
    });

    console.log(`Provisioning job queued: ${job.id}`);

    // Return immediate response
    res.status(201).json({
      message: 'Store provisioning started',
      store: {
        id: newStore.id,
        name: newStore.store_name,
        storeName: newStore.store_name,
        url: null,
        status: 'provisioning',
        namespace: newStore.namespace,
        helmReleaseName: newStore.helm_release_name,
        jobId: job.id,
        createdAt: newStore.createdAt
      }
    });

  } catch (error) {
    console.error('Error creating store:', error);
    res.status(500).json({
      message: 'Error creating store',
      error: error.message
    });
  }
};

/**
 * Get store status (with job info if still provisioning)
 * GET /api/stores/:id/status
 */
exports.getStoreStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const storeId = req.params.id;

    const store = await Store.findOne({
      where: {
        id: storeId,
        user_id: userId
      },
      attributes: ['id', 'store_name', 'status', 'url', 'error_message', 'updatedAt', 'helm_release_name']
    });

    if (!store) {
      return res.status(404).json({
        message: 'Store not found'
      });
    }
s
    let jobStatus = null;
    if (store.status === 'provisioning' || store.status === 'deploying') {
      try {
        const { getJobStatus } = require('../services/queue.service');
        const jobId = `job-${store.helm_release_name}`;
        jobStatus = await getJobStatus(jobId);
      } catch (error) {
        console.warn('Could not get job status:', error.message);
      }
    }

    res.status(200).json({
      store: {
        id: store.id,
        name: store.store_name,
        status: store.status,
        url: store.url,
        errorMessage: store.error_message,
        updatedAt: store.updatedAt,
        jobStatus: jobStatus ? {
          state: jobStatus.state,
          progress: jobStatus.progress
        } : null
      }
    });

  } catch (error) {
    console.error('Error fetching store status:', error);
    res.status(500).json({
      message: 'Error fetching store status',
      error: error.message
    });
  }
};

/**
 * Delete store (COMPLETE IMPLEMENTATION)
 * DELETE /api/stores/:id
 */
exports.deleteStore = async (req, res) => {
  try {
    const userId = req.user.id;
    const storeId = req.params.id;

    // Find store
    const store = await Store.findOne({
      where: {
        id: storeId,
        user_id: userId 
      }
    });

    if (!store) {
      return res.status(404).json({
        message: 'Store not found'
      });
    }

    console.log(`🗑️ Starting deletion of store: ${store.store_name} (ID: ${storeId})`);

    const errors = [];

    if (store.helm_release_name) {
      try {
        console.log(`Uninstalling Helm release: ${store.helm_release_name}`);
        await helmService.uninstallRelease(store.helm_release_name);
        console.log(`Helm release uninstalled: ${store.helm_release_name}`);
      } catch (error) {
        console.error('Error uninstalling Helm release:', error.message);
        errors.push(`Helm uninstall failed: ${error.message}`);
      }
    } else {
      console.log('No Helm release name found, skipping Helm uninstall');
    }

    if (store.db_name && store.db_user) {
      try {
        console.log(`Deleting database: ${store.db_name}`);
        await databaseService.deleteStoreDatabase(store.db_name, store.db_user);
        console.log(`Database deleted: ${store.db_name}`);
      } catch (error) {
        console.error('Error deleting database:', error.message);
        errors.push(`Database deletion failed: ${error.message}`);
      }
    } else {
      console.log('No database credentials found, skipping database deletion');
    }

    await store.destroy();
    console.log(`Store record deleted from database: ${storeId}`);

    if (errors.length > 0) {
      return res.status(207).json({ 
        message: 'Store deleted with warnings',
        storeId: storeId,
        storeName: store.store_name,
        warnings: errors
      });
    }

    res.status(200).json({
      message: 'Store deleted successfully',
      storeId: storeId,
      storeName: store.store_name
    });

  } catch (error) {
    console.error('Error deleting store:', error);
    res.status(500).json({
      message: 'Error deleting store',
      error: error.message
    });
  }
};

/**
 * Update store status (internal use by worker)
 * PATCH /api/stores/:id/status
 */
exports.updateStoreStatus = async (req, res) => {
  try {
    const storeId = req.params.id;
    const { status, url, errorMessage, dbName, dbUser, dbPassword } = req.body;

    const validStatuses = ['provisioning', 'deploying', 'ready', 'failed', 'suspended'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const store = await Store.findByPk(storeId);

    if (!store) {
      return res.status(404).json({
        message: 'Store not found'
      });
    }

    // Update status and optional fields
    store.status = status;
    if (url) store.url = url;
    if (errorMessage) store.error_message = errorMessage;
    if (dbName) store.db_name = dbName;
    if (dbUser) store.db_user = dbUser;
    if (dbPassword) store.db_password = dbPassword;

    await store.save();

    console.log(`Store ${storeId} status updated to: ${status}`);

    res.status(200).json({
      message: 'Store status updated',
      store: {
        id: store.id,
        name: store.store_name,
        status: store.status,
        url: store.url
      }
    });

  } catch (error) {
    console.error('Error updating store status:', error);
    res.status(500).json({
      message: 'Error updating store status',
      error: error.message
    });
  }
};

module.exports = exports;