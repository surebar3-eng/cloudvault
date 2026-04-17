-- Run this script in your Supabase SQL Editor to set up the database.

-- 1. Create the files table
CREATE TABLE files (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  "ownerUid" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  size BIGINT DEFAULT 0,
  type TEXT,
  url TEXT NOT NULL,
  "createdAt" BIGINT NOT NULL,
  "isStarred" BOOLEAN DEFAULT false,
  "isTrashed" BOOLEAN DEFAULT false,
  "parentId" TEXT
);

-- 2. Setup RLS (Row Level Security) for the files table
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only insert their own files"
ON files FOR INSERT WITH CHECK (auth.uid() = "ownerUid");

CREATE POLICY "Users can view their own files"
ON files FOR SELECT USING (auth.uid() = "ownerUid");

CREATE POLICY "Users can update their own files"
ON files FOR UPDATE USING (auth.uid() = "ownerUid");

CREATE POLICY "Users can delete their own files"
ON files FOR DELETE USING (auth.uid() = "ownerUid");

-- 3. Set up Storage bucket
-- Note: You can also create the "vault" bucket manually from the Supabase Dashboard UI
INSERT INTO storage.buckets (id, name, public) 
VALUES ('vault', 'vault', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for the "vault" bucket
CREATE POLICY "Users can upload their own files" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'vault' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own files" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'vault' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own files" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'vault' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own files" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'vault' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add public read access if you want files to be easily accessible via url
CREATE POLICY "Public read access for files" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'vault');
