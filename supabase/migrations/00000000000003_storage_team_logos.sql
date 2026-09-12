-- 1. Insert the "team-logos" bucket into the storage.buckets table
INSERT INTO storage.buckets (id, name, public) 
VALUES ('team-logos', 'team-logos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Grant public read access to the team-logos bucket
CREATE POLICY "Public Read Access for Team Logos" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'team-logos');

-- 3. Grant authenticated users permission to upload to the team-logos bucket
CREATE POLICY "Authenticated users can upload logos" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'team-logos' AND 
  auth.role() = 'authenticated'
);

-- 4. Grant authenticated users permission to update their logos
CREATE POLICY "Authenticated users can update logos" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'team-logos' AND 
  auth.role() = 'authenticated'
);

-- 5. Grant authenticated users permission to delete logos
CREATE POLICY "Authenticated users can delete logos" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'team-logos' AND 
  auth.role() = 'authenticated'
);
