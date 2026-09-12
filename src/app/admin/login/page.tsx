'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Lock, ArrowLeft } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/admin')
      router.refresh()
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex-1 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-fuchsia-600/10 blur-[150px] rounded-full pointer-events-none" />
      
      <div className="relative z-10 max-w-md w-full space-y-8 bg-black/40 backdrop-blur-xl p-10 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.8)] border border-fuchsia-500/30 transition-all">
        <div>
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-fuchsia-600/20 to-cyan-500/20 border border-fuchsia-500/30 shadow-[0_0_15px_rgba(219,39,119,0.2)]">
            <Lock className="h-8 w-8 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-black text-white tracking-widest uppercase drop-shadow-md">
            Admin Login
          </h2>
          <p className="mt-2 text-center text-sm font-bold text-cyan-400 uppercase tracking-widest">
            Secure match entry portal
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          {error && (
            <div className="p-4 bg-red-500/10 text-red-400 text-sm font-bold tracking-wide rounded-xl border border-red-500/30 text-center shadow-inner">
              {error}
            </div>
          )}
          
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2 tracking-widest uppercase" htmlFor="email">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none block w-full px-4 py-3 bg-black/50 border border-white/10 placeholder-slate-500 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all sm:text-sm shadow-inner"
                placeholder="admin@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2 tracking-widest uppercase" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none block w-full px-4 py-3 bg-black/50 border border-white/10 placeholder-slate-500 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all sm:text-sm shadow-inner"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3.5 px-4 border border-fuchsia-500/20 text-sm font-black rounded-xl text-white bg-gradient-to-r from-fuchsia-600 to-cyan-500 hover:from-fuchsia-500 hover:to-cyan-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#020617] focus:ring-fuchsia-500 disabled:opacity-50 transition-all duration-300 shadow-[0_0_20px_rgba(219,39,119,0.3)] hover:shadow-[0_0_30px_rgba(219,39,119,0.5)] hover:-translate-y-0.5 tracking-widest uppercase"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </div>
        </form>

        <div className="pt-6 mt-6 border-t border-white/10 text-center">
          <Link href="/standings" className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-cyan-400 transition-colors group tracking-wider uppercase">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            View Points Table
          </Link>
        </div>
      </div>
    </div>
  )
}
