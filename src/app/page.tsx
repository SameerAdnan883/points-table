import Link from 'next/link'
import { Trophy, Lock, Phone } from 'lucide-react'

export default function LandingPage() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center p-4 relative overflow-hidden min-h-[calc(100vh-4rem)]">
      {/* Background Decorative Elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyan-900/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-900/10 blur-[100px] rounded-full pointer-events-none" />
      
      {/* Main Glassmorphism Card */}
      <div className="relative z-10 w-full max-w-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-8 sm:p-12 rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.5)] text-center flex flex-col items-center">
        
        {/* Header Icon */}
        <div className="w-20 h-20 mb-6 rounded-full bg-gradient-to-br from-amber-400/20 to-cyan-500/20 border border-white/10 flex items-center justify-center shadow-inner">
          <Trophy className="w-10 h-10 text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]" />
        </div>

        {/* Titles */}
        <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400 tracking-tight mb-3">
          CRICKET POINTS TABLE
        </h1>
        <p className="text-lg sm:text-xl text-cyan-400/90 font-medium tracking-wide uppercase mb-10">
          Official League Standings
        </p>

        {/* Sponsor Section */}
        <div className="w-full max-w-md bg-black/20 border border-white/5 rounded-2xl p-6 mb-10 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-500/5 to-amber-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />
          <p className="text-slate-400 text-sm uppercase tracking-wider mb-2">Sponsored By</p>
          <p className="text-2xl font-bold text-amber-400 tracking-wide mb-3 drop-shadow-md">Sameer Adnan</p>
          <div className="flex items-center justify-center gap-2 text-cyan-300">
            <Phone className="w-4 h-4" />
            <span className="font-semibold tracking-wider">8197359747</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
          <Link 
            href="/standings" 
            className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white rounded-xl font-bold tracking-wide transition-all duration-300 shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] hover:-translate-y-1"
          >
            <Trophy className="w-5 h-5" />
            VIEW TABLE
          </Link>
          <Link 
            href="/admin/login" 
            className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-500/50 text-white rounded-xl font-bold tracking-wide transition-all duration-300 hover:shadow-[0_0_20px_rgba(251,191,36,0.15)] hover:-translate-y-1"
          >
            <Lock className="w-5 h-5 text-amber-400" />
            ADMIN LOGIN
          </Link>
        </div>
      </div>
    </main>
  )
}
