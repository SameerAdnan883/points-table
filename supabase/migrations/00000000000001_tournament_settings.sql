-- Create tournament_settings table
CREATE TABLE tournament_settings (
  id int PRIMARY KEY DEFAULT 1,
  name text NOT NULL DEFAULT 'Cricket League',
  subtitle text NOT NULL DEFAULT 'Official Points Table',
  updated_at timestamptz DEFAULT now(),
  CHECK (id = 1)
);

-- Insert the default single row
INSERT INTO tournament_settings (id, name, subtitle) VALUES (1, 'Cricket League', 'Official Points Table');

-- Enable RLS
ALTER TABLE tournament_settings ENABLE ROW LEVEL SECURITY;

-- Public can read
CREATE POLICY "Tournament settings are viewable by everyone" ON tournament_settings
  FOR SELECT USING (true);

-- Authenticated admins can update
CREATE POLICY "Tournament settings are updatable by authenticated users only" ON tournament_settings
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Authenticated admins can insert
CREATE POLICY "Tournament settings are insertable by authenticated users only" ON tournament_settings
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Add to Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE tournament_settings;
ALTER TABLE tournament_settings REPLICA IDENTITY FULL;
