import supabase from '../config/supabase.js';

/**
 * Validates a YouTube URL and extracts Video ID
 * This endpoint does NOT fetch anything from YouTube
 */
export const validateUrl = async (req, res) => {
    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({
                valid: false,
                error: 'YouTube URL is required'
            });
        }

        // Extract video ID from various URL formats
        const videoId = extractVideoId(url);

        if (!videoId) {
            return res.status(400).json({
                valid: false,
                error: 'Invalid YouTube URL format'
            });
        }

        // Validate video ID format (11 characters, alphanumeric + hyphen/underscore)
        if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
            return res.status(400).json({
                valid: false,
                error: 'Invalid video ID format'
            });
        }

        res.json({
            valid: true,
            videoId,
            captionUrl: `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en`
        });

    } catch (error) {
        console.error('[YOUTUBE_VALIDATE] Error:', error.message);
        res.status(500).json({
            valid: false,
            error: 'Validation failed'
        });
    }
};

/**
 * Save transcript from client-side extraction
 */
export const saveTranscript = async (req, res) => {
    try {
        const userId = req.user.id;
        const { videoId, videoUrl, transcript, title, language = 'en' } = req.body;

        // Validate required fields
        if (!videoId || !videoUrl || !transcript) {
            return res.status(400).json({
                success: false,
                error: 'videoId, videoUrl, and transcript are required'
            });
        }

        // Validate transcript length
        if (transcript.length < 50) {
            return res.status(400).json({
                success: false,
                error: 'Transcript too short. Minimum 50 characters.'
            });
        }

        if (transcript.length > 100000) {
            return res.status(400).json({
                success: false,
                error: 'Transcript too long. Maximum 100,000 characters.'
            });
        }

        // Upsert transcript (update if already exists)
        const { data, error } = await supabase
            .from('youtube_transcripts')
            .upsert({
                video_id: videoId,
                video_url: videoUrl,
                transcript,
                title: title || `YouTube Video ${videoId}`,
                language,
                user_id: userId,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'video_id,user_id'
            })
            .select()
            .single();

        if (error) {
            console.error('[YOUTUBE_SAVE] Database error:', error);
            throw error;
        }

        console.log(`[YOUTUBE_SAVE] Transcript saved for video ${videoId} by user ${userId}`);

        res.json({
            success: true,
            transcriptId: data.id,
            videoId: data.video_id
        });

    } catch (error) {
        console.error('[YOUTUBE_SAVE] Error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to save transcript'
        });
    }
};

/**
 * Get saved transcript by video ID
 */
export const getTranscript = async (req, res) => {
    try {
        const userId = req.user.id;
        const { videoId } = req.params;

        if (!videoId) {
            return res.status(400).json({
                success: false,
                error: 'Video ID is required'
            });
        }

        const { data, error } = await supabase
            .from('youtube_transcripts')
            .select('*')
            .eq('video_id', videoId)
            .eq('user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
            throw error;
        }

        if (!data) {
            return res.status(404).json({
                success: false,
                error: 'Transcript not found'
            });
        }

        res.json({
            success: true,
            transcript: data.transcript,
            title: data.title,
            videoId: data.video_id,
            language: data.language,
            createdAt: data.created_at
        });

    } catch (error) {
        console.error('[YOUTUBE_GET] Error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve transcript'
        });
    }
};

/**
 * Get user's saved transcripts (list)
 */
export const getUserTranscripts = async (req, res) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        const { data, count, error } = await supabase
            .from('youtube_transcripts')
            .select('id, video_id, title, language, created_at', { count: 'exact' })
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) throw error;

        res.json({
            success: true,
            transcripts: data,
            total: count,
            page,
            limit
        });

    } catch (error) {
        console.error('[YOUTUBE_LIST] Error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve transcripts'
        });
    }
};

// Helper function to extract video ID
function extractVideoId(url) {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
        /youtube\.com\/embed\/([^&\n?#]+)/,
        /youtube\.com\/shorts\/([^&\n?#]+)/,
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }

    return null;
}
