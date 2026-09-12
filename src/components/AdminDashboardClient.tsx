'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Team, Match, TournamentSettings } from '@/lib/cricket-math'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LogOut, Plus, Trash2, Edit2, ArrowLeft, Settings as SettingsIcon, Save, X, Upload, AlertTriangle } from 'lucide-react'

export default function AdminDashboardClient({
  initialTeams,
  initialMatches,
  initialSettings
}: {
  initialTeams: Team[]
  initialMatches: Match[]
  initialSettings?: TournamentSettings
}) {
  const [teams, setTeams] = useState<Team[]>(initialTeams)
  const [matches, setMatches] = useState<Match[]>(initialMatches)
  const [settings, setSettings] = useState<TournamentSettings | undefined>(initialSettings)
  const [activeTab, setActiveTab] = useState<'matches' | 'teams' | 'settings'>('matches')
  
  const supabase = createClient()
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.refresh()
    window.location.href = '/admin/login'
  }

  // TEAM ADD STATE
  const [teamName, setTeamName] = useState('')
  const [teamLogoFile, setTeamLogoFile] = useState<File | null>(null)
  const [teamLogoPreview, setTeamLogoPreview] = useState<string | null>(null)
  const [teamLoading, setTeamLoading] = useState(false)
  const addFileInputRef = useRef<HTMLInputElement>(null)

  // TEAM EDIT STATE
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null)
  const [editTeamName, setEditTeamName] = useState('')
  const [editTeamLogoFile, setEditTeamLogoFile] = useState<File | null>(null)
  const [editTeamLogoPreview, setEditTeamLogoPreview] = useState<string | null>(null)
  const [editTeamLogoRemoved, setEditTeamLogoRemoved] = useState(false)
  const editFileInputRef = useRef<HTMLInputElement>(null)

  // SETTINGS STATE
  const [settingsName, setSettingsName] = useState(settings?.name || '')
  const [settingsSubtitle, setSettingsSubtitle] = useState(settings?.subtitle || '')
  const [settingsLayoutMode, setSettingsLayoutMode] = useState<'single'|'split'>(settings?.layout_mode || 'single')
  const [settingsDefaultOvers, setSettingsDefaultOvers] = useState<number>(settings?.default_overs || 20)
  const [settingsPlayers, setSettingsPlayers] = useState<number>(settings?.players_per_team || 11)
  const [settingsLoading, setSettingsLoading] = useState(false)

  // RESET TOURNAMENT STATE
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetting, setResetting] = useState(false)

  // MATCH STATE
  const [matchDate, setMatchDate] = useState(new Date().toISOString().split('T')[0])
  const [oversLimit, setOversLimit] = useState<number>(settings?.default_overs || 20)
  const [team1Id, setTeam1Id] = useState('')
  const [team2Id, setTeam2Id] = useState('')
  const [battingFirstId, setBattingFirstId] = useState('')
  const [result, setResult] = useState<'team1_win' | 'team2_win' | 'tie' | 'no_result'>('team1_win')
  
  const [t1Runs, setT1Runs] = useState<number>(0)
  const [t1Wickets, setT1Wickets] = useState<number>(0)
  const [t1Overs, setT1Overs] = useState<number>(settings?.default_overs || 20)
  
  const [t2Runs, setT2Runs] = useState<number>(0)
  const [t2Wickets, setT2Wickets] = useState<number>(0)
  const [t2Overs, setT2Overs] = useState<number>(settings?.default_overs || 20)

  const [matchLoading, setMatchLoading] = useState(false)
  const [formError, setFormError] = useState('')

  const uploadImageToSupabase = async (file: File) => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
    const { error: uploadError } = await supabase.storage.from('team-logos').upload(fileName, file)
    if (uploadError) throw uploadError
    const { data } = supabase.storage.from('team-logos').getPublicUrl(fileName)
    return data.publicUrl
  }

  const handleAddTeamLogoPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('File size must be less than 2MB')
        return
      }
      setTeamLogoFile(file)
      setTeamLogoPreview(URL.createObjectURL(file))
    }
  }

  const handleEditTeamLogoPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('File size must be less than 2MB')
        return
      }
      setEditTeamLogoFile(file)
      setEditTeamLogoPreview(URL.createObjectURL(file))
      setEditTeamLogoRemoved(false)
    }
  }

  const handleAddTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    setTeamLoading(true)
    try {
      let finalLogoUrl = null
      if (teamLogoFile) {
        finalLogoUrl = await uploadImageToSupabase(teamLogoFile)
      }

      const { data, error } = await supabase.from('teams').insert([{
        name: teamName,
        logo_url: finalLogoUrl
      }]).select()

      if (error) throw error

      if (data) {
        setTeams([...teams, data[0] as Team])
        setTeamName('')
        setTeamLogoFile(null)
        setTeamLogoPreview(null)
      }
    } catch (err: any) {
      alert('Error adding team: ' + err.message)
    }
    setTeamLoading(false)
  }

  const startEditingTeam = (team: Team) => {
    setEditingTeamId(team.id)
    setEditTeamName(team.name)
    setEditTeamLogoFile(null)
    setEditTeamLogoPreview(team.logo_url || null)
    setEditTeamLogoRemoved(false)
  }

  const handleSaveTeam = async (id: string) => {
    if (!editTeamName) return
    setTeamLoading(true)
    try {
      let finalLogoUrl: string | null | undefined = undefined
      if (editTeamLogoRemoved) {
        finalLogoUrl = null
      } else if (editTeamLogoFile) {
        finalLogoUrl = await uploadImageToSupabase(editTeamLogoFile)
      }

      const updatePayload: any = { name: editTeamName }
      if (finalLogoUrl !== undefined) {
        updatePayload.logo_url = finalLogoUrl
      }

      const { data, error } = await supabase
        .from('teams')
        .update(updatePayload)
        .eq('id', id)
        .select()

      if (error) throw error

      if (data) {
        setTeams(teams.map(t => t.id === id ? data[0] as Team : t))
        setEditingTeamId(null)
      }
    } catch (err: any) {
      alert('Error updating team: ' + err.message)
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

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (settingsDefaultOvers < 1 || settingsPlayers < 2) {
      alert('Invalid match format settings.')
      return
    }

    setSettingsLoading(true)
    const { data, error } = await supabase
      .from('tournament_settings')
      .update({ 
        name: settingsName, 
        subtitle: settingsSubtitle,
        layout_mode: settingsLayoutMode,
        default_overs: settingsDefaultOvers,
        players_per_team: settingsPlayers
      })
      .eq('id', 1)
      .select()

    if (error) {
      alert('Error updating settings: ' + error.message)
    } else if (data) {
      setSettings(data[0] as TournamentSettings)
      alert('Settings saved successfully!')
    }
    setSettingsLoading(false)
  }

  const handleResetTournament = async () => {
    setResetting(true)
    try {
      // Delete matches first
      const { error: matchesError } = await supabase.from('matches').delete().not('id', 'is', null)
      if (matchesError) throw matchesError
      
      // Delete teams next
      const { error: teamsError } = await supabase.from('teams').delete().not('id', 'is', null)
      if (teamsError) throw teamsError

      setMatches([])
      setTeams([])
      setShowResetModal(false)
      alert('Tournament reset successfully.')
    } catch (err: any) {
      alert('Error resetting tournament: ' + err.message)
    } finally {
      setResetting(false)
    }
  }

  const handleToggleGroup = async (teamId: string, currentGroupId: number) => {
    const newGroupId = currentGroupId === 1 ? 2 : 1;
    const { error } = await supabase.from('teams').update({ group_id: newGroupId }).eq('id', teamId);
    if (error) {
      alert('Error moving team: ' + error.message);
    } else {
      setTeams(teams.map(t => t.id === teamId ? { ...t, group_id: newGroupId } : t));
    }
  }

  const isValidCricketOvers = (overs: number) => {
    const decimal = Math.round((overs - Math.floor(overs)) * 10);
    return decimal < 6;
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
    const maxWickets = (settings?.players_per_team || 11) - 1;
    if (t1Wickets < 0 || t1Wickets > maxWickets || t2Wickets < 0 || t2Wickets > maxWickets) {
      setFormError(`Wickets must be between 0 and ${maxWickets} (Based on Players Per Team: ${settings?.players_per_team || 11}).`)
      return
    }
    if (t1Overs > oversLimit || t2Overs > oversLimit) {
      setFormError('Overs faced cannot exceed match overs limit.')
      return
    }
    if (!isValidCricketOvers(t1Overs) || !isValidCricketOvers(t2Overs) || !isValidCricketOvers(oversLimit)) {
      setFormError('Invalid cricket overs format. The decimal part cannot be .6 or higher.')
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
      
      {/* Reset Tournament Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => !resetting && setShowResetModal(false)} />
          <div className="relative w-full max-w-md bg-[#020617] border border-red-500/50 shadow-[0_0_50px_rgba(239,68,68,0.2)] rounded-3xl p-8 text-center space-y-6">
            <div className="mx-auto w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center border border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.3)]">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-2">Reset Entire Tournament?</h2>
              <p className="text-slate-400">This will permanently delete <strong className="text-red-400">ALL teams</strong> and <strong className="text-red-400">ALL match results</strong>. This action cannot be undone.</p>
            </div>
            <div className="flex gap-4 pt-4">
              <button 
                onClick={() => setShowResetModal(false)}
                disabled={resetting}
                className="flex-1 py-3 rounded-xl font-bold uppercase tracking-wider text-slate-300 hover:text-white bg-white/5 border border-white/10 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleResetTournament}
                disabled={resetting}
                className="flex-1 py-3 rounded-xl font-black uppercase tracking-wider text-white bg-red-600 hover:bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)] transition-all disabled:opacity-50"
              >
                {resetting ? 'Resetting...' : 'Yes, Reset Everything'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center bg-black/40 backdrop-blur-xl p-6 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.8)] border border-fuchsia-500/30">
        <h1 className="text-2xl font-bold text-white tracking-wide">Admin Dashboard</h1>
        <div className="flex items-center gap-4">
          <Link 
            href="/"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-fuchsia-400 hover:text-fuchsia-300 hover:bg-white/5 rounded-lg transition-colors border border-fuchsia-500/30 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            View Points Table
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white font-bold uppercase tracking-wider hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 bg-black/30 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('matches')}
          className={`px-6 py-2.5 text-sm font-medium rounded-lg transition-colors ${
            activeTab === 'matches' 
              ? 'bg-black/60 backdrop-blur-xl text-fuchsia-400 shadow-[0_8px_32px_rgba(0,0,0,0.8)] border border-fuchsia-500/30' 
              : 'text-white font-bold uppercase tracking-wider hover:text-white hover:bg-black/30'
          }`}
        >
          Manage Matches
        </button>
        <button
          onClick={() => setActiveTab('teams')}
          className={`px-6 py-2.5 text-sm font-medium rounded-lg transition-colors ${
            activeTab === 'teams' 
              ? 'bg-black/60 backdrop-blur-xl text-fuchsia-400 shadow-[0_8px_32px_rgba(0,0,0,0.8)] border border-fuchsia-500/30' 
              : 'text-white font-bold uppercase tracking-wider hover:text-white hover:bg-black/30'
          }`}
        >
          Manage Teams
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-6 py-2.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
            activeTab === 'settings' 
              ? 'bg-black/60 backdrop-blur-xl text-fuchsia-400 shadow-[0_8px_32px_rgba(0,0,0,0.8)] border border-fuchsia-500/30' 
              : 'text-white font-bold uppercase tracking-wider hover:text-white hover:bg-black/30'
          }`}
        >
          <SettingsIcon className="w-4 h-4" /> Settings
        </button>
      </div>

      {activeTab === 'settings' && (
        <div className="max-w-2xl space-y-8">
          <div className="bg-black/40 backdrop-blur-xl p-6 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.8)] border border-fuchsia-500/30">
            <h2 className="text-lg font-semibold text-white tracking-wide mb-6 flex items-center gap-2">
              <span className="w-2 h-6 bg-cyan-400 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.6)]"></span>
              Tournament Settings
            </h2>
            <form onSubmit={handleSaveSettings} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-white uppercase tracking-wider mb-2">Tournament Name</label>
                <input 
                  type="text" 
                  required 
                  value={settingsName}
                  onChange={e => setSettingsName(e.target.value)}
                  className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none text-white focus:ring-2 focus:ring-fuchsia-500/50"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-white uppercase tracking-wider mb-2">Subtitle</label>
                <input 
                  type="text" 
                  required 
                  value={settingsSubtitle}
                  onChange={e => setSettingsSubtitle(e.target.value)}
                  className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none text-white focus:ring-2 focus:ring-fuchsia-500/50"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-white uppercase tracking-wider mb-2">Default Overs</label>
                  <input 
                    type="number" 
                    min="1"
                    step="0.1"
                    required 
                    value={settingsDefaultOvers}
                    onChange={e => setSettingsDefaultOvers(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none text-white focus:ring-2 focus:ring-fuchsia-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-white uppercase tracking-wider mb-2">Players Per Team</label>
                  <input 
                    type="number" 
                    min="2"
                    required 
                    value={settingsPlayers}
                    onChange={e => setSettingsPlayers(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none text-white focus:ring-2 focus:ring-fuchsia-500/50"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-white uppercase tracking-wider mb-2">Points Table Layout</label>
                <select 
                  value={settingsLayoutMode} 
                  onChange={e => setSettingsLayoutMode(e.target.value as 'single' | 'split')}
                  className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none text-white focus:ring-2 focus:ring-fuchsia-500/50"
                >
                  <option value="single">Single Table</option>
                  <option value="split">Two Tables</option>
                </select>
              </div>
              <button 
                type="submit" 
                disabled={settingsLoading}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl text-sm font-black text-white bg-gradient-to-r from-fuchsia-600 to-cyan-500 hover:from-fuchsia-500 hover:to-cyan-400 tracking-wider uppercase border-none shadow-[0_0_20px_rgba(219,39,119,0.3)] hover:shadow-[0_0_30px_rgba(219,39,119,0.5)] transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {settingsLoading ? 'Saving...' : 'Save Settings'}
              </button>
            </form>
          </div>

          <div className="bg-black/40 backdrop-blur-xl p-6 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.8)] border border-fuchsia-500/30">
            <h2 className="text-lg font-semibold text-white tracking-wide mb-4 flex items-center gap-2">
              <span className="w-2 h-6 bg-cyan-400 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.6)]"></span>
              Table Groups Management
            </h2>
            
            {settingsLayoutMode === 'single' ? (
              <p className="text-slate-400 text-sm">Switch to "Two Tables" mode above to manage team grouping.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="font-bold text-fuchsia-400 uppercase tracking-widest text-sm border-b border-fuchsia-500/30 pb-2">Table 1 Teams</h3>
                  <div className="space-y-2">
                    {teams.filter(t => t.group_id === 1 || !t.group_id).map(team => (
                      <div key={team.id} className="flex items-center justify-between p-3 bg-black/30 border border-white/10 rounded-xl">
                        <span className="text-white font-medium text-sm">{team.name}</span>
                        <button 
                          onClick={() => handleToggleGroup(team.id, 1)}
                          className="text-[10px] font-bold uppercase tracking-wider bg-white/5 hover:bg-white/10 text-cyan-400 border border-white/10 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          Move to Table 2
                        </button>
                      </div>
                    ))}
                    {teams.filter(t => t.group_id === 1 || !t.group_id).length === 0 && <p className="text-slate-500 text-xs italic">No teams in Table 1</p>}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-bold text-cyan-400 uppercase tracking-widest text-sm border-b border-cyan-500/30 pb-2">Table 2 Teams</h3>
                  <div className="space-y-2">
                    {teams.filter(t => t.group_id === 2).map(team => (
                      <div key={team.id} className="flex items-center justify-between p-3 bg-black/30 border border-white/10 rounded-xl">
                        <span className="text-white font-medium text-sm">{team.name}</span>
                        <button 
                          onClick={() => handleToggleGroup(team.id, 2)}
                          className="text-[10px] font-bold uppercase tracking-wider bg-white/5 hover:bg-white/10 text-fuchsia-400 border border-white/10 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          Move to Table 1
                        </button>
                      </div>
                    ))}
                    {teams.filter(t => t.group_id === 2).length === 0 && <p className="text-slate-500 text-xs italic">No teams in Table 2</p>}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-black/40 backdrop-blur-xl p-6 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.8)] border border-red-500/30">
            <h2 className="text-lg font-semibold text-white tracking-wide mb-4 flex items-center gap-2">
              <span className="w-2 h-6 bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.6)]"></span>
              Danger Zone
            </h2>
            <p className="text-slate-400 text-sm mb-6">Resetting the tournament will delete all matches and teams. This action cannot be undone.</p>
            <button
              onClick={() => setShowResetModal(true)}
              className="w-full sm:w-auto flex justify-center items-center gap-2 py-3 px-6 rounded-xl text-sm font-black text-white bg-red-600 hover:bg-red-500 tracking-wider uppercase border-none shadow-[0_0_20px_rgba(239,68,68,0.3)] transition-all"
            >
              <AlertTriangle className="w-4 h-4" /> Reset Tournament
            </button>
          </div>
        </div>
      )}

      {activeTab === 'teams' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-black/40 backdrop-blur-xl p-6 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.8)] border border-fuchsia-500/30">
              <h2 className="text-lg font-semibold text-white tracking-wide mb-4">Add New Team</h2>
              <form onSubmit={handleAddTeam} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-white uppercase tracking-wider mb-2">Team Name</label>
                  <input type="text" required value={teamName} onChange={e => setTeamName(e.target.value)} className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none text-white focus:ring-2 focus:ring-cyan-500/50" placeholder="Mumbai Warriors" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-white uppercase tracking-wider mb-2">Team Logo</label>
                  <input 
                    type="file" 
                    accept="image/jpeg, image/png, image/webp" 
                    className="hidden" 
                    ref={addFileInputRef}
                    onChange={handleAddTeamLogoPick}
                  />
                  
                  {teamLogoPreview ? (
                    <div className="border border-white/10 rounded-xl p-4 bg-black/20 flex flex-col items-center gap-4">
                      <img src={teamLogoPreview} alt="Preview" className="w-20 h-20 rounded-full object-cover border border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.3)]" />
                      <button 
                        type="button"
                        onClick={() => addFileInputRef.current?.click()}
                        className="text-xs font-bold uppercase tracking-wider text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 px-4 py-2 rounded-lg border border-cyan-500/30"
                      >
                        Change Logo
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => addFileInputRef.current?.click()}
                      className="w-full py-6 border-2 border-dashed border-white/20 hover:border-cyan-500/50 rounded-xl flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-cyan-400 transition-colors bg-black/20"
                    >
                      <Upload className="w-6 h-6" />
                      <span className="text-xs font-bold uppercase tracking-wider">Upload Team Logo</span>
                    </button>
                  )}
                </div>
                <button type="submit" disabled={teamLoading} className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl text-sm font-black text-white bg-gradient-to-r from-fuchsia-600 to-cyan-500 hover:from-fuchsia-500 hover:to-cyan-400 tracking-wider uppercase border-none shadow-[0_0_20px_rgba(219,39,119,0.3)] hover:shadow-[0_0_30px_rgba(219,39,119,0.5)] transition-all disabled:opacity-50 mt-2">
                  <Plus className="w-4 h-4" /> {teamLoading ? 'Adding...' : 'Add Team'}
                </button>
              </form>
            </div>
          </div>
          
          <div className="lg:col-span-2">
            <div className="bg-black/40 backdrop-blur-xl p-6 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.8)] border border-fuchsia-500/30">
              <h2 className="text-lg font-semibold text-white tracking-wide mb-4">Existing Teams</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {teams.map(team => (
                  <div key={team.id} className="p-4 border border-white/10 rounded-xl hover:bg-black/30 transition-colors bg-black/20">
                    {editingTeamId === team.id ? (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Name</label>
                          <input type="text" required value={editTeamName} onChange={e => setEditTeamName(e.target.value)} className="w-full px-3 py-2 bg-black/40 border border-cyan-500/50 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500" placeholder="Name" />
                        </div>
                        
                        <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Logo</label>
                          <input 
                            type="file" 
                            accept="image/jpeg, image/png, image/webp" 
                            className="hidden" 
                            ref={editFileInputRef}
                            onChange={handleEditTeamLogoPick}
                          />
                          
                          {editTeamLogoPreview && !editTeamLogoRemoved ? (
                            <div className="flex items-center justify-between bg-black/40 p-2 rounded-lg border border-white/10">
                              <img src={editTeamLogoPreview} alt="Preview" className="w-10 h-10 rounded-full object-cover border border-cyan-500/50" />
                              <div className="flex gap-2">
                                <button type="button" onClick={() => editFileInputRef.current?.click()} className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 hover:text-cyan-300 px-2 py-1 bg-cyan-500/10 rounded border border-cyan-500/30">Change</button>
                                <button type="button" onClick={() => setEditTeamLogoRemoved(true)} className="text-[10px] font-bold uppercase tracking-wider text-red-400 hover:text-red-300 px-2 py-1 bg-red-500/10 rounded border border-red-500/30">Remove</button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => editFileInputRef.current?.click()}
                              className="w-full py-3 border border-dashed border-white/20 hover:border-cyan-500/50 rounded-lg flex items-center justify-center gap-2 text-slate-400 hover:text-cyan-400 transition-colors bg-black/40"
                            >
                              <Upload className="w-4 h-4" />
                              <span className="text-[10px] font-bold uppercase tracking-wider">Upload New Logo</span>
                            </button>
                          )}
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
                          <button onClick={() => setEditingTeamId(null)} disabled={teamLoading} className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-300 hover:text-white bg-white/5 rounded-lg border border-white/10 disabled:opacity-50">Cancel</button>
                          <button onClick={() => handleSaveTeam(team.id)} disabled={teamLoading} className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white bg-fuchsia-600 hover:bg-fuchsia-500 rounded-lg shadow-[0_0_10px_rgba(219,39,119,0.5)] disabled:opacity-50">{teamLoading ? 'Saving...' : 'Save'}</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-fuchsia-600/20 border border-fuchsia-500/30 text-fuchsia-400 flex items-center justify-center font-bold text-sm overflow-hidden shadow-inner">
                            {team.logo_url ? <img src={team.logo_url} className="w-full h-full object-cover" /> : team.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-white tracking-wide">{team.name}</p>
                            <p className="text-xs text-slate-400">{matches.filter(m => m.team1_id === team.id || m.team2_id === team.id).length} matches</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => startEditingTeam(team)} className="p-2 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 rounded-lg transition-colors border border-transparent hover:border-cyan-500/30">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteTeam(team.id)} className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/30">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'matches' && (
        <div className="space-y-8">
          <div className="bg-black/40 backdrop-blur-xl p-6 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.8)] border border-fuchsia-500/30">
            <h2 className="text-lg font-semibold text-white tracking-wide mb-6">Enter Match Result</h2>
            
            {formError && (
              <div className="mb-6 p-3 bg-red-500/10 text-red-400 text-sm rounded-lg border border-red-500/30">
                {formError}
              </div>
            )}

            <form onSubmit={handleAddMatch} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-bold text-white uppercase tracking-wider mb-1">Date</label>
                  <input type="date" required value={matchDate} onChange={e => setMatchDate(e.target.value)} className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none text-white focus:ring-2 focus:ring-cyan-500/50" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-white uppercase tracking-wider mb-1">Overs Limit</label>
                  <input type="number" step="0.1" min="1" required value={oversLimit} onChange={e => setOversLimit(Number(e.target.value))} className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none text-white focus:ring-2 focus:ring-cyan-500/50" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-black/30 rounded-xl border border-white/10">
                <div>
                  <label className="block text-sm font-bold text-white uppercase tracking-wider mb-1">Team 1</label>
                  <select required value={team1Id} onChange={e => setTeam1Id(e.target.value)} className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none text-white focus:ring-2 focus:ring-cyan-500/50">
                    <option value="">Select Team</option>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-white uppercase tracking-wider mb-1">Team 2</label>
                  <select required value={team2Id} onChange={e => setTeam2Id(e.target.value)} className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none text-white focus:ring-2 focus:ring-cyan-500/50">
                    <option value="">Select Team</option>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-white uppercase tracking-wider mb-1">Batting First</label>
                  <select required value={battingFirstId} onChange={e => setBattingFirstId(e.target.value)} className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none text-white focus:ring-2 focus:ring-cyan-500/50">
                    <option value="">Select Team</option>
                    {team1Id && <option value={team1Id}>{teams.find(t => t.id === team1Id)?.name}</option>}
                    {team2Id && <option value={team2Id}>{teams.find(t => t.id === team2Id)?.name}</option>}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="p-4 border border-fuchsia-500/20 rounded-xl bg-black/40">
                  <h3 className="font-semibold text-white mb-4 flex items-center justify-between">
                    <span>{teams.find(t => t.id === team1Id)?.name || 'Team 1'} Innings</span>
                    {battingFirstId === team1Id && <span className="text-xs bg-fuchsia-600/20 border border-fuchsia-500/30 text-fuchsia-400 px-2 py-1 rounded">1st Innings</span>}
                    {battingFirstId === team2Id && <span className="text-xs bg-cyan-900/40 text-cyan-400 font-bold uppercase tracking-wider border border-cyan-500/30 px-2 py-1 rounded">2nd Innings</span>}
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Runs</label>
                      <input type="number" min="0" required disabled={result === 'no_result'} value={t1Runs} onChange={e => setT1Runs(Number(e.target.value))} className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none text-white disabled:bg-black/30" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Wkts</label>
                      <input type="number" min="0" max={(settings?.players_per_team || 11) - 1} required disabled={result === 'no_result'} value={t1Wickets} onChange={e => setT1Wickets(Number(e.target.value))} className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none text-white disabled:bg-black/30" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Overs</label>
                      <input type="number" step="0.1" min="0" max={oversLimit} required disabled={result === 'no_result'} value={t1Overs} onChange={e => setT1Overs(Number(e.target.value))} className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none text-white disabled:bg-black/30" />
                    </div>
                  </div>
                </div>

                <div className="p-4 border border-fuchsia-500/20 rounded-xl bg-black/40">
                  <h3 className="font-semibold text-white mb-4 flex items-center justify-between">
                    <span>{teams.find(t => t.id === team2Id)?.name || 'Team 2'} Innings</span>
                    {battingFirstId === team2Id && <span className="text-xs bg-fuchsia-600/20 border border-fuchsia-500/30 text-fuchsia-400 px-2 py-1 rounded">1st Innings</span>}
                    {battingFirstId === team1Id && <span className="text-xs bg-cyan-900/40 text-cyan-400 font-bold uppercase tracking-wider border border-cyan-500/30 px-2 py-1 rounded">2nd Innings</span>}
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Runs</label>
                      <input type="number" min="0" required disabled={result === 'no_result'} value={t2Runs} onChange={e => setT2Runs(Number(e.target.value))} className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none text-white disabled:bg-black/30" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Wkts</label>
                      <input type="number" min="0" max={(settings?.players_per_team || 11) - 1} required disabled={result === 'no_result'} value={t2Wickets} onChange={e => setT2Wickets(Number(e.target.value))} className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none text-white disabled:bg-black/30" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Overs</label>
                      <input type="number" step="0.1" min="0" max={oversLimit} required disabled={result === 'no_result'} value={t2Overs} onChange={e => setT2Overs(Number(e.target.value))} className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none text-white disabled:bg-black/30" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-black/30 rounded-xl border border-white/10">
                <label className="block text-sm font-bold text-white uppercase tracking-wider mb-2">Match Result</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <label className={`flex items-center justify-center px-4 py-3 border rounded-xl cursor-pointer transition-colors ${result === 'team1_win' ? 'bg-fuchsia-600/20 border-fuchsia-500 text-fuchsia-400' : 'bg-black/20 border-white/10 text-slate-400 hover:border-white/30'}`}>
                    <input type="radio" className="hidden" checked={result === 'team1_win'} onChange={() => setResult('team1_win')} />
                    <span className="text-sm font-medium">Team 1 Win</span>
                  </label>
                  <label className={`flex items-center justify-center px-4 py-3 border rounded-xl cursor-pointer transition-colors ${result === 'team2_win' ? 'bg-fuchsia-600/20 border-fuchsia-500 text-fuchsia-400' : 'bg-black/20 border-white/10 text-slate-400 hover:border-white/30'}`}>
                    <input type="radio" className="hidden" checked={result === 'team2_win'} onChange={() => setResult('team2_win')} />
                    <span className="text-sm font-medium">Team 2 Win</span>
                  </label>
                  <label className={`flex items-center justify-center px-4 py-3 border rounded-xl cursor-pointer transition-colors ${result === 'tie' ? 'bg-cyan-500/20 border-cyan-400 text-cyan-400' : 'bg-black/20 border-white/10 text-slate-400 hover:border-white/30'}`}>
                    <input type="radio" className="hidden" checked={result === 'tie'} onChange={() => setResult('tie')} />
                    <span className="text-sm font-medium">Tie</span>
                  </label>
                  <label className={`flex items-center justify-center px-4 py-3 border rounded-xl cursor-pointer transition-colors ${result === 'no_result' ? 'bg-slate-700 border-slate-500 text-white' : 'bg-black/20 border-white/10 text-slate-400 hover:border-white/30'}`}>
                    <input type="radio" className="hidden" checked={result === 'no_result'} onChange={() => setResult('no_result')} />
                    <span className="text-sm font-medium">No Result</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button type="submit" disabled={matchLoading} className="flex items-center gap-2 py-3 px-6 rounded-xl text-sm font-black text-white bg-gradient-to-r from-fuchsia-600 to-cyan-500 hover:from-fuchsia-500 hover:to-cyan-400 tracking-wider uppercase border-none shadow-[0_0_20px_rgba(219,39,119,0.3)] hover:shadow-[0_0_30px_rgba(219,39,119,0.5)] disabled:opacity-50">
                  <Plus className="w-5 h-5" /> Add Match Result
                </button>
              </div>
            </form>
          </div>

          <div className="bg-black/40 backdrop-blur-xl p-6 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.8)] border border-fuchsia-500/30">
            <h2 className="text-lg font-semibold text-white tracking-wide mb-4">Past Matches</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-black/30 text-cyan-400 font-bold uppercase tracking-widest text-xs border-b border-white/10">
                    <th className="p-4">Date</th>
                    <th className="p-4">Match</th>
                    <th className="p-4">Result</th>
                    <th className="p-4">Score</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {matches.map(m => {
                    const t1 = teams.find(t => t.id === m.team1_id)?.name || 'Unknown'
                    const t2 = teams.find(t => t.id === m.team2_id)?.name || 'Unknown'
                    let resStr = 'No Result'
                    if (m.result === 'team1_win') resStr = `${t1} won`
                    if (m.result === 'team2_win') resStr = `${t2} won`
                    if (m.result === 'tie') resStr = 'Tie'
                    
                    return (
                      <tr key={m.id} className="hover:bg-black/30 transition-colors group">
                        <td className="p-4 text-sm text-slate-300">{new Date(m.match_date).toLocaleDateString()}</td>
                        <td className="p-4 font-semibold text-white">{t1} <span className="text-cyan-400 text-xs mx-2">VS</span> {t2}</td>
                        <td className="p-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs bg-fuchsia-600/20 text-fuchsia-400 border border-fuchsia-500/30 font-bold uppercase tracking-wider">
                            {resStr}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-slate-300">
                          {m.result !== 'no_result' ? (
                            <>
                              <div>{t1}: {m.team1_runs}/{m.team1_wickets} ({m.team1_overs})</div>
                              <div>{t2}: {m.team2_runs}/{m.team2_wickets} ({m.team2_overs})</div>
                            </>
                          ) : '-'}
                        </td>
                        <td className="p-4 text-right">
                          <button onClick={() => handleDeleteMatch(m.id)} className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/30">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
