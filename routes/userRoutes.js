import express from 'express';
import { updateRevenueCatCustomerId } from '../controllers/userController.js';

import { authenticateUser } from '../middleware/auth.js';
const router = express.Router();

// Update user's RevenueCat customer ID
router.patch('/revenuecat-customer-id', authenticateUser, updateRevenueCatCustomerId);

export default router;
