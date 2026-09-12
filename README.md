# Live Cricket Points Table

A real-time cricket tournament points table built with Next.js (App Router), Tailwind CSS, and Supabase.

## Features

- **Real-time Public Points Table:** Viewers see updates instantly without refreshing when matches are added.
- **ICC Standard NRR Math:** Correctly implements Net Run Rate calculations, including the "all out" rule where overs faced equals the full match overs limit.
- **Admin Dashboard:** Secure login for tournament organizers to enter match results and manage teams.
- **Supabase Backend:** Uses PostgreSQL with Row Level Security (RLS) for data integrity and Realtime subscriptions.
- **Vercel Ready:** Designed to be easily deployed on Vercel's free tier.

## Setup Instructions

### 1. Supabase Setup

1. Create a new project on [Supabase](https://supabase.com).
2. Go to **SQL Editor** in your Supabase dashboard.
3. Open `supabase/migrations/00000000000000_init.sql` from this repository, paste the contents into the SQL Editor, and run it. This will create the `teams` and `matches` tables, setup RLS policies, and configure Realtime.
4. Go to **Authentication** > **Providers** in Supabase and ensure Email provider is enabled.
5. Go to **Authentication** > **Users** and create a new user with an email and password. This will be your admin account for logging into the dashboard.

### 2. Environment Variables

Create a `.env.local` file in the root of the project:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

You can find these values in your Supabase Dashboard under **Settings** > **API**.

### 3. Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the public table.
Navigate to [http://localhost:3000/admin](http://localhost:3000/admin) to log in and manage the tournament.

### 4. Deployment to Vercel

1. Push your code to a GitHub repository.
2. Go to [Vercel](https://vercel.com) and import the repository.
3. Add the two environment variables (`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`) in the Vercel deployment settings.
4. Deploy!

## Tech Stack

- **Frontend:** Next.js 14 (App Router), React, Tailwind CSS, Lucide Icons
- **Backend:** Supabase (PostgreSQL, Auth, Realtime)
- **Deployment:** Vercel

## NRR Calculation Note

Net Run Rate (NRR) is calculated as:
`(Total runs scored / Total overs faced) - (Total runs conceded / Total overs bowled)`

If a team is bowled out (10 wickets) before facing their full quota of overs, their "overs faced" for that match is considered to be the maximum possible overs (e.g., 20 overs in a T20), in accordance with standard cricket laws.
