// orderRoutes.js
import express from 'express';
import { createOrderController, captureOrderController, authorizeOrderController } from '../controllers/orderController.js';

const router = express.Router();

router.post('/api/orders', createOrderController);
router.post('/api/orders/:orderID/capture', captureOrderController);
router.post('/api/orders/:orderID/authorize', authorizeOrderController);

export default router;
