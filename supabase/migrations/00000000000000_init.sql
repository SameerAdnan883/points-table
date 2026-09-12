-- Create teams table
create table teams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  logo_url text,
  created_at timestamptz default now()
);

-- Create matches table
create type match_result as enum ('team1_win', 'team2_win', 'tie', 'no_result');

create table matches (
  id uuid primary key default gen_random_uuid(),
  match_date date not null,
  overs_limit numeric not null,
  
  team1_id uuid not null references teams(id) on delete cascade,
  team2_id uuid not null references teams(id) on delete cascade,
  
  team1_runs integer,
  team1_wickets integer,
  team1_overs numeric,
  
  team2_runs integer,
  team2_wickets integer,
  team2_overs numeric,
  
  batting_first_id uuid not null references teams(id) on delete cascade,
  result match_result not null,
  winner_id uuid references teams(id) on delete cascade,
  
  created_at timestamptz default now(),
  
  check (team1_id != team2_id),
  check (batting_first_id in (team1_id, team2_id))
);

-- Enable RLS
alter table teams enable row level security;
alter table matches enable row level security;

-- Policies for teams
create policy "Teams are viewable by everyone" on teams
  for select using (true);

create policy "Teams are insertable by authenticated users only" on teams
  for insert with check (auth.role() = 'authenticated');

create policy "Teams are updatable by authenticated users only" on teams
  for update using (auth.role() = 'authenticated');

create policy "Teams are deletable by authenticated users only" on teams
  for delete using (auth.role() = 'authenticated');

-- Policies for matches
create policy "Matches are viewable by everyone" on matches
  for select using (true);

create policy "Matches are insertable by authenticated users only" on matches
  for insert with check (auth.role() = 'authenticated');

create policy "Matches are updatable by authenticated users only" on matches
  for update using (auth.role() = 'authenticated');

create policy "Matches are deletable by authenticated users only" on matches
  for delete using (auth.role() = 'authenticated');

-- Realtime Setup
-- Add to the publication for realtime
alter publication supabase_realtime add table matches;
alter publication supabase_realtime add table teams;

-- Make sure REPLICA IDENTITY is full for matches so we get the old row in DELETE/UPDATE payloads
alter table matches replica identity full;
alter table teams replica identity full;
