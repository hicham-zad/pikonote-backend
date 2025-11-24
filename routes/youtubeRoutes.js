import express from 'express';
import { getTranscript } from '../controllers/youtubeController.js';
import * as youtubeContentController from '../controllers/youtubeContentController.js';
import { authenticateUser } from '../middleware/supabaseAuth.js';

const router = express.Router();

// Define a POST route to process the URL
// Example: POST /api/youtube/transcript
router.post('/transcript', getTranscript);

// Generate AI content from YouTube URL
// POST /api/youtube/generate
router.post('/generate', authenticateUser, youtubeContentController.generateContent);

// Check generation status
// GET /api/youtube/status/:requestId
router.get('/status/:requestId', authenticateUser, youtubeContentController.getGenerationStatus);

export default router;