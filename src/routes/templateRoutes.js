// templateRoutes.js
import express from 'express';
import { renderHome, renderShortcut, renderVault } from '../controllers/templateController.js';

const router = express.Router();

router.get('/', renderHome);
router.get('/shortcut', renderShortcut);
router.get('/vault', renderVault);

export default router;
