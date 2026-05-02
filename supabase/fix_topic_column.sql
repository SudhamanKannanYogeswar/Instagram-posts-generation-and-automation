-- Run this in Supabase SQL Editor to fix the VARCHAR(255) limit on topic fields
-- This allows longer topics from Instagram URL mode and enriched prompts

ALTER TABLE generated_content ALTER COLUMN topic TYPE TEXT;
ALTER TABLE content_requests ALTER COLUMN input_topic TYPE TEXT;

-- Verify
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name IN ('generated_content', 'content_requests')
  AND column_name IN ('topic', 'input_topic');
