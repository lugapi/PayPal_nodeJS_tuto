// stcRoutes.js
import express from 'express';
import { stcController } from '../controllers/stcController.js';

const router = express.Router();

router.post('/api/stc', stcController);

export default router;
