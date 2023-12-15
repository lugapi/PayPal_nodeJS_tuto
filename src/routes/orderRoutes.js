// orderRoutes.js
import express from 'express';
import { createOrderController, captureOrderController } from '../controllers/orderController.js';

const router = express.Router();

router.post('/api/orders', createOrderController);
router.post('/api/orders/:orderID/capture', captureOrderController);

export default router;
