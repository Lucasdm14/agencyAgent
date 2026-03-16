'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Inbox, Users, Zap, CalendarDays, LogOut,
  TrendingUp, BarChart3, Sparkles, Bot,
} from 'lucide-react'

const nav = [
  { href: '/dashboard/inbox',       icon: Inbox,        label: 'Bandeja',     group: 'main' },
  { href: '/dashboard/generate',    icon: Zap,           label: 'Generar',     group: 'main' },
  { href: '/dashboard/brands',      icon: Users,         label: 'Clientes',    group: 'main' },
  { href: '/dashboard/agents',      icon: Bot,           label: 'Agentes',     group: 'main' },
  { href: '/dashboard/calendar',    icon: CalendarDays,  label: 'Calendario',  group: 'main' },
  { href: '/dashboard/competitors', icon: TrendingUp,    label: 'Competidores', group: 'intel' },
  { href: '/dashboard/metrics',     icon: BarChart3,     label: 'Métricas',    group: 'intel' },
  { href: '/dashboard/strategy',    icon: Sparkles,      label: 'Estrategia',  group: 'intel' },
]

export function Sidebar({ email }: { email: string }) {
  const path   = usePathname()
  const router = useRouter()

  async function logout() {
    await fetch('/api/auth', { method: 'DELETE' })
    router.push('/auth/login')
    router.refresh()
  }

  const mainNav  = nav.filter(n => n.group === 'main')
  const intelNav = nav.filter(n => n.group === 'intel')

  function NavItem({ href, icon: Icon, label }: typeof nav[0]) {
    const active = path.startsWith(href)
    return (
      <Link href={href}
        className={`flex items-center gap-3 px-3 py-2.5 rounded text-sm transition-all
          ${active
            ? 'bg-accent text-white font-medium'
            : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}>
        <Icon size={16} />
        {label}
      </Link>
    )
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-56 bg-ink flex flex-col py-8 px-4 z-30">
      {/* Logo */}
      <div className="mb-10 px-2">
        <span className="font-display text-3xl text-white tracking-tight">AutoCM</span>
        <p className="text-xs text-white/40 mt-0.5 font-mono">Agency Copilot</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-4">
        <div className="space-y-1">
          {mainNav.map(item => <NavItem key={item.href} {...item} />)}
        </div>

        <div>
          <p className="px-3 text-xs text-white/25 uppercase tracking-widest mb-2 font-mono">
            Inteligencia
          </p>
          <div className="space-y-1">
            {intelNav.map(item => <NavItem key={item.href} {...item} />)}
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-white/10 pt-4 space-y-3">
        <p className="text-xs text-white/40 px-2 truncate font-mono">{email}</p>
        <button onClick={logout}
          className="flex items-center gap-2 text-xs text-white/50 hover:text-white px-2 transition-colors">
          <LogOut size={14} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
