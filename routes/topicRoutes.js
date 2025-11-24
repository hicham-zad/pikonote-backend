import express from 'express';
import * as topicController from '../controllers/topicController.js';
import { authenticateUser } from '../middleware/supabaseAuth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateUser);

// Topic routes
router.post('/topics', topicController.createTopic);
router.get('/topics', topicController.getUserTopics);
router.get('/topics/:topicId', topicController.getTopic);
router.delete('/topics/:topicId', topicController.deleteTopic);

// Device token routes
router.post('/device-token', topicController.storeDeviceToken);
router.delete('/device-token', topicController.removeDeviceToken);

// Add this route
router.get('/topics/:topicId/html', topicController.getTopicHTML);
router.get('/topics/:topicId/download-pdf', topicController.downloadTopicPDF);

export default router;