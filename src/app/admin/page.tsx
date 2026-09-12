import { createClient } from '@/utils/supabase/server'
import AdminDashboardClient from '@/components/AdminDashboardClient'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const supabase = await createClient()

  // Fetch initial data
  const { data: teams } = await supabase.from('teams').select('*').order('created_at', { ascending: true })
  const { data: matches } = await supabase.from('matches').select('*').order('created_at', { ascending: false })

  return (
    <main className="min-h-screen bg-slate-50">
      <AdminDashboardClient 
        initialTeams={teams || []} 
        initialMatches={matches || []} 
      />
    </main>
  )
}
