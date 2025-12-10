import express from 'express';
import { handleRevenueCatWebhook } from '../controllers/webhookController.js';
const router = express.Router();

router.post('/revenuecat', handleRevenueCatWebhook);

export default router;
