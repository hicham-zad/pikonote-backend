import { extractYouTubeTranscript } from '../services/youtubeService.js'; // Note the .js extension!

/**
 * Express Controller to handle the transcript request.
 */
export const getTranscript = async (req, res) => {
  // Assuming the URL is sent in the request body
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({
      success: false,
      message: 'YouTube URL is required in the request body.'
    });
  }

  try {
    const { text, title, duration } = await extractYouTubeTranscript(url);

    res.status(200).json({
      success: true,
      url: url,
      transcript: text,
      metadata: { title, duration }
    });
  } catch (error) {
    // This catches errors thrown by extractYouTubeTranscript
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};