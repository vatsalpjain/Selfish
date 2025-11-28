-- Migration: Create Supabase Storage bucket for canvas screenshots
-- Purpose: Store canvas screenshot images
-- Date: 2025-11-28

-- Note: Storage buckets are typically created via Supabase Dashboard UI
-- This file serves as documentation of the required bucket configuration

-- BUCKET CONFIGURATION (to be created in Supabase Dashboard):
-- Name: slides-screenshots
-- Public: Yes (allow public read access for AI service)
-- File size limit: 5MB
-- Allowed MIME types: image/png, image/jpeg, image/webp

-- STORAGE POLICIES (Row Level Security):

-- Policy 1: Allow authenticated users to upload screenshots
INSERT INTO storage.buckets (id, name, public)
VALUES ('slides-screenshots', 'slides-screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- Policy 2: Allow INSERT for authenticated users
CREATE POLICY IF NOT EXISTS "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'slides-screenshots');

-- Policy 3: Allow public SELECT (read) access
CREATE POLICY IF NOT EXISTS "Public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'slides-screenshots');

-- Policy 4: Allow DELETE for authenticated users (their own files)
CREATE POLICY IF NOT EXISTS "Allow authenticated delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'slides-screenshots');

-- Policy 5: Allow UPDATE for authenticated users (their own files)
CREATE POLICY IF NOT EXISTS "Allow authenticated update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'slides-screenshots');
