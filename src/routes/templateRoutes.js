// templateRoutes.js
import express from 'express';
import { renderShortcut, renderVault } from '../controllers/templateController.js';

const router = express.Router();

router.get('/shortcut', renderShortcut);
router.get('/vault', renderVault);

export default router;
