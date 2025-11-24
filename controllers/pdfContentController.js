import pdfService from '../services/pdfService.js';
import aiService from '../services/aiService.js';
import supabaseService from '../services/supabaseService.js';

// Upload PDF and start generation
export const uploadAndGenerate = async (req, res) => {
    try {
        const userId = req.user.id;
        const { difficulty = 'medium' } = req.body;

        // 1. Validate File
        if (!req.file) {
            return res.status(400).json({ error: 'No PDF file uploaded' });
        }

        console.log(`[PDF_UPLOAD] Starting upload - fileSize: ${req.file.size}, userId: ${userId}`);

        if (req.file.size > 10 * 1024 * 1024) {
            return res.status(400).json({ error: 'File too large. Maximum 10MB.' });
        }

        if (req.file.mimetype !== 'application/pdf') {
            return res.status(400).json({ error: 'Invalid file type. Only PDF allowed.' });
        }

        // 2. Extract Text
        let text;
        try {
            text = await pdfService.extractTextFromBuffer(req.file.buffer);
            console.log(`[PDF_EXTRACT] Extracting content - chars: ${text.length}`);
        } catch (error) {
            console.error(`[ERROR] Failed at step EXTRACT - reason: ${error.message}`);
            return res.status(400).json({ error: 'Failed to extract text from PDF' });
        }

        if (text.length > 50000) {
            return res.status(400).json({ error: 'Content too long. Maximum 50,000 characters.' });
        }

        if (text.length < 50) {
            return res.status(400).json({ error: 'Content too short. Minimum 50 characters.' });
        }

        // 3. Create Request (Topic)
        const topic = await supabaseService.createTopic({
            userId,
            title: req.file.originalname.replace('.pdf', ''),
            type: 'pdf',
            status: 'processing', // DB constraint requires 'processing', 'completed', or 'failed'
            progress: 0,
            difficulty,
            createdAt: new Date().toISOString()
        });

        const requestId = topic.id;
        console.log(`[AI_REQUEST] Creating generation request - type: pdf, requestId: ${requestId}`);

        // 4. Start Async Processing
        processPdfContent(requestId, text, difficulty);

        // 5. Return Response
        res.status(201).json({
            success: true,
            requestId,
            message: 'PDF uploaded and generation started',
            status: 'processing'
        });

    } catch (error) {
        console.error(`[ERROR] Failed at step UPLOAD - reason: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
};

// Check generation status
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
            response.error = topic.error; // Assuming error is stored in topic (needs schema check, but topicController implies it might be)
        }

        res.json(response);

    } catch (error) {
        console.error(`[ERROR] Failed to get status - reason: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
};

// Async processing function
async function processPdfContent(requestId, text, difficulty) {
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
