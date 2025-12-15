import { YoutubeTranscript } from '@danielxceron/youtube-transcript';
import { Innertube } from 'youtubei.js';

let youtubeClient = null;

const getYoutubeClient = async () => {
  if (!youtubeClient) {
    youtubeClient = await Innertube.create();
  }
  return youtubeClient;
};

export const extractYouTubeTranscript = async (url) => {
  const videoId = extractVideoId(url);
  console.log(`🎥 Attempting to extract transcript for video ID: ${videoId}`);
  console.log(`📺 Full URL: ${url}`);

  try {
    // Strategy 1: Fast Scraper (youtube-transcript)
    console.log('⚡️ Strategy 1: Attempting fast scraper...');
    const transcriptData = await YoutubeTranscript.fetchTranscript(videoId);

    if (transcriptData && transcriptData.length > 0) {
      console.log(`✅ Strategy 1 success! Segments: ${transcriptData.length}`);
      const text = transcriptData.map(segment => segment.text).join(' ');
      return {
        text,
        title: `YouTube Video ${videoId}`,
        duration: null,
        videoId
      };
    }
  } catch (error) {
    console.warn(`⚠️ Strategy 1 failed: ${error.message}`);
    // Fall through to strategy 2
  }

  try {
    // Strategy 2: Robust Client (youtubei.js)
    console.log('🛡️ Strategy 2: Attempting robust client (InnerTube)...');
    const youtube = await getYoutubeClient();
    const info = await youtube.getInfo(videoId);
    const transcriptData = await info.getTranscript();

    if (transcriptData && transcriptData.transcript?.content?.body?.initial_segments) {
      console.log('✅ Strategy 2 success!');

      const segments = transcriptData.transcript.content.body.initial_segments;
      const text = segments
        .map(segment => segment.snippet.text)
        .join(' ');

      return {
        text,
        title: info.basic_info.title || `YouTube Video ${videoId}`,
        duration: info.basic_info.duration || null,
        videoId
      };
    } else {
      throw new Error('No transcript data found in robust client response');
    }

  } catch (error) {
    console.error('❌ Strategy 2 failed:', error.message);

    // Final Error Handling
    const isCaptionsError = error.message.includes('No transcript') ||
      error.message.includes('disabled') ||
      error.message.includes('not available');

    if (isCaptionsError) {
      throw new Error('No transcript available for this video. Please ensure the video has captions enabled.');
    }

    throw new Error('Unable to extract transcript. Please try another video.');
  }
};

// Helper to extract video ID from various YouTube URL formats
export const extractVideoId = (url) => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/, // Support YouTube Shorts
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  throw new Error('Invalid YouTube URL');
};