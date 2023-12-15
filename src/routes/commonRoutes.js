// stcRoutes.js
import express from 'express';
import { generateAccessTokenVault } from '../controllers/common.js';

const router = express.Router();

router.post('/api/generateTokenVault', generateAccessTokenVault);

export default router;
