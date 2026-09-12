-- Add layout mode to tournament_settings (preserves the setting across resets)
ALTER TABLE public.tournament_settings 
ADD COLUMN IF NOT EXISTS layout_mode text NOT NULL DEFAULT 'single'
CHECK (layout_mode IN ('single', 'split'));

-- Add group assignment to teams (deleted automatically if a team is deleted)
ALTER TABLE public.teams 
ADD COLUMN IF NOT EXISTS group_id integer NOT NULL DEFAULT 1
CHECK (group_id IN (1, 2));
