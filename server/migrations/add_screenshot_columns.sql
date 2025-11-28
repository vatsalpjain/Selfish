-- Migration: Add screenshot columns to slides table
-- Purpose: Store URLs of canvas screenshots for AI visual context
-- Date: 2025-11-28

-- Add screenshot URL column (stores full-size screenshot)
ALTER TABLE slides 
ADD COLUMN IF NOT EXISTS screenshot_url TEXT;

-- Add screenshot thumbnail URL column (stores smaller preview for performance)
ALTER TABLE slides 
ADD COLUMN IF NOT EXISTS screenshot_thumbnail_url TEXT;

-- Add comments for documentation
COMMENT ON COLUMN slides.screenshot_url IS 'Public URL of canvas screenshot stored in Supabase Storage';
COMMENT ON COLUMN slides.screenshot_thumbnail_url IS 'Public URL of thumbnail version of screenshot (optional)';
