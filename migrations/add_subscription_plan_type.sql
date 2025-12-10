-- Add subscription plan type columns to user_profiles table
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS subscription_plan_type TEXT,
ADD COLUMN IF NOT EXISTS product_identifier TEXT;

-- Add comment for documentation
COMMENT ON COLUMN user_profiles.subscription_plan_type IS 'Type of subscription plan: weekly, monthly, yearly';
COMMENT ON COLUMN user_profiles.product_identifier IS 'RevenueCat product identifier (e.g., pikonote.weekly.unlimited)';
