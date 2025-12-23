import axios from 'axios';

/**
 * RapidAPI YouTube Transcripts Service
 * High-reliability paid fallback for transcript extraction
 * API: https://rapidapi.com/8v2FWW4H6AmKw89/api/youtube-transcripts
 */

const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || 'youtube-transcripts.p.rapidapi.com';
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;

/**
 * Extract video ID from YouTube URL
 */
const extractVideoId = (url) => {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
        /youtube\.com\/embed\/([^&\n?#]+)/,
        /youtube\.com\/v\/([^&\n?#]+)/,
        /youtube\.com\/shorts\/([^&\n?#]+)/,
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }
    return null;
};

/**
 * Get transcript using RapidAPI YouTube Transcripts
 * @param {string} urlOrVideoId - YouTube URL or video ID
 * @param {object} options - Optional configuration
 * @param {boolean} options.text - Return plain text (default: true)
 * @param {number} options.chunkSize - Max characters per chunk (when text=false)
 * @returns {Promise<object>} Transcript data
 */
export const getTranscriptFromRapidAPI = async (urlOrVideoId, options = {}) => {
    if (!RAPIDAPI_KEY) {
        throw new Error('RAPIDAPI_KEY not configured in environment');
    }

    // Determine if input is URL or videoId
    const isUrl = urlOrVideoId.includes('youtube.com') || urlOrVideoId.includes('youtu.be');
    let videoId, url;

    if (isUrl) {
        url = urlOrVideoId;
        videoId = extractVideoId(urlOrVideoId);
        if (!videoId) {
            throw new Error('Invalid YouTube URL format');
        }
    } else {
        videoId = urlOrVideoId;
        url = `https://www.youtube.com/watch?v=${videoId}`;
    }

    const params = {
        url: url,
        text: options.text !== false, // Default to plain text
    };

    if (options.chunkSize && !params.text) {
        params.chunkSize = options.chunkSize;
    }

    try {
        console.log(`[RapidAPI] Fetching transcript for video: ${videoId}`);

        const response = await axios.get('https://youtube-transcripts.p.rapidapi.com/youtube/transcript', {
            params,
            headers: {
                'X-RapidAPI-Host': RAPIDAPI_HOST,
                'X-RapidAPI-Key': RAPIDAPI_KEY,
            },
            timeout: 15000, // 15 seconds
        });

        // Check rate limit headers
        const remainingQuota = response.headers['x-ratelimit-requests-remaining'];
        const quotaLimit = response.headers['x-ratelimit-requests-limit'];
        const resetTime = response.headers['x-ratelimit-requests-reset'];

        if (remainingQuota) {
            console.log(`[RapidAPI] Quota: ${remainingQuota}/${quotaLimit} remaining (resets in ${resetTime}s)`);

            // Warn if approaching limit
            if (parseInt(remainingQuota) < 10) {
                console.warn(`[RapidAPI] ⚠️  WARNING: Only ${remainingQuota} requests remaining!`);
            }
        }

        // Parse response
        if (response.data && response.data.content) {
            const content = response.data.content;

            // If text mode, content should be a string
            if (params.text && typeof content === 'string') {
                console.log(`[RapidAPI] ✅ Success: Retrieved ${content.length} characters`);
                return {
                    text: content,
                    videoId,
                    source: 'rapidapi',
                    quota: {
                        remaining: remainingQuota,
                        limit: quotaLimit,
                        reset: resetTime,
                    },
                };
            }

            // If chunked mode, content should be an array
            if (!params.text && Array.isArray(content)) {
                const text = content.map(chunk => chunk.text || '').join(' ');
                console.log(`[RapidAPI] ✅ Success: Retrieved ${content.length} chunks (${text.length} chars)`);
                return {
                    text,
                    chunks: content,
                    videoId,
                    source: 'rapidapi',
                    quota: {
                        remaining: remainingQuota,
                        limit: quotaLimit,
                        reset: resetTime,
                    },
                };
            }

            // Unexpected format
            throw new Error('Unexpected response format from RapidAPI');
        }

        // Check for error in response
        if (response.data && response.data.error) {
            throw new Error(response.data.error);
        }

        throw new Error('Empty response from RapidAPI');

    } catch (error) {
        // Handle specific error cases
        if (error.response) {
            const status = error.response.status;
            const data = error.response.data;

            // Rate limit exceeded
            if (status === 429) {
                console.error('[RapidAPI] ❌ Rate limit exceeded (429)');
                throw new Error('RATE_LIMITED: RapidAPI quota exceeded. Please try again later.');
            }

            // Missing or invalid parameters
            if (status === 400) {
                console.error('[RapidAPI] ❌ Bad request (400):', data.error || data.message);
                throw new Error(data.error || data.message || 'Invalid request parameters');
            }

            // Server error
            if (status >= 500) {
                console.error('[RapidAPI] ❌ Server error:', status);
                throw new Error('RapidAPI server error. Please try again later.');
            }

            // Other errors
            console.error('[RapidAPI] ❌ Request failed:', status, data);
            throw new Error(data.error || data.message || `RapidAPI error: ${status}`);
        }

        // Network or timeout errors
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
            console.error('[RapidAPI] ❌ Timeout');
            throw new Error('RapidAPI request timeout. Please try again.');
        }

        // Re-throw with context
        console.error('[RapidAPI] ❌ Unexpected error:', error.message);
        throw error;
    }
};

export default {
    getTranscriptFromRapidAPI,
};
