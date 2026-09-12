import { createClient } from '@/utils/supabase/server'
import AdminDashboardClient from '@/components/AdminDashboardClient'
import { TournamentSettings } from '@/lib/cricket-math'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const supabase = await createClient()

  // Fetch initial data
  const { data: teams } = await supabase.from('teams').select('*').order('created_at', { ascending: true })
  const { data: matches } = await supabase.from('matches').select('*').order('created_at', { ascending: false })
  
  const { data: settingsData } = await supabase.from('tournament_settings').select('*').eq('id', 1).single()
  const settings: TournamentSettings = settingsData || {
    id: 1,
    name: 'Cricket League',
    subtitle: 'Official Points Table',
    default_overs: 20,
    players_per_team: 11,
    updated_at: new Date().toISOString()
  }

  return (
    <main className="min-h-screen bg-[#020617] relative overflow-hidden">
      {/* Cinematic Stadium Lighting */}
      <div className="absolute top-0 left-0 w-[800px] h-[800px] bg-fuchsia-600/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[800px] h-[800px] bg-cyan-500/10 blur-[150px] rounded-full pointer-events-none" />
      
      <div className="relative z-10">
        <AdminDashboardClient 
          initialTeams={teams || []} 
          initialMatches={matches || []} 
          initialSettings={settings}
        />
      </div>
    </main>
  )
}

