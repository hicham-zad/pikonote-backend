import { extractYouTubeTranscript, extractVideoId } from '../services/youtubeService.js';
import aiService from '../services/aiService.js';
import supabaseService from '../services/supabaseService.js';

// Submit YouTube URL and start generation
export const generateContent = async (req, res) => {
    try {
        const userId = req.user.id;
        const { url, difficulty = 'medium' } = req.body;

        console.log(`[YT_REQUEST] Received URL - userId: ${userId}`);

        // 1. Validate URL
        if (!url) {
            return res.status(400).json({ error: 'YouTube URL is required' });
        }

        let videoId;
        try {
            videoId = extractVideoId(url);
            console.log(`[YT_VALIDATE] Validating YouTube URL - valid: true, videoId: ${videoId}`);
        } catch (error) {
            console.log(`[YT_VALIDATE] Validating YouTube URL - valid: false`);
            return res.status(400).json({ error: 'Invalid YouTube URL' });
        }

        // 2. Extract Transcript
        console.log(`[YT_EXTRACT] Fetching transcript - videoId: ${videoId}`);
        let transcriptData;
        try {
            transcriptData = await extractYouTubeTranscript(url);
            console.log(`[YT_TRANSCRIPT] Transcript extracted - length: ${transcriptData.text.length} chars, duration: ${transcriptData.duration}s`);
        } catch (error) {
            console.error(`[ERROR] Failed at step EXTRACT - reason: ${error.message}`);
            return res.status(400).json({ error: 'Failed to fetch transcript. Video might be private or have no subtitles.' });
        }

        const { text, title } = transcriptData;

        if (text.length > 50000) {
            return res.status(400).json({ error: 'Transcript too long. Maximum 50,000 characters.' });
        }

        if (text.length < 50) {
            return res.status(400).json({ error: 'Transcript too short. Minimum 50 characters.' });
        }

        // 3. Create Request (Topic)
        const topic = await supabaseService.createTopic({
            userId,
            title: title || `YouTube: ${videoId}`,
            type: 'youtube',
            status: 'processing',
            progress: 0,
            difficulty,
            createdAt: new Date().toISOString()
        });

        const requestId = topic.id;
        console.log(`[AI_REQUEST] Creating generation request - type: youtube, requestId: ${requestId}`);

        // 4. Start Async Processing
        processYoutubeContent(requestId, text, difficulty);

        // 5. Return Response
        res.status(201).json({
            success: true,
            requestId,
            message: 'YouTube URL accepted and generation started',
            status: 'processing'
        });

    } catch (error) {
        console.error(`[ERROR] Failed at step REQUEST - reason: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
};

// Check generation status (Reusing logic from PdfContentController, could be shared but keeping separate for now)
export const getGenerationStatus = async (req, res) => {
    try {
        const { requestId } = req.params;
        const userId = req.user.id;

        const topic = await supabaseService.getTopicById(requestId);

        if (!topic) {
            return res.status(404).json({ error: 'Request not found' });
        }

        if (topic.userId !== userId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const response = {
            requestId: topic.id,
            status: topic.status,
            progress: topic.progress
        };

        if (topic.status === 'completed') {
            response.content = {
                summary: topic.summary,
                quiz: topic.quiz,
                flashcards: topic.flashcards,
                mindMap: topic.mindMap
            };
        } else if (topic.status === 'failed') {
            response.error = topic.error;
        }

        res.json(response);

    } catch (error) {
        console.error(`[ERROR] Failed to get status - reason: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
};

// Async processing function
async function processYoutubeContent(requestId, text, difficulty) {
    try {
        console.log(`[AI_PROCESSING] Starting AI generation - requestId: ${requestId}`);

        await supabaseService.updateTopicStatus(requestId, 'processing');
        await supabaseService.updateProgress(requestId, 10);

        // Generate content
        const processedContent = await aiService.generateContent(text, difficulty);

        await supabaseService.updateProgress(requestId, 90);

        // Save result
        await supabaseService.saveProcessedContent(requestId, processedContent);

        console.log(`[AI_COMPLETE] Generation finished - requestId: ${requestId}, status: completed`);

    } catch (error) {
        console.error(`[ERROR] Failed at step AI_GENERATION - reason: ${error.message}`);

        await supabaseService.updateTopicStatus(requestId, 'failed', {
            error: error.message
        });
    }
}
