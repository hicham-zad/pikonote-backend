import { Innertube } from 'youtubei.js';

export const extractYouTubeTranscript = async (url) => {
  const youtube = await Innertube.create();
  const videoId = extractVideoId(url);

  const info = await youtube.getInfo(videoId);
  const transcriptData = await info.getTranscript();

  const text = transcriptData.transcript.content.body.initial_segments
    .map(segment => segment.snippet.text)
    .join(' ');

  return {
    text,
    title: info.basic_info.title,
    duration: info.basic_info.duration,
    videoId
  };
};

// Helper to extract video ID from various YouTube URL formats
export const extractVideoId = (url) => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  throw new Error('Invalid YouTube URL');
};