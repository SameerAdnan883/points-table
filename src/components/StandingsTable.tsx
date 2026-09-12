'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Team, Match, calculateStandings, TeamStanding } from '@/lib/cricket-math'
import { Trophy, Activity } from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export default function StandingsTable({
  initialTeams,
  initialMatches,
}: {
  initialTeams: Team[]
  initialMatches: Match[]
}) {
  const [teams, setTeams] = useState<Team[]>(initialTeams)
  const [matches, setMatches] = useState<Match[]>(initialMatches)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [isConnected, setIsConnected] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    // Realtime subscription
    const channel = supabase
      .channel('public_table')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'matches' },
        (payload: any) => {
          setLastUpdated(new Date())
          if (payload.eventType === 'INSERT') {
            setMatches((prev) => [...prev, payload.new as Match])
          } else if (payload.eventType === 'UPDATE') {
            setMatches((prev) =>
              prev.map((m) => (m.id === payload.new.id ? (payload.new as Match) : m))
            )
          } else if (payload.eventType === 'DELETE') {
            setMatches((prev) => prev.filter((m) => m.id !== payload.old.id))
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'teams' },
        (payload: any) => {
          setLastUpdated(new Date())
          if (payload.eventType === 'INSERT') {
            setTeams((prev) => [...prev, payload.new as Team])
          } else if (payload.eventType === 'UPDATE') {
            setTeams((prev) =>
              prev.map((t) => (t.id === payload.new.id ? (payload.new as Team) : t))
            )
          } else if (payload.eventType === 'DELETE') {
            setTeams((prev) => prev.filter((t) => t.id !== payload.old.id))
          }
        }
      )
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true)
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsConnected(false)
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  const standings = useMemo(() => calculateStandings(teams, matches), [teams, matches])
  const recentMatches = useMemo(() => {
    return [...matches]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
  }, [matches])

  // Formatting for last updated
  const [timeAgo, setTimeAgo] = useState('just now')
  useEffect(() => {
    const interval = setInterval(() => {
      const seconds = Math.floor((new Date().getTime() - lastUpdated.getTime()) / 1000)
      if (seconds < 5) setTimeAgo('just now')
      else if (seconds < 60) setTimeAgo(`${seconds}s ago`)
      else setTimeAgo(`${Math.floor(seconds / 60)}m ago`)
    }, 5000)
    return () => clearInterval(interval)
  }, [lastUpdated])

  const getTeamName = (id: string) => teams.find(t => t.id === id)?.name || 'Unknown'

  return (
    <div className="w-full max-w-6xl mx-auto p-4 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">League Standings</h1>
            <p className="text-sm text-slate-500">Official Points Table</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm px-4 py-2 bg-slate-50 rounded-full border border-slate-200">
          <Activity className={cn("w-4 h-4", isConnected ? "text-emerald-500 animate-pulse" : "text-amber-500")} />
          <span className="text-slate-600 font-medium">
            {isConnected ? `Updated ${timeAgo}` : 'Reconnecting...'}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold border-b border-slate-100">
                <th className="p-4 whitespace-nowrap w-16 text-center">Rank</th>
                <th className="p-4 whitespace-nowrap min-w-[150px]">Team</th>
                <th className="p-4 whitespace-nowrap text-center" title="Matches Played">M</th>
                <th className="p-4 whitespace-nowrap text-center" title="Won">W</th>
                <th className="p-4 whitespace-nowrap text-center" title="Lost">L</th>
                <th className="p-4 whitespace-nowrap text-center" title="Tied">T</th>
                <th className="p-4 whitespace-nowrap text-center" title="No Result">NR</th>
                <th className="p-4 whitespace-nowrap text-center text-blue-600">Pts</th>
                <th className="p-4 whitespace-nowrap text-right">NRR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {standings.map((standing, index) => (
                <tr 
                  key={standing.team_id}
                  className="hover:bg-slate-50/50 transition-colors group"
                >
                  <td className="p-4 text-center">
                    <span className={cn(
                      "inline-flex items-center justify-center w-6 h-6 rounded-full text-sm font-semibold",
                      index === 0 ? "bg-amber-100 text-amber-700" :
                      index === 1 ? "bg-slate-200 text-slate-700" :
                      index === 2 ? "bg-orange-100 text-orange-800" :
                      "text-slate-500"
                    )}>
                      {index + 1}
                    </span>
                  </td>
                  <td className="p-4 font-semibold text-slate-900 flex items-center gap-3">
                    {standing.logo_url ? (
                      <img src={standing.logo_url} alt={standing.team_name} className="w-8 h-8 rounded-full object-cover border border-slate-200" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                        {standing.team_name.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    {standing.team_name}
                  </td>
                  <td className="p-4 text-center text-slate-600">{standing.matches}</td>
                  <td className="p-4 text-center text-slate-600">{standing.won}</td>
                  <td className="p-4 text-center text-slate-600">{standing.lost}</td>
                  <td className="p-4 text-center text-slate-600">{standing.tied}</td>
                  <td className="p-4 text-center text-slate-600">{standing.nr}</td>
                  <td className="p-4 text-center font-bold text-blue-600 text-lg">{standing.points}</td>
                  <td className="p-4 text-right font-medium text-slate-700">
                    {standing.nrr > 0 ? '+' : ''}{standing.nrr.toFixed(3)}
                  </td>
                </tr>
              ))}
              {standings.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-500">
                    No teams available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Matches */}
      {recentMatches.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900 px-2">Recent Matches</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentMatches.map(match => {
              const team1 = getTeamName(match.team1_id)
              const team2 = getTeamName(match.team2_id)
              let resultStr = ''
              if (match.result === 'team1_win') resultStr = `${team1} won`
              else if (match.result === 'team2_win') resultStr = `${team2} won`
              else if (match.result === 'tie') resultStr = 'Match Tied'
              else resultStr = 'No Result'

              return (
                <div key={match.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                      {new Date(match.match_date).toLocaleDateString()}
                    </span>
                    <span className={cn(
                      "text-xs font-bold px-2 py-1 rounded-full",
                      match.result.includes('win') ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                    )}>
                      {resultStr}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-slate-800">{team1}</span>
                      <span className="text-slate-600 font-medium">{match.team1_runs != null ? `${match.team1_runs}/${match.team1_wickets} (${match.team1_overs})` : '-'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-slate-800">{team2}</span>
                      <span className="text-slate-600 font-medium">{match.team2_runs != null ? `${match.team2_runs}/${match.team2_wickets} (${match.team2_overs})` : '-'}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
