import { createClient } from '@/utils/supabase/server'
import StandingsTable from '@/components/StandingsTable'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const supabase = await createClient()

  // Fetch initial data
  const { data: teams } = await supabase.from('teams').select('*')
  const { data: matches } = await supabase.from('matches').select('*')

  return (
    <main className="min-h-screen bg-slate-50 py-12">
      <StandingsTable 
        initialTeams={teams || []} 
        initialMatches={matches || []} 
      />
    </main>
  )
}
