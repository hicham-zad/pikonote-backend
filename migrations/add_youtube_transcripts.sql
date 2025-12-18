-- YouTube Transcripts Table
-- Stores transcripts extracted client-side from YouTube videos

CREATE TABLE IF NOT EXISTS youtube_transcripts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    video_id VARCHAR(20) NOT NULL,
    video_url TEXT NOT NULL,
    transcript TEXT NOT NULL,
    title VARCHAR(500),
    language VARCHAR(10) DEFAULT 'en',
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique constraint for video_id + user_id combination
CREATE UNIQUE INDEX IF NOT EXISTS idx_youtube_transcripts_video_user 
ON youtube_transcripts(video_id, user_id);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_youtube_transcripts_video_id 
ON youtube_transcripts(video_id);

CREATE INDEX IF NOT EXISTS idx_youtube_transcripts_user_id 
ON youtube_transcripts(user_id);

CREATE INDEX IF NOT EXISTS idx_youtube_transcripts_created_at 
ON youtube_transcripts(created_at DESC);

-- Enable Row Level Security
ALTER TABLE youtube_transcripts ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can only view their own transcripts
CREATE POLICY "Users can view own transcripts"
    ON youtube_transcripts FOR SELECT
    USING (auth.uid() = user_id);

-- Users can only insert their own transcripts
CREATE POLICY "Users can insert own transcripts"
    ON youtube_transcripts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own transcripts
CREATE POLICY "Users can update own transcripts"
    ON youtube_transcripts FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own transcripts
CREATE POLICY "Users can delete own transcripts"
    ON youtube_transcripts FOR DELETE
    USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_youtube_transcripts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function on updates
DROP TRIGGER IF EXISTS trigger_youtube_transcripts_updated_at ON youtube_transcripts;
CREATE TRIGGER trigger_youtube_transcripts_updated_at
    BEFORE UPDATE ON youtube_transcripts
    FOR EACH ROW
    EXECUTE FUNCTION update_youtube_transcripts_updated_at();
