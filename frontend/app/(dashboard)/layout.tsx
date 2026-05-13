'use client'
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { isAuthenticated, logout } from '@/lib/auth'
import {
  LayoutDashboard, Package, TrendingDown, UserCheck,
  Wrench, BarChart2, Tag, ShieldCheck, Settings,
  ChevronLeft, ChevronRight, Bell, Sun, Moon, HelpCircle, PlusCircle, MapPin, Layers,
} from 'lucide-react'

const NAV_SECTIONS = [
  {
    label: 'Principal',
    items: [
      { href: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
      { href: '/activos',      icon: Package,         label: 'Inventario' },
      { href: '/activos/nuevo',icon: PlusCircle,      label: 'Nuevo Activo' },
    ],
  },
  {
    label: 'Gestión',
    items: [
      { href: '/depreciacion',  icon: TrendingDown, label: 'Depreciación' },
      { href: '/asignaciones',  icon: UserCheck,    label: 'Asignaciones' },
      { href: '/mantenimiento', icon: Wrench,       label: 'Mantenimiento' },
    ],
  },
  {
    label: 'Configuración',
    items: [
      { href: '/taxonomia',  icon: Layers,     label: 'Grupos y Clases' },
      { href: '/sucursales', icon: MapPin,     label: 'Sucursales' },
      { href: '/reportes',   icon: BarChart2,  label: 'Reportes' },
      { href: '/auditoria',  icon: ShieldCheck,label: 'Auditoría' },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { href: '/configuracion', icon: Settings, label: 'Configuración' },
    ],
  },
]

const FONT = 'var(--clt-font-display)'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [dark, setDark]           = useState(true)

  useEffect(() => {
    if (!isAuthenticated()) router.push('/login')
  }, [router])

  const isActive = (href: string) => {
    if (href === '/activos/nuevo') return pathname === '/activos/nuevo'
    if (href === '/activos') return pathname === '/activos' || (pathname.startsWith('/activos/') && pathname !== '/activos/nuevo')
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const allItems = NAV_SECTIONS.flatMap(s => s.items)
  const currentLabel = allItems.find(n => isActive(n.href))?.label ?? 'Dashboard'

  return (
    <div
      className={`flex h-screen overflow-hidden ${dark ? '' : 'theme-light'}`}
      style={{ background: 'var(--t-bg-app)' }}
    >
      {/* ── Sidebar ── */}
      <aside
        className="flex flex-col flex-shrink-0 relative overflow-hidden"
        style={{
          width: collapsed ? 52 : 220,
          background: '#0a1018',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          zIndex: 100,
          transition: 'width 220ms var(--clt-ease)',
        }}
      >
        {/* Orb decorations */}
        <div style={{ position: 'absolute', top: -80, left: -60, width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle, rgba(104,116,181,0.25) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: 40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle, rgba(108,190,218,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* ── Logo ── */}
        <div
          className="relative z-10 flex-shrink-0"
          style={{ padding: '20px 14px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Image
              src="/assets/logo_clt_on_dark.png"
              alt="CLT S.A."
              width={90}
              height={22}
              style={{ objectFit: 'contain', width: collapsed ? 28 : 90, height: 'auto', transition: 'width 220ms var(--clt-ease)', flexShrink: 0 }}
              priority
            />
            {!collapsed && (
              <button
                onClick={() => setCollapsed(true)}
                style={{ width: 24, height: 24, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)', borderRadius: 4, flexShrink: 0 }}
              >
                <ChevronLeft size={12} />
              </button>
            )}
            {collapsed && (
              <button
                onClick={() => setCollapsed(false)}
                style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', width: 20, height: 36, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.03)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)', borderRadius: '0 4px 4px 0' }}
              >
                <ChevronRight size={10} />
              </button>
            )}
          </div>
          {!collapsed && (
            <div style={{ marginTop: 10, overflow: 'hidden' }}>
              <p style={{ fontFamily: FONT, fontWeight: 900, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', background: 'linear-gradient(90deg, var(--clt-violet), var(--clt-cyan))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', whiteSpace: 'nowrap', margin: 0 }}>
                Activo Fijo
              </p>
              <p style={{ fontFamily: 'var(--clt-font-body)', fontSize: 10, color: 'rgba(255,255,255,0.25)', whiteSpace: 'nowrap', margin: 0 }}>
                Plataforma CLT
              </p>
            </div>
          )}
        </div>

        {/* ── Nav ── */}
        <nav className="flex-1 overflow-y-auto scrollbar-thin relative z-10 py-2">
          {NAV_SECTIONS.map(section => (
            <div key={section.label}>
              {!collapsed && (
                <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', padding: '14px 14px 4px', whiteSpace: 'nowrap' }}>
                  {section.label}
                </div>
              )}
              {collapsed && <div style={{ height: 24 }} />}
              {section.items.map(({ href, icon: Icon, label }) => {
                const active = isActive(href)
                return (
                  <Link
                    key={href}
                    href={href}
                    title={collapsed ? label : undefined}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 9,
                      padding: collapsed ? '8px 0' : '8px 14px',
                      justifyContent: collapsed ? 'center' : undefined,
                      color: active ? '#fff' : 'rgba(255,255,255,0.4)',
                      background: active ? 'rgba(104,116,181,0.12)' : 'none',
                      borderLeft: collapsed ? 'none' : `2px solid ${active ? '#6874B5' : 'transparent'}`,
                      fontFamily: FONT, fontWeight: 600, fontSize: 12,
                      textDecoration: 'none', whiteSpace: 'nowrap', overflow: 'hidden',
                      transition: 'all 120ms', position: 'relative',
                    }}
                    onMouseEnter={e => { if (!active) { const el = e.currentTarget as HTMLAnchorElement; el.style.background = 'rgba(255,255,255,0.04)'; el.style.color = 'rgba(255,255,255,0.75)' } }}
                    onMouseLeave={e => { if (!active) { const el = e.currentTarget as HTMLAnchorElement; el.style.background = 'none'; el.style.color = 'rgba(255,255,255,0.4)' } }}
                  >
                    <Icon size={15} style={{ flexShrink: 0, color: active ? '#6CBEDA' : undefined }} />
                    {!collapsed && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>}
                    {collapsed && active && (
                      <span style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: 2, background: '#6874B5', borderRadius: '0 2px 2px 0' }} />
                    )}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        {/* ── User footer ── */}
        <div
          className="relative z-10 flex-shrink-0"
          style={{
            borderTop: '1px solid rgba(255,255,255,0.05)',
            padding: collapsed ? '12px 0' : '12px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            justifyContent: collapsed ? 'center' : undefined,
            overflow: 'hidden',
          }}
        >
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, #6874B5, #6CBEDA)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: FONT, fontWeight: 900, fontSize: 10, color: '#fff', boxShadow: '0 0 12px rgba(104,116,181,0.4)' }}>
            GC
          </div>
          {!collapsed && (
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: 12, color: 'rgba(255,255,255,0.8)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>Giovanni Caceres</p>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', whiteSpace: 'nowrap', margin: 0 }}>Administrador</p>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* ── Topbar ── */}
        <header
          className="flex items-center flex-shrink-0 relative"
          style={{
            height: 50,
            paddingLeft: 24,
            paddingRight: 24,
            gap: 12,
            background: dark ? 'rgba(13,21,32,0.85)' : 'rgba(255,255,255,0.92)',
            borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'}`,
            backdropFilter: 'blur(12px)',
            zIndex: 90,
          }}
        >
          {/* Gradient accent line */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(104,116,181,0.5), rgba(108,190,218,0.5), transparent)' }} />

          {/* Module title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, letterSpacing: '0.06em', color: 'var(--t-text-4)', whiteSpace: 'nowrap' }}>
              CLT S.A.
            </span>
            <span style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />
            <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 12, color: 'var(--t-text-1)', whiteSpace: 'nowrap' }}>
              {currentLabel}
            </span>
          </div>

          {/* Right actions */}
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setDark(!dark)}
              style={{ width: 30, height: 30, border: `1px solid ${dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'}`, background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', cursor: 'pointer', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: dark ? 'rgba(255,255,255,0.4)' : 'rgba(26,37,53,0.5)' }}
            >
              {dark ? <Sun size={13} /> : <Moon size={13} />}
            </button>

            {/* Bell with notification dot */}
            <div style={{ position: 'relative' }}>
              <button style={{ width: 30, height: 30, border: `1px solid ${dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'}`, background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', cursor: 'pointer', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: dark ? 'rgba(255,255,255,0.4)' : 'rgba(26,37,53,0.5)' }}>
                <Bell size={13} />
              </button>
              <span style={{ position: 'absolute', top: 5, right: 5, width: 6, height: 6, borderRadius: '50%', background: '#E53E3E', boxShadow: '0 0 6px #E53E3E', border: `1.5px solid ${dark ? '#0d1520' : '#fff'}` }} />
            </div>

            <button style={{ width: 30, height: 30, border: `1px solid ${dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'}`, background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', cursor: 'pointer', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: dark ? 'rgba(255,255,255,0.4)' : 'rgba(26,37,53,0.5)' }}>
              <HelpCircle size={13} />
            </button>

            {/* User avatar */}
            <button
              onClick={logout}
              title="Cerrar sesión"
              style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, #6874B5, #6CBEDA)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontWeight: 900, fontSize: 11, color: '#fff', border: 'none', cursor: 'pointer' }}
            >
              GC
            </button>
          </div>
        </header>

        {/* ── Page content ── */}
        <main className="flex-1 overflow-y-auto scrollbar-thin" style={{ padding: 24 }}>
          {children}
        </main>
      </div>
    </div>
  )
}
