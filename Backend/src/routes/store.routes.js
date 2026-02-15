const express = require('express');
const router = express.Router();
const storeController = require('../controllers/store.controller');
const { authMiddleware } = require('../middleware/auth.middleware');


router.get('/', authMiddleware, storeController.getStores);


router.get('/:id', authMiddleware, storeController.getStoreById);


router.get('/:id/status', authMiddleware, storeController.getStoreStatus);


router.post('/', authMiddleware, storeController.createStore);


router.delete('/:id', authMiddleware, storeController.deleteStore);


router.patch('/:id/status', authMiddleware, storeController.updateStoreStatus);

module.exports = router;