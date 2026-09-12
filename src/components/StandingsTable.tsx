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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/5 backdrop-blur-xl p-6 rounded-3xl shadow-[0_0_30px_rgba(0,0,0,0.3)] border border-white/10">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-cyan-500/20 text-cyan-400 rounded-xl border border-cyan-500/30 shadow-inner">
            <Trophy className="w-6 h-6 drop-shadow-[0_0_5px_rgba(6,182,212,0.5)]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">League Standings</h1>
            <p className="text-sm text-cyan-400/70 font-medium tracking-wide uppercase">Official Points Table</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm px-4 py-2 bg-black/20 rounded-full border border-white/10 shadow-inner">
          <Activity className={cn("w-4 h-4", isConnected ? "text-cyan-400 animate-pulse drop-shadow-[0_0_5px_rgba(6,182,212,0.8)]" : "text-amber-500")} />
          <span className="text-slate-300 font-medium tracking-wide">
            {isConnected ? `LIVE • ${timeAgo}` : 'Reconnecting...'}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white/5 backdrop-blur-xl rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.4)] border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/20 text-cyan-400/80 text-xs uppercase tracking-wider font-bold border-b border-white/10">
                <th className="p-5 whitespace-nowrap w-16 text-center">Rank</th>
                <th className="p-5 whitespace-nowrap min-w-[150px]">Team</th>
                <th className="p-5 whitespace-nowrap text-center" title="Matches Played">M</th>
                <th className="p-5 whitespace-nowrap text-center" title="Won">W</th>
                <th className="p-5 whitespace-nowrap text-center" title="Lost">L</th>
                <th className="p-5 whitespace-nowrap text-center" title="Tied">T</th>
                <th className="p-5 whitespace-nowrap text-center" title="No Result">NR</th>
                <th className="p-5 whitespace-nowrap text-center text-amber-400">Pts</th>
                <th className="p-5 whitespace-nowrap text-right">NRR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {standings.map((standing, index) => (
                <tr 
                  key={standing.team_id}
                  className={cn(
                    "transition-all duration-300 group hover:bg-white/5",
                    index === 0 && "bg-amber-500/5 hover:bg-amber-500/10"
                  )}
                >
                  <td className="p-5 text-center">
                    <span className={cn(
                      "inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold shadow-inner",
                      index === 0 ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-[0_0_10px_rgba(251,191,36,0.3)]" :
                      index === 1 ? "bg-slate-400/20 text-slate-300 border border-slate-400/30" :
                      index === 2 ? "bg-orange-500/20 text-orange-400 border border-orange-500/30" :
                      "text-slate-400 bg-black/20 border border-white/5"
                    )}>
                      {index + 1}
                    </span>
                  </td>
                  <td className="p-5 font-bold text-white flex items-center gap-4">
                    {standing.logo_url ? (
                      <img src={standing.logo_url} alt={standing.team_name} className="w-10 h-10 rounded-full object-cover border border-white/10 shadow-[0_0_10px_rgba(0,0,0,0.5)]" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-900 to-cyan-800 border border-cyan-500/30 text-cyan-300 flex items-center justify-center font-extrabold text-sm shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                        {standing.team_name.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <span className="tracking-wide">{standing.team_name}</span>
                  </td>
                  <td className="p-5 text-center text-slate-300 font-medium">{standing.matches}</td>
                  <td className="p-5 text-center text-slate-300 font-medium">{standing.won}</td>
                  <td className="p-5 text-center text-slate-300 font-medium">{standing.lost}</td>
                  <td className="p-5 text-center text-slate-300 font-medium">{standing.tied}</td>
                  <td className="p-5 text-center text-slate-300 font-medium">{standing.nr}</td>
                  <td className="p-5 text-center font-extrabold text-amber-400 text-xl drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]">{standing.points}</td>
                  <td className="p-5 text-right font-semibold text-cyan-300/80">
                    {standing.nrr > 0 ? '+' : ''}{standing.nrr.toFixed(3)}
                  </td>
                </tr>
              ))}
              {standings.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-400 font-medium tracking-wide uppercase">
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
        <div className="space-y-6 pt-4">
          <h2 className="text-xl font-bold text-white px-2 tracking-wide flex items-center gap-2">
            <span className="w-2 h-6 bg-cyan-500 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.6)]"></span>
            Recent Matches
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {recentMatches.map(match => {
              const team1 = getTeamName(match.team1_id)
              const team2 = getTeamName(match.team2_id)
              let resultStr = ''
              if (match.result === 'team1_win') resultStr = `${team1} won`
              else if (match.result === 'team2_win') resultStr = `${team2} won`
              else if (match.result === 'tie') resultStr = 'Match Tied'
              else resultStr = 'No Result'

              return (
                <div key={match.id} className="bg-white/5 backdrop-blur-md p-6 rounded-2xl shadow-[0_0_20px_rgba(0,0,0,0.3)] border border-white/10 hover:border-cyan-500/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(6,182,212,0.15)] group">
                  <div className="flex justify-between items-center mb-5 pb-4 border-b border-white/5">
                    <span className="text-xs font-bold tracking-widest text-cyan-500/80 uppercase">
                      {new Date(match.match_date).toLocaleDateString()}
                    </span>
                    <span className={cn(
                      "text-[10px] font-extrabold uppercase tracking-wider px-3 py-1.5 rounded-full border shadow-inner",
                      match.result.includes('win') ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-white/5 text-slate-300 border-white/10"
                    )}>
                      {resultStr}
                    </span>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center group-hover:text-white transition-colors">
                      <span className="font-bold text-slate-200 tracking-wide">{team1}</span>
                      <span className="text-amber-400 font-semibold drop-shadow-[0_0_2px_rgba(251,191,36,0.8)]">{match.team1_runs != null ? `${match.team1_runs}/${match.team1_wickets} (${match.team1_overs})` : '-'}</span>
                    </div>
                    <div className="flex justify-between items-center group-hover:text-white transition-colors">
                      <span className="font-bold text-slate-200 tracking-wide">{team2}</span>
                      <span className="text-amber-400 font-semibold drop-shadow-[0_0_2px_rgba(251,191,36,0.8)]">{match.team2_runs != null ? `${match.team2_runs}/${match.team2_wickets} (${match.team2_overs})` : '-'}</span>
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
