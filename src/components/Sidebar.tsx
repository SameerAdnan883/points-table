'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Trophy, Clock, Lock, Menu, X } from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Mobile Toggle */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 right-4 z-50 p-2 bg-black/60 backdrop-blur-md border border-fuchsia-500/30 rounded-xl text-white shadow-[0_0_15px_rgba(219,39,119,0.3)]"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Sidebar Container */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-black/80 backdrop-blur-2xl border-r border-fuchsia-500/30 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:block",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full p-6">
          <div className="flex items-center gap-3 mb-10">
            <div className="p-2 bg-gradient-to-br from-fuchsia-600/20 to-cyan-500/20 rounded-xl border border-fuchsia-500/30 shadow-[0_0_15px_rgba(219,39,119,0.2)]">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl font-black text-white tracking-widest uppercase">Points<br/>Table</h2>
          </div>

          <nav className="flex-1 space-y-4">
            <Link 
              href="/"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-3 text-cyan-400 bg-cyan-900/20 border border-cyan-500/30 rounded-xl font-bold uppercase tracking-wider transition-colors shadow-[0_0_10px_rgba(6,182,212,0.1)]"
            >
              <Trophy className="w-5 h-5" />
              Standings
            </Link>
            
            <Link 
              href="/#recent-matches"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:text-white hover:bg-white/5 rounded-xl font-bold uppercase tracking-wider transition-colors"
            >
              <Clock className="w-5 h-5" />
              Recent Matches
            </Link>

            <div className="h-px bg-white/10 w-full my-4" />

            <Link 
              href="/admin/login"
              className="flex items-center gap-3 px-4 py-3 text-fuchsia-400 hover:text-fuchsia-300 hover:bg-fuchsia-600/10 rounded-xl font-bold uppercase tracking-wider transition-colors"
            >
              <Lock className="w-5 h-5" />
              Admin Login
            </Link>
          </nav>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}
