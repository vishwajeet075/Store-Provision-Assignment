const express = require('express');
const router = express.Router();
const storeController = require('../controllers/store.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

/**
 * @route   GET /api/stores
 * @desc    Get all stores for authenticated user
 * @access  Private
 */
router.get('/', authMiddleware, storeController.getStores);

/**
 * @route   GET /api/stores/:id
 * @desc    Get a single store by ID
 * @access  Private
 */
router.get('/:id', authMiddleware, storeController.getStoreById);

/**
 * @route   GET /api/stores/:id/status
 * @desc    Get store status with job info (if provisioning)
 * @access  Private
 */
router.get('/:id/status', authMiddleware, storeController.getStoreStatus);

/**
 * @route   POST /api/stores
 * @desc    Create a new store
 * @access  Private
 */
router.post('/', authMiddleware, storeController.createStore);

/**
 * @route   DELETE /api/stores/:id
 * @desc    Delete a store (placeholder)
 * @access  Private
 */
router.delete('/:id', authMiddleware, storeController.deleteStore);

/**
 * @route   PATCH /api/stores/:id/status
 * @desc    Update store status (internal use by worker)
 * @access  Private (should add worker auth token later)
 */
router.patch('/:id/status', authMiddleware, storeController.updateStoreStatus);

module.exports = router;