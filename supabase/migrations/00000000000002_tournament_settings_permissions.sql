-- 1. Grant table privileges to authenticated users to fix the permission denied error
GRANT SELECT ON public.tournament_settings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.tournament_settings TO authenticated;

-- 2. Add Match Format settings columns
ALTER TABLE public.tournament_settings 
ADD COLUMN IF NOT EXISTS default_overs numeric NOT NULL DEFAULT 20;

ALTER TABLE public.tournament_settings 
ADD COLUMN IF NOT EXISTS players_per_team integer NOT NULL DEFAULT 11;
