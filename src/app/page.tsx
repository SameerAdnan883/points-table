import { createClient } from '@/utils/supabase/server'
import StandingsTable from '@/components/StandingsTable'
import Sidebar from '@/components/Sidebar'
import { TournamentSettings } from '@/lib/cricket-math'

export const dynamic = 'force-dynamic'

export default async function PublicPage() {
  const supabase = await createClient()

  // Fetch initial data
  const { data: teams } = await supabase.from('teams').select('*')
  const { data: matches } = await supabase.from('matches').select('*')
  
  // Try to fetch settings, default if not found
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
    <main className="min-h-screen bg-[#020617] relative overflow-hidden flex flex-col lg:flex-row">
      <Sidebar />
      <div className="flex-1 flex flex-col w-full">
        {/* Cinematic Stadium Lighting */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-fuchsia-600/10 blur-[150px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-cyan-500/10 blur-[150px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 flex-1 p-4 lg:p-8 pt-20 lg:pt-8 overflow-y-auto">
          <StandingsTable 
            initialTeams={teams || []} 
            initialMatches={matches || []} 
            settings={settings}
          />
        </div>
      </div>
    </main>
  )
}
