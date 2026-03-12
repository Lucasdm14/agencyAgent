'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { Profile } from '@/lib/types'
import {
  LayoutDashboard,
  Building2,
  Bot,
  Calendar,
  CheckSquare,
  BarChart3,
  Settings,
  Sparkles,
  MessageSquare,
  FileText,
  UserPlus,
  Users,
} from 'lucide-react'

interface DashboardSidebarProps {
  profile: Profile
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'creator', 'client', 'guest'] },
  { name: 'Marcas', href: '/dashboard/brands', icon: Building2, roles: ['admin', 'creator'] },
  { name: 'Agentes AI', href: '/dashboard/agents', icon: Bot, roles: ['admin', 'creator'] },
  { name: 'Estrategia', href: '/dashboard/generate', icon: Sparkles, roles: ['admin', 'creator'] },
  { name: 'Historial', href: '/dashboard/content', icon: FileText, roles: ['admin', 'creator'] },
  { name: 'Calendario', href: '/dashboard/calendar', icon: Calendar, roles: ['admin', 'creator'] },
  { name: 'Validacion', href: '/dashboard/validation', icon: CheckSquare, roles: ['admin', 'creator', 'client', 'guest'] },
  { name: 'Metricas', href: '/dashboard/competitors', icon: BarChart3, roles: ['admin', 'creator'] },
  { name: 'Invitaciones', href: '/dashboard/invitations', icon: UserPlus, roles: ['admin'] },
  { name: 'Configuracion', href: '/dashboard/settings', icon: Settings, roles: ['admin'] },
]

export function DashboardSidebar({ profile }: DashboardSidebarProps) {
  const pathname = usePathname()

  const filteredNavigation = navigation.filter(item => 
    item.roles.includes(profile.role)
  )

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar border-r border-sidebar-border">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 px-6 border-b border-sidebar-border">
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          <span className="text-lg font-semibold text-sidebar-foreground">AgencyCopilot</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {filteredNavigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* User info */}
        <div className="border-t border-sidebar-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-sidebar-accent flex items-center justify-center">
              <span className="text-sm font-medium text-sidebar-accent-foreground">
                {profile.full_name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {profile.full_name}
              </p>
              <p className="text-xs text-sidebar-foreground/60 capitalize">
                {profile.role}
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
