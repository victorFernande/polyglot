import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Globe, Waves, BookOpen, Trophy, Users, User, Menu, X, Gamepad2, Layers } from 'lucide-react'

const navItems = [
  { path: '/', label: 'Dashboard', icon: Globe },
  { path: '/waves', label: 'Ondas', icon: Waves },
  { path: '/exercises', label: 'Exercícios', icon: Gamepad2 },
  { path: '/flashcards', label: 'Flashcards', icon: Layers },
  { path: '/study', label: 'Estudar', icon: BookOpen },
  { path: '/achievements', label: 'Conquistas', icon: Trophy },
  { path: '/leaderboard', label: 'Ranking', icon: Users },
  { path: '/profile', label: 'Perfil', icon: User },
]

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  return (
    <div className="min-h-screen bg-polyglot-dark flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-polyglot-card border-r border-white/10 transform transition-transform duration-300 lg:translate-x-0 lg:static lg:inset-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <Link to="/" className="flex items-center gap-3">
            <span className="text-3xl">🌍</span>
            <span className="text-xl font-bold bg-gradient-to-r from-polyglot-accent to-polyglot-gold bg-clip-text text-transparent">
              Polyglot
            </span>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-white/60 hover:text-white">
            <X size={24} />
          </button>
        </div>
        
        <nav className="p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  isActive 
                    ? 'bg-polyglot-accent/20 text-polyglot-accent border border-polyglot-accent/30' 
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon size={20} />
                <span className="font-medium">{item.label}</span>
              </Link>
            )
          })}
        </nav>
        
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
          <div className="text-xs text-gray-500 text-center">
            @victorFernande
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between p-4 bg-polyglot-card border-b border-white/10">
          <button onClick={() => setSidebarOpen(true)} className="text-white/60 hover:text-white">
            <Menu size={24} />
          </button>
          <span className="text-lg font-bold bg-gradient-to-r from-polyglot-accent to-polyglot-gold bg-clip-text text-transparent">
            Polyglot
          </span>
          <div className="w-6" />
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
