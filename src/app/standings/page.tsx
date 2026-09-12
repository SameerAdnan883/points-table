import { createClient } from '@/utils/supabase/server'
import StandingsTable from '@/components/StandingsTable'

export const dynamic = 'force-dynamic'

export default async function StandingsPage() {
  const supabase = await createClient()

  // Fetch initial data
  const { data: teams } = await supabase.from('teams').select('*')
  const { data: matches } = await supabase.from('matches').select('*')

  return (
    <main className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden flex-1 flex flex-col">
      {/* Decorative background effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-cyan-500/10 blur-[120px] rounded-full pointer-events-none" />
      
      <StandingsTable 
        initialTeams={teams || []} 
        initialMatches={matches || []} 
      />
    </main>
  )
}
