-- Add RevenueCat Customer ID Tracking
-- Run this in Supabase SQL Editor

-- Add revenuecat_customer_id column to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS revenuecat_customer_id TEXT;

-- Create index for faster lookups by RevenueCat customer ID
CREATE INDEX IF NOT EXISTS idx_user_profiles_revenuecat_customer_id 
ON user_profiles(revenuecat_customer_id);

-- Add comment to explain the column
COMMENT ON COLUMN user_profiles.revenuecat_customer_id IS 
'The app_user_id from RevenueCat. This is the ID used to identify customers in RevenueCat dashboard and webhooks.';

-- Migration complete!
-- Users can now be tracked by their RevenueCat customer ID
