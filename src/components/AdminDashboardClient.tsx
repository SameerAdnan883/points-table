'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Team, Match } from '@/lib/cricket-math'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LogOut, Plus, Trash2, Edit2, ArrowLeft } from 'lucide-react'

export default function AdminDashboardClient({
  initialTeams,
  initialMatches,
}: {
  initialTeams: Team[]
  initialMatches: Match[]
}) {
  const [teams, setTeams] = useState<Team[]>(initialTeams)
  const [matches, setMatches] = useState<Match[]>(initialMatches)
  const [activeTab, setActiveTab] = useState<'matches' | 'teams'>('matches')
  
  const supabase = createClient()
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  // TEAM STATE
  const [teamName, setTeamName] = useState('')
  const [teamLogo, setTeamLogo] = useState('')
  const [teamLoading, setTeamLoading] = useState(false)

  // MATCH STATE
  const [matchDate, setMatchDate] = useState(new Date().toISOString().split('T')[0])
  const [oversLimit, setOversLimit] = useState<number>(20)
  const [team1Id, setTeam1Id] = useState('')
  const [team2Id, setTeam2Id] = useState('')
  const [battingFirstId, setBattingFirstId] = useState('')
  const [result, setResult] = useState<'team1_win' | 'team2_win' | 'tie' | 'no_result'>('team1_win')
  
  const [t1Runs, setT1Runs] = useState<number>(0)
  const [t1Wickets, setT1Wickets] = useState<number>(0)
  const [t1Overs, setT1Overs] = useState<number>(20)
  
  const [t2Runs, setT2Runs] = useState<number>(0)
  const [t2Wickets, setT2Wickets] = useState<number>(0)
  const [t2Overs, setT2Overs] = useState<number>(20)

  const [matchLoading, setMatchLoading] = useState(false)
  const [formError, setFormError] = useState('')

  const handleAddTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    setTeamLoading(true)
    const { data, error } = await supabase.from('teams').insert([{
      name: teamName,
      logo_url: teamLogo || null
    }]).select()

    if (error) {
      alert('Error adding team: ' + error.message)
    } else if (data) {
      setTeams([...teams, data[0] as Team])
      setTeamName('')
      setTeamLogo('')
    }
    setTeamLoading(false)
  }

  const handleDeleteTeam = async (id: string) => {
    if (!confirm('Are you sure? This will delete all matches associated with this team.')) return
    const { error } = await supabase.from('teams').delete().eq('id', id)
    if (error) alert('Error: ' + error.message)
    else {
      setTeams(teams.filter(t => t.id !== id))
      setMatches(matches.filter(m => m.team1_id !== id && m.team2_id !== id))
    }
  }

  const handleAddMatch = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    if (!team1Id || !team2Id || team1Id === team2Id) {
      setFormError('Please select two different teams.')
      return
    }
    if (!battingFirstId || (battingFirstId !== team1Id && battingFirstId !== team2Id)) {
      setFormError('Please select a valid batting first team.')
      return
    }
    if (t1Wickets < 0 || t1Wickets > 10 || t2Wickets < 0 || t2Wickets > 10) {
      setFormError('Wickets must be between 0 and 10.')
      return
    }
    if (t1Overs > oversLimit || t2Overs > oversLimit) {
      setFormError('Overs faced cannot exceed match overs limit.')
      return
    }

    let winner_id = null
    if (result === 'team1_win') winner_id = team1Id
    if (result === 'team2_win') winner_id = team2Id

    setMatchLoading(true)

    const newMatch = {
      match_date: matchDate,
      overs_limit: oversLimit,
      team1_id: team1Id,
      team2_id: team2Id,
      team1_runs: result === 'no_result' ? null : t1Runs,
      team1_wickets: result === 'no_result' ? null : t1Wickets,
      team1_overs: result === 'no_result' ? null : t1Overs,
      team2_runs: result === 'no_result' ? null : t2Runs,
      team2_wickets: result === 'no_result' ? null : t2Wickets,
      team2_overs: result === 'no_result' ? null : t2Overs,
      batting_first_id: battingFirstId,
      result,
      winner_id
    }

    const { data, error } = await supabase.from('matches').insert([newMatch]).select()

    if (error) {
      setFormError('Error adding match: ' + error.message)
    } else if (data) {
      setMatches([data[0] as Match, ...matches])
      // Reset some fields
      setT1Runs(0)
      setT1Wickets(0)
      setT1Overs(oversLimit)
      setT2Runs(0)
      setT2Wickets(0)
      setT2Overs(oversLimit)
    }
    setMatchLoading(false)
  }

  const handleDeleteMatch = async (id: string) => {
    if (!confirm('Are you sure you want to delete this match?')) return
    const { error } = await supabase.from('matches').delete().eq('id', id)
    if (error) alert('Error: ' + error.message)
    else setMatches(matches.filter(m => m.id !== id))
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex justify-between items-center bg-white/5 backdrop-blur-xl p-6 rounded-2xl shadow-[0_0_20px_rgba(0,0,0,0.3)] border border-white/10">
        <h1 className="text-2xl font-bold text-white tracking-wide">Admin Dashboard</h1>
        <div className="flex items-center gap-4">
          <Link 
            href="/standings"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-cyan-400 hover:text-cyan-300 hover:bg-white/5 rounded-lg transition-colors border border-cyan-500/30 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            View Points Table
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-300 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>

      <div className="flex space-x-1 bg-slate-200/50 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('matches')}
          className={`px-6 py-2.5 text-sm font-medium rounded-lg transition-colors ${
            activeTab === 'matches' 
              ? 'bg-white/5 backdrop-blur-xl text-cyan-300 shadow-[0_0_20px_rgba(0,0,0,0.3)]' 
              : 'text-slate-300 hover:text-white font-bold tracking-wide hover:bg-slate-200/50'
          }`}
        >
          Manage Matches
        </button>
        <button
          onClick={() => setActiveTab('teams')}
          className={`px-6 py-2.5 text-sm font-medium rounded-lg transition-colors ${
            activeTab === 'teams' 
              ? 'bg-white/5 backdrop-blur-xl text-cyan-300 shadow-[0_0_20px_rgba(0,0,0,0.3)]' 
              : 'text-slate-300 hover:text-white font-bold tracking-wide hover:bg-slate-200/50'
          }`}
        >
          Manage Teams
        </button>
      </div>

      {activeTab === 'teams' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-white/5 backdrop-blur-xl p-6 rounded-2xl shadow-[0_0_20px_rgba(0,0,0,0.3)] border border-white/10">
              <h2 className="text-lg font-semibold text-white font-bold tracking-wide mb-4">Add New Team</h2>
              <form onSubmit={handleAddTeam} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Team Name *</label>
                  <input
                    required
                    type="text"
                    value={teamName}
                    onChange={e => setTeamName(e.target.value)}
                    className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none text-white shadow-inner focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    placeholder="e.g. Australia"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Logo URL (optional)</label>
                  <input
                    type="url"
                    value={teamLogo}
                    onChange={e => setTeamLogo(e.target.value)}
                    className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none text-white shadow-inner focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    placeholder="https://..."
                  />
                </div>
                <button
                  type="submit"
                  disabled={teamLoading}
                  className="w-full flex justify-center items-center gap-2 py-2 px-4 border border-transparent rounded-lg shadow-[0_0_20px_rgba(0,0,0,0.3)] text-sm font-medium text-white bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-900 font-bold tracking-wider uppercase border-none shadow-[0_0_15px_rgba(251,191,36,0.3)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500/50 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  {teamLoading ? 'Adding...' : 'Add Team'}
                </button>
              </form>
            </div>
          </div>
          
          <div className="lg:col-span-2">
            <div className="bg-white/5 backdrop-blur-xl p-6 rounded-2xl shadow-[0_0_20px_rgba(0,0,0,0.3)] border border-white/10">
              <h2 className="text-lg font-semibold text-white font-bold tracking-wide mb-4">Existing Teams</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {teams.map(team => (
                  <div key={team.id} className="flex items-center justify-between p-4 border border-white/10 rounded-xl hover:bg-black/30 transition-colors">
                    <div className="flex items-center gap-3">
                      {team.logo_url ? (
                        <img src={team.logo_url} alt={team.name} className="w-8 h-8 rounded-full border border-white/10" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 flex items-center justify-center font-bold text-xs">
                          {team.name.substring(0,2).toUpperCase()}
                        </div>
                      )}
                      <span className="font-medium text-white font-bold tracking-wide">{team.name}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteTeam(team.id)}
                      className="text-slate-500 hover:text-red-600 transition-colors p-1"
                      title="Delete team"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {teams.length === 0 && <p className="text-slate-500 text-sm">No teams added yet.</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'matches' && (
        <div className="space-y-8">
          {/* Add Match Form */}
          <div className="bg-white/5 backdrop-blur-xl p-6 rounded-2xl shadow-[0_0_20px_rgba(0,0,0,0.3)] border border-white/10">
            <h2 className="text-lg font-semibold text-white font-bold tracking-wide mb-6">Enter Match Result</h2>
            
            {formError && (
              <div className="mb-6 p-3 bg-red-500/10 text-red-400 border-red-500/30 text-sm rounded-lg border border-red-100">
                {formError}
              </div>
            )}

            <form onSubmit={handleAddMatch} className="space-y-6">
              {/* Match Meta */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Match Date</label>
                  <input
                    type="date"
                    required
                    value={matchDate}
                    onChange={e => setMatchDate(e.target.value)}
                    className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none text-white shadow-inner focus:ring-2 focus:ring-cyan-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Overs Limit</label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    required
                    value={oversLimit}
                    onChange={e => {
                      const limit = Number(e.target.value);
                      setOversLimit(limit);
                      setT1Overs(limit);
                      setT2Overs(limit);
                    }}
                    className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none text-white shadow-inner focus:ring-2 focus:ring-cyan-500/50"
                  />
                </div>
              </div>

              {/* Teams & Toss */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-black/30 rounded-xl border border-white/10">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Team 1</label>
                  <select required value={team1Id} onChange={e => setTeam1Id(e.target.value)} className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none text-white shadow-inner focus:ring-2 focus:ring-cyan-500/50 bg-white/5 backdrop-blur-xl">
                    <option value="">Select Team</option>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Team 2</label>
                  <select required value={team2Id} onChange={e => setTeam2Id(e.target.value)} className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none text-white shadow-inner focus:ring-2 focus:ring-cyan-500/50 bg-white/5 backdrop-blur-xl">
                    <option value="">Select Team</option>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Batting First</label>
                  <select required value={battingFirstId} onChange={e => setBattingFirstId(e.target.value)} className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none text-white shadow-inner focus:ring-2 focus:ring-cyan-500/50 bg-white/5 backdrop-blur-xl">
                    <option value="">Select Team</option>
                    {team1Id && <option value={team1Id}>{teams.find(t => t.id === team1Id)?.name}</option>}
                    {team2Id && <option value={team2Id}>{teams.find(t => t.id === team2Id)?.name}</option>}
                  </select>
                </div>
              </div>

              {/* Result */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="p-4 border border-white/10 rounded-xl bg-white/5 backdrop-blur-xl">
                  <h3 className="font-semibold text-slate-200 font-semibold mb-4 flex items-center justify-between">
                    <span>{teams.find(t => t.id === team1Id)?.name || 'Team 1'} Innings</span>
                    {battingFirstId === team1Id && <span className="text-xs bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 px-2 py-1 rounded">1st Innings</span>}
                    {battingFirstId === team2Id && <span className="text-xs bg-slate-100 text-slate-300 px-2 py-1 rounded">2nd Innings</span>}
                  </h3>
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-slate-500 mb-1">Runs</label>
                        <input type="number" min="0" required disabled={result === 'no_result'} value={t1Runs} onChange={e => setT1Runs(Number(e.target.value))} className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none text-white shadow-inner disabled:bg-black/30" />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-slate-500 mb-1">Wickets</label>
                        <input type="number" min="0" max="10" required disabled={result === 'no_result'} value={t1Wickets} onChange={e => setT1Wickets(Number(e.target.value))} className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none text-white shadow-inner disabled:bg-black/30" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Overs Faced (e.g. 19.4)</label>
                      <input type="number" step="0.1" min="0" max={oversLimit} required disabled={result === 'no_result'} value={t1Overs} onChange={e => setT1Overs(Number(e.target.value))} className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none text-white shadow-inner disabled:bg-black/30" />
                    </div>
                  </div>
                </div>

                <div className="p-4 border border-white/10 rounded-xl bg-white/5 backdrop-blur-xl">
                  <h3 className="font-semibold text-slate-200 font-semibold mb-4 flex items-center justify-between">
                    <span>{teams.find(t => t.id === team2Id)?.name || 'Team 2'} Innings</span>
                    {battingFirstId === team2Id && <span className="text-xs bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 px-2 py-1 rounded">1st Innings</span>}
                    {battingFirstId === team1Id && <span className="text-xs bg-slate-100 text-slate-300 px-2 py-1 rounded">2nd Innings</span>}
                  </h3>
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-slate-500 mb-1">Runs</label>
                        <input type="number" min="0" required disabled={result === 'no_result'} value={t2Runs} onChange={e => setT2Runs(Number(e.target.value))} className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none text-white shadow-inner disabled:bg-black/30" />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-slate-500 mb-1">Wickets</label>
                        <input type="number" min="0" max="10" required disabled={result === 'no_result'} value={t2Wickets} onChange={e => setT2Wickets(Number(e.target.value))} className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none text-white shadow-inner disabled:bg-black/30" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Overs Faced (e.g. 19.4)</label>
                      <input type="number" step="0.1" min="0" max={oversLimit} required disabled={result === 'no_result'} value={t2Overs} onChange={e => setT2Overs(Number(e.target.value))} className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none text-white shadow-inner disabled:bg-black/30" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Match Result Select */}
              <div className="p-4 bg-black/30 rounded-xl border border-white/10">
                <label className="block text-sm font-medium text-slate-300 mb-2">Match Result</label>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="result" value="team1_win" checked={result === 'team1_win'} onChange={(e) => setResult(e.target.value as any)} className="w-4 h-4 text-cyan-400 border-white/20 focus:ring-cyan-500/50" />
                    <span className="text-sm font-medium text-slate-300">{teams.find(t => t.id === team1Id)?.name || 'Team 1'} Won</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="result" value="team2_win" checked={result === 'team2_win'} onChange={(e) => setResult(e.target.value as any)} className="w-4 h-4 text-cyan-400 border-white/20 focus:ring-cyan-500/50" />
                    <span className="text-sm font-medium text-slate-300">{teams.find(t => t.id === team2Id)?.name || 'Team 2'} Won</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="result" value="tie" checked={result === 'tie'} onChange={(e) => setResult(e.target.value as any)} className="w-4 h-4 text-cyan-400 border-white/20 focus:ring-cyan-500/50" />
                    <span className="text-sm font-medium text-slate-300">Tie</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="result" value="no_result" checked={result === 'no_result'} onChange={(e) => setResult(e.target.value as any)} className="w-4 h-4 text-cyan-400 border-white/20 focus:ring-cyan-500/50" />
                    <span className="text-sm font-medium text-slate-300">No Result</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={matchLoading}
                  className="flex items-center gap-2 py-2.5 px-6 border border-transparent rounded-lg shadow-[0_0_20px_rgba(0,0,0,0.3)] text-sm font-medium text-white bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-900 font-bold tracking-wider uppercase border-none shadow-[0_0_15px_rgba(251,191,36,0.3)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500/50 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  {matchLoading ? 'Submitting...' : 'Submit Match Result'}
                </button>
              </div>
            </form>
          </div>

          {/* Matches List */}
          <div className="bg-white/5 backdrop-blur-xl p-6 rounded-2xl shadow-[0_0_20px_rgba(0,0,0,0.3)] border border-white/10">
            <h2 className="text-lg font-semibold text-white font-bold tracking-wide mb-4">Past Matches</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-black/30 text-slate-500 text-xs uppercase tracking-wider font-semibold border-b border-white/10">
                    <th className="p-4">Date</th>
                    <th className="p-4">Match</th>
                    <th className="p-4">Result</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {matches.map(m => {
                    const t1 = teams.find(t => t.id === m.team1_id)?.name || 'Unknown'
                    const t2 = teams.find(t => t.id === m.team2_id)?.name || 'Unknown'
                    let resStr = 'No Result'
                    if (m.result === 'team1_win') resStr = `${t1} Won`
                    else if (m.result === 'team2_win') resStr = `${t2} Won`
                    else if (m.result === 'tie') resStr = 'Tied'
                    
                    return (
                      <tr key={m.id} className="hover:bg-black/30 transition-colors">
                        <td className="p-4 text-sm text-slate-300">{new Date(m.match_date).toLocaleDateString()}</td>
                        <td className="p-4 text-sm font-medium text-white font-bold tracking-wide">{t1} vs {t2}</td>
                        <td className="p-4 text-sm text-slate-300">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-200 font-semibold">
                            {resStr}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => handleDeleteMatch(m.id)}
                            className="text-slate-500 hover:text-red-600 transition-colors p-1"
                            title="Delete Match"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                  {matches.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-500">
                        No matches recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
