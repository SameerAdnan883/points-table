'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Team, Match, calculateStandings, TeamStanding, TournamentSettings, calculateMatchMargin } from '@/lib/cricket-math'
import { Trophy, Activity, X, Eye } from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

function formatMatchDate(dateString: string) {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('T')[0].split('-');
  if (year && month && day) {
    return `${day}/${month}/${year}`;
  }
  const d = new Date(dateString);
  const dDay = String(d.getDate()).padStart(2, '0');
  const dMonth = String(d.getMonth() + 1).padStart(2, '0');
  return `${dDay}/${dMonth}/${d.getFullYear()}`;
}

export default function StandingsTable({
  initialTeams,
  initialMatches,
  settings,
}: {
  initialTeams: Team[]
  initialMatches: Match[]
  settings?: TournamentSettings
}) {
  const [teams, setTeams] = useState<Team[]>(initialTeams)
  const [matches, setMatches] = useState<Match[]>(initialMatches)
  const [currentSettings, setCurrentSettings] = useState<TournamentSettings | undefined>(settings)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [isConnected, setIsConnected] = useState(true)
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [viewerCount, setViewerCount] = useState<number>(0)

  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel('public_table')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, (payload: any) => {
        setLastUpdated(new Date())
        if (payload.eventType === 'INSERT') setMatches((prev) => [...prev, payload.new as Match])
        else if (payload.eventType === 'UPDATE') setMatches((prev) => prev.map((m) => (m.id === payload.new.id ? (payload.new as Match) : m)))
        else if (payload.eventType === 'DELETE') setMatches((prev) => prev.filter((m) => m.id !== payload.old.id))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, (payload: any) => {
        setLastUpdated(new Date())
        if (payload.eventType === 'INSERT') setTeams((prev) => [...prev, payload.new as Team])
        else if (payload.eventType === 'UPDATE') setTeams((prev) => prev.map((t) => (t.id === payload.new.id ? (payload.new as Team) : t)))
        else if (payload.eventType === 'DELETE') setTeams((prev) => prev.filter((t) => t.id !== payload.old.id))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_settings' }, (payload: any) => {
        setLastUpdated(new Date())
        if (payload.eventType === 'UPDATE') setCurrentSettings(payload.new as TournamentSettings)
      })
      .subscribe((status: string) => {
        setIsConnected(status === 'SUBSCRIBED')
      })

    let presenceChannel: any = null;

    const initPresence = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      presenceChannel = supabase.channel('public_viewers')
      
      presenceChannel.on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState()
        setViewerCount(Object.keys(state).length)
      })

      presenceChannel.subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED' && !session) {
          let viewerId = sessionStorage.getItem('viewerId')
          if (!viewerId) {
            viewerId = crypto.randomUUID()
            sessionStorage.setItem('viewerId', viewerId)
          }
          await presenceChannel.track({ id: viewerId })
        }
      })
    }

    initPresence()

    return () => { 
      supabase.removeChannel(channel)
      if (presenceChannel) supabase.removeChannel(presenceChannel)
    }
  }, [supabase])

  const standings = useMemo(() => calculateStandings(teams, matches), [teams, matches])
  const recentMatches = useMemo(() => [...matches].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 6), [matches])

  const teamForm = useMemo(() => {
    const formMap = new Map<string, string[]>()
    for (const t of teams) formMap.set(t.id, [])
    
    const sortedMatches = [...matches].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    for (const m of sortedMatches) {
      if (m.result === 'team1_win') {
        formMap.get(m.team1_id)?.push('W')
        formMap.get(m.team2_id)?.push('L')
      } else if (m.result === 'team2_win') {
        formMap.get(m.team2_id)?.push('W')
        formMap.get(m.team1_id)?.push('L')
      } else if (m.result === 'tie') {
        formMap.get(m.team1_id)?.push('T')
        formMap.get(m.team2_id)?.push('T')
      } else if (m.result === 'no_result') {
        formMap.get(m.team1_id)?.push('NR')
        formMap.get(m.team2_id)?.push('NR')
      }
    }
    
    for (const [id, results] of formMap.entries()) {
      formMap.set(id, results.slice(-5))
    }
    return formMap
  }, [teams, matches])

  const globalStandingsWithRank = useMemo(() => {
    return standings.map((s, index) => ({ ...s, globalRank: index + 1 }))
  }, [standings])

  const table1Standings = useMemo(() => {
    return globalStandingsWithRank.filter(s => {
      const t = teams.find(team => team.id === s.team_id);
      return !t || t.group_id === 1;
    })
  }, [globalStandingsWithRank, teams])

  const table2Standings = useMemo(() => {
    return globalStandingsWithRank.filter(s => {
      const t = teams.find(team => team.id === s.team_id);
      return t && t.group_id === 2;
    })
  }, [globalStandingsWithRank, teams])

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

  const selectedTeamData = useMemo(() => {
    if (!selectedTeamId) return null
    const standing = globalStandingsWithRank.find(s => s.team_id === selectedTeamId)
    const teamInfo = teams.find(t => t.id === selectedTeamId)
    const teamHistory = [...matches]
      .filter(m => m.team1_id === selectedTeamId || m.team2_id === selectedTeamId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    return { standing, teamInfo, teamHistory }
  }, [selectedTeamId, globalStandingsWithRank, matches, teams])

  const renderHeaders = () => (
    <thead>
      <tr className="bg-black/60 text-cyan-400 text-[10px] sm:text-xs uppercase tracking-widest font-black border-b border-white/10">
        <th className="p-3 sm:p-5 whitespace-nowrap w-12 sm:w-16 text-center">Rank</th>
        <th className="p-3 sm:p-5 whitespace-nowrap min-w-[140px] sm:min-w-[200px]">Team</th>
        <th className="p-2 sm:p-5 whitespace-nowrap text-center" title="Matches Played">M</th>
        <th className="p-2 sm:p-5 whitespace-nowrap text-center" title="Won">W</th>
        <th className="p-2 sm:p-5 whitespace-nowrap text-center" title="Lost">L</th>
        <th className="p-2 sm:p-5 whitespace-nowrap text-center hidden sm:table-cell" title="Tied">T</th>
        <th className="p-2 sm:p-5 whitespace-nowrap text-center hidden sm:table-cell" title="No Result">NR</th>
        <th className="p-3 sm:p-5 whitespace-nowrap text-center text-white">Pts</th>
        <th className="p-3 sm:p-5 whitespace-nowrap text-center text-fuchsia-400 hidden sm:table-cell">Form</th>
        <th className="p-3 sm:p-5 whitespace-nowrap text-right">NRR</th>
      </tr>
    </thead>
  );

  const renderRow = (standing: TeamStanding & { globalRank: number }) => {
    const forms = teamForm.get(standing.team_id) || []
    const index = standing.globalRank - 1
    return (
      <tr 
        key={standing.team_id}
        className={cn(
          "transition-all duration-300 group hover:bg-white/5",
          index === 0 && "bg-fuchsia-600/10 hover:bg-fuchsia-600/20 shadow-[inset_0_0_20px_rgba(219,39,119,0.1)]"
        )}
      >
        <td className="p-3 sm:p-5 text-center">
          <span className={cn(
            "inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full text-xs sm:text-sm font-black shadow-inner",
            index === 0 ? "bg-fuchsia-600/20 text-fuchsia-400 border border-fuchsia-500/50 shadow-[0_0_15px_rgba(219,39,119,0.5)]" :
            index === 1 ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" :
            index === 2 ? "bg-cyan-900/40 text-cyan-500 border border-cyan-800/50" :
            "text-slate-400 bg-black/40 border border-white/5"
          )}>
            {standing.globalRank}
          </span>
        </td>
        <td className="p-3 sm:p-5">
          <button 
            onClick={() => setSelectedTeamId(standing.team_id)}
            className="font-black text-white flex items-center gap-3 sm:gap-4 hover:text-cyan-400 transition-colors w-full text-left group-hover:scale-[1.02] transform duration-200"
          >
            {standing.logo_url ? (
              <img src={standing.logo_url} alt={standing.team_name} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border border-white/10 shadow-[0_0_10px_rgba(0,0,0,0.5)] group-hover:border-cyan-400/50 transition-colors" />
            ) : (
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-black/50 border border-white/10 text-slate-300 flex items-center justify-center font-black text-xs sm:text-sm shadow-[inset_0_0_10px_rgba(255,255,255,0.05)] group-hover:border-cyan-400/50 group-hover:text-cyan-400 transition-colors">
                {standing.team_name.substring(0, 2).toUpperCase()}
              </div>
            )}
            <span className="tracking-widest uppercase text-xs sm:text-base drop-shadow-sm border-b border-transparent group-hover:border-cyan-400/30">{standing.team_name}</span>
          </button>
        </td>
        <td className="p-2 sm:p-5 text-center text-slate-300 font-bold text-xs sm:text-base">{standing.matches}</td>
        <td className="p-2 sm:p-5 text-center text-slate-300 font-bold text-xs sm:text-base">{standing.won}</td>
        <td className="p-2 sm:p-5 text-center text-slate-300 font-bold text-xs sm:text-base">{standing.lost}</td>
        <td className="p-2 sm:p-5 text-center text-slate-300 font-bold text-xs sm:text-base hidden sm:table-cell">{standing.tied}</td>
        <td className="p-2 sm:p-5 text-center text-slate-300 font-bold text-xs sm:text-base hidden sm:table-cell">{standing.nr}</td>
        <td className="p-3 sm:p-5 text-center font-black text-white text-lg sm:text-xl drop-shadow-[0_0_10px_rgba(255,255,255,0.6)]">{standing.points}</td>
        <td className="p-3 sm:p-5 text-center hidden sm:table-cell">
          <div className="flex items-center justify-center gap-1.5">
            {forms.length > 0 ? forms.map((r, i) => (
              <span key={i} className={cn(
                "w-6 h-6 flex items-center justify-center text-[10px] font-black rounded-md shadow-sm border border-white/10",
                r === 'W' ? "bg-emerald-500 text-white" :
                r === 'L' ? "bg-red-500 text-white" :
                r === 'T' ? "bg-cyan-500 text-white" : "bg-slate-500 text-white"
              )}>
                {r}
              </span>
            )) : <span className="text-slate-500 font-bold">—</span>}
          </div>
        </td>
        <td className={cn(
          "p-3 sm:p-5 text-right font-black tracking-wider text-xs sm:text-base",
          standing.nrr > 0 ? "text-cyan-400" : standing.nrr < 0 ? "text-fuchsia-400" : "text-slate-400"
        )}>
          {standing.nrr > 0 ? '+' : ''}{standing.nrr.toFixed(3)}
        </td>
      </tr>
    )
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-black/40 backdrop-blur-xl p-6 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.8)] border border-fuchsia-500/30">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-fuchsia-600/20 to-cyan-500/20 text-white rounded-xl border border-fuchsia-500/30 shadow-[0_0_15px_rgba(219,39,119,0.2)]">
            <Trophy className="w-6 h-6 drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-widest uppercase drop-shadow-md">{currentSettings?.name || 'League Standings'}</h1>
            <p className="text-sm text-cyan-400 font-bold tracking-[0.2em] uppercase">{currentSettings?.subtitle || 'Official Points Table'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm px-4 py-2 bg-black/60 rounded-full border border-cyan-500/20 shadow-inner">
            <Eye className="w-4 h-4 text-cyan-400 drop-shadow-[0_0_5px_rgba(6,182,212,0.8)]" />
            <span className="text-slate-300 font-bold tracking-widest uppercase">
              {viewerCount} WATCHING
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm px-4 py-2 bg-black/60 rounded-full border border-fuchsia-500/20 shadow-inner">
            <Activity className={cn("w-4 h-4", isConnected ? "text-fuchsia-400 animate-pulse drop-shadow-[0_0_5px_rgba(219,39,119,0.8)]" : "text-amber-500")} />
            <span className="text-slate-300 font-bold tracking-widest uppercase">
              {isConnected ? `LIVE • ${timeAgo}` : 'Reconnecting...'}
            </span>
          </div>
        </div>
      </div>

      {/* Table Layout */}
      {currentSettings?.layout_mode === 'split' ? (
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 bg-black/40 backdrop-blur-xl rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.8)] border border-fuchsia-500/30 overflow-hidden flex flex-col">
            <div className="p-4 bg-black/60 border-b border-fuchsia-500/30 text-center">
              <h2 className="text-fuchsia-400 font-black uppercase tracking-widest text-sm">Table 1</h2>
            </div>
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                {renderHeaders()}
                <tbody className="divide-y divide-white/5">
                  {table1Standings.map(renderRow)}
                  {table1Standings.length === 0 && (
                    <tr>
                      <td colSpan={10} className="p-12 text-center text-slate-500 font-medium tracking-wide uppercase">No teams in Table 1</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="flex-1 bg-black/40 backdrop-blur-xl rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.8)] border border-cyan-500/30 overflow-hidden flex flex-col">
            <div className="p-4 bg-black/60 border-b border-cyan-500/30 text-center">
              <h2 className="text-cyan-400 font-black uppercase tracking-widest text-sm">Table 2</h2>
            </div>
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                {renderHeaders()}
                <tbody className="divide-y divide-white/5">
                  {table2Standings.map(renderRow)}
                  {table2Standings.length === 0 && (
                    <tr>
                      <td colSpan={10} className="p-12 text-center text-slate-500 font-medium tracking-wide uppercase">No teams in Table 2</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-black/40 backdrop-blur-xl rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.8)] border border-fuchsia-500/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              {renderHeaders()}
              <tbody className="divide-y divide-white/5">
                {globalStandingsWithRank.map(renderRow)}
                {globalStandingsWithRank.length === 0 && (
                  <tr>
                    <td colSpan={10} className="p-12 text-center text-cyan-200/50 font-medium tracking-wide uppercase">
                      No teams available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Matches */}
      <div id="recent-matches" className={cn("space-y-6 pt-4", selectedTeamId && "hidden lg:block")}>
        <h2 className="text-xl font-bold text-white px-2 tracking-wide flex items-center gap-2">
          <span className="w-2 h-6 bg-cyan-400 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.6)]"></span>
          Recent Matches
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {recentMatches.map(match => (
            <div key={match.id} className="bg-black/40 backdrop-blur-xl p-6 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.3)] border border-fuchsia-500/20 hover:border-cyan-400/40 transition-all duration-300 group">
              <div className="flex justify-between items-center mb-5 pb-4 border-b border-white/10">
                <span className="text-xs font-bold tracking-widest text-slate-400 uppercase">
                  {formatMatchDate(match.match_date)}
                </span>
                <span className={cn(
                  "text-[10px] font-extrabold uppercase tracking-wider px-3 py-1.5 rounded-full border shadow-inner",
                  match.result.includes('win') ? "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20" : "bg-white/5 text-slate-200 border-white/10"
                )}>
                  {calculateMatchMargin(match, teams)}
                </span>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-slate-300 group-hover:text-white transition-colors">
                  <span className="font-bold tracking-wide">{getTeamName(match.team1_id)}</span>
                  <span className="font-semibold">{match.team1_runs != null ? `${match.team1_runs}/${match.team1_wickets} (${match.team1_overs})` : '-'}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300 group-hover:text-white transition-colors">
                  <span className="font-bold tracking-wide">{getTeamName(match.team2_id)}</span>
                  <span className="font-semibold">{match.team2_runs != null ? `${match.team2_runs}/${match.team2_wickets} (${match.team2_overs})` : '-'}</span>
                </div>
              </div>
            </div>
          ))}
          {recentMatches.length === 0 && (
            <div className="col-span-full p-8 text-center text-slate-500 uppercase tracking-widest text-sm border border-white/5 rounded-2xl bg-black/20">
              No matches played yet.
            </div>
          )}
        </div>
      </div>

      {/* Team Details Modal */}
      {selectedTeamData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setSelectedTeamId(null)} />
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#020617] border border-cyan-500/30 shadow-[0_0_50px_rgba(6,182,212,0.2)] rounded-3xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-white/10 bg-gradient-to-r from-fuchsia-600/10 to-cyan-500/10 flex justify-between items-center">
              <div className="flex items-center gap-4">
                {selectedTeamData.teamInfo?.logo_url ? (
                  <img src={selectedTeamData.teamInfo.logo_url} alt={selectedTeamData.teamInfo.name} className="w-16 h-16 rounded-full object-cover border-2 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.5)]" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-black/50 border-2 border-cyan-400 text-cyan-400 flex items-center justify-center font-black text-xl shadow-[0_0_15px_rgba(6,182,212,0.5)]">
                    {selectedTeamData.teamInfo?.name.substring(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <h2 className="text-2xl font-black text-white uppercase tracking-widest">{selectedTeamData.teamInfo?.name}</h2>
                  <p className="text-cyan-400 font-bold uppercase tracking-widest text-xs mt-1">
                    Rank {selectedTeamData.standing?.globalRank} • {selectedTeamData.standing?.points} Points
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedTeamId(null)}
                className="p-2 bg-white/5 hover:bg-white/10 text-white rounded-full transition-colors border border-white/10"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="overflow-y-auto p-6 flex-1 bg-black/40 space-y-8">
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
                {[
                  { label: 'Played', value: selectedTeamData.standing?.matches },
                  { label: 'Won', value: selectedTeamData.standing?.won, color: 'text-emerald-400' },
                  { label: 'Lost', value: selectedTeamData.standing?.lost, color: 'text-red-400' },
                  { label: 'Tied', value: selectedTeamData.standing?.tied, color: 'text-cyan-400' },
                  { label: 'NR', value: selectedTeamData.standing?.nr },
                  { label: 'NRR', value: (selectedTeamData.standing?.nrr || 0) > 0 ? `+${selectedTeamData.standing?.nrr.toFixed(3)}` : selectedTeamData.standing?.nrr.toFixed(3) }
                ].map((stat, i) => (
                  <div key={i} className="bg-black/40 border border-white/5 rounded-2xl p-4 text-center">
                    <div className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.label}</div>
                    <div className={cn("text-xl sm:text-2xl font-black", stat.color || "text-white")}>{stat.value}</div>
                  </div>
                ))}
              </div>

              <div>
                <h3 className="text-lg font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span className="w-2 h-5 bg-fuchsia-500 rounded-full shadow-[0_0_10px_rgba(219,39,119,0.6)]"></span>
                  Team History
                </h3>
                <div className="space-y-3">
                  {selectedTeamData.teamHistory.length > 0 ? selectedTeamData.teamHistory.map(match => (
                    <div key={match.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:border-cyan-400/30 transition-colors flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
                      <div className="flex-1 space-y-2">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                          {formatMatchDate(match.match_date)}
                        </span>
                        <div className="flex items-center gap-4">
                          <div className="text-right flex-1">
                            <p className="font-bold text-white tracking-wide truncate">{getTeamName(match.team1_id)}</p>
                            <p className="text-sm text-slate-400">{match.team1_runs != null ? `${match.team1_runs}/${match.team1_wickets} (${match.team1_overs})` : '-'}</p>
                          </div>
                          <div className="w-8 text-center text-xs font-black text-slate-600">VS</div>
                          <div className="flex-1">
                            <p className="font-bold text-white tracking-wide truncate">{getTeamName(match.team2_id)}</p>
                            <p className="text-sm text-slate-400">{match.team2_runs != null ? `${match.team2_runs}/${match.team2_wickets} (${match.team2_overs})` : '-'}</p>
                          </div>
                        </div>
                      </div>
                      <div className="sm:text-right border-t sm:border-t-0 sm:border-l border-white/10 pt-3 sm:pt-0 sm:pl-4 min-w-[120px] flex sm:flex-col items-center sm:items-end justify-between">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                          match.result === 'tie' ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" :
                          match.result === 'no_result' ? "bg-slate-500/20 text-slate-300 border-slate-500/30" :
                          (match.result === 'team1_win' && match.team1_id === selectedTeamId) || (match.result === 'team2_win' && match.team2_id === selectedTeamId)
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                            : "bg-red-500/20 text-red-400 border-red-500/30"
                        )}>
                          {match.result === 'tie' ? 'Tie' :
                           match.result === 'no_result' ? 'No Result' :
                           (match.result === 'team1_win' && match.team1_id === selectedTeamId) || (match.result === 'team2_win' && match.team2_id === selectedTeamId)
                             ? 'Won' : 'Lost'}
                        </span>
                        <p className="text-[10px] text-slate-400 mt-2 hidden sm:block uppercase tracking-wider">{calculateMatchMargin(match, teams)}</p>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center p-8 bg-white/5 rounded-2xl text-slate-500 uppercase tracking-widest text-sm border border-white/5">
                      No matches played yet
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
