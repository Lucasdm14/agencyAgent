'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Inbox, Users, Zap, CalendarDays, LogOut, Bot,
  TrendingUp, BarChart3, Sparkles, Megaphone, Share2, ChevronRight,
} from 'lucide-react'

const nav = [
  { href: '/dashboard/inbox',      icon: Inbox,       label: 'Bandeja',     badge: null },
  { href: '/dashboard/generate',   icon: Zap,          label: 'Generar',     badge: null },
  { href: '/dashboard/strategy',   icon: Sparkles,     label: 'Estrategia',  badge: null },
  { href: '/dashboard/campaigns',  icon: Megaphone,    label: 'Campañas',    badge: null },
  { href: '/dashboard/calendar',   icon: CalendarDays, label: 'Calendario',  badge: null },
]

const navIntel = [
  { href: '/dashboard/competitors', icon: TrendingUp, label: 'Competidores' },
  { href: '/dashboard/metrics',     icon: BarChart3,  label: 'Métricas' },
]

const navSettings = [
  { href: '/dashboard/brands', icon: Users, label: 'Clientes' },
  { href: '/dashboard/agents', icon: Bot,   label: 'Agentes' },
  { href: '/dashboard/social', icon: Share2, label: 'Redes sociales' },
]

export function Sidebar({ email }: { email: string }) {
  const path   = usePathname()
  const router = useRouter()

  async function logout() {
    await fetch('/api/auth', { method: 'DELETE' })
    router.push('/auth/login')
    router.refresh()
  }

  function NavLink({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) {
    const active = path === href || (href !== '/dashboard' && path.startsWith(href))
    return (
      <Link href={href}
        className={`group flex items-center gap-2.5 px-3 py-1.5 rounded text-sm transition-all duration-100
          ${active
            ? 'bg-white/10 text-white'
            : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}>
        <Icon size={15} className={active ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'} />
        {label}
        {active && <ChevronRight size={12} className="ml-auto text-zinc-500" />}
      </Link>
    )
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-52 bg-[#111111] border-r border-[#2a2a2a] flex flex-col z-30">
      {/* Logo */}
      <div className="px-4 pt-5 pb-4 border-b border-[#2a2a2a]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-white flex items-center justify-center">
            <Sparkles size={13} className="text-black" />
          </div>
          <span className="text-white font-semibold text-sm tracking-tight">AutoCM</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-5">
        {/* Main */}
        <div className="space-y-0.5">
          {nav.map(item => <NavLink key={item.href} {...item} />)}
        </div>

        {/* Intel */}
        <div>
          <p className="px-3 mb-1.5 text-2xs font-medium text-zinc-600 uppercase tracking-widest">Inteligencia</p>
          <div className="space-y-0.5">
            {navIntel.map(item => <NavLink key={item.href} {...item} />)}
          </div>
        </div>

        {/* Settings */}
        <div>
          <p className="px-3 mb-1.5 text-2xs font-medium text-zinc-600 uppercase tracking-widest">Configuración</p>
          <div className="space-y-0.5">
            {navSettings.map(item => <NavLink key={item.href} {...item} />)}
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="px-2 py-3 border-t border-[#2a2a2a]">
        <div className="px-3 py-2 rounded hover:bg-white/5 transition-colors">
          <p className="text-xs text-zinc-500 truncate font-mono">{email}</p>
          <button onClick={logout}
            className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-300 mt-1 transition-colors">
            <LogOut size={11} /> Cerrar sesión
          </button>
        </div>
      </div>
    </aside>
  )
}
