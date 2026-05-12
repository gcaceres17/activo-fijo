'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import type { KPIs, Activo, Mantenimiento, PaginatedActivos } from '@/types'
import { Download, Plus, Package, Wrench, TrendingUp, TrendingDown } from 'lucide-react'

// ── Helpers ───────────────────────────────────────────────────────────────────

const FONT = 'var(--clt-font-display)'

function fmtM(n: number) {
  return `₲${new Intl.NumberFormat('es-PY').format(Math.round(n / 1_000_000))}M`
}

function fmtDate(d?: string | null) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('es-PY', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function pct(a: number, b: number) {
  return b > 0 ? Math.round((a / b) * 100) : 0
}

// ── Sub-components ────────────────────────────────────────────────────────────

const ESTADO_STYLES: Record<string, { bg: string; color: string; border: string; label: string }> = {
  activo:           { bg: 'rgba(27,122,62,0.12)',   color: '#4ADE80', border: 'rgba(74,222,128,0.2)',   label: 'Activo' },
  en_mantenimiento: { bg: 'rgba(245,166,35,0.12)',  color: '#FBB040', border: 'rgba(251,176,64,0.2)',   label: 'En Mantenimiento' },
  dado_de_baja:     { bg: 'rgba(239,68,68,0.12)',   color: '#F87171', border: 'rgba(248,113,113,0.2)',  label: 'Dado de Baja' },
  reservado:        { bg: 'rgba(104,116,181,0.15)', color: '#A5B4FC', border: 'rgba(165,180,252,0.2)',  label: 'Reservado' },
  en_proceso:       { bg: 'rgba(245,166,35,0.12)',  color: '#FBB040', border: 'rgba(251,176,64,0.2)',   label: 'En Proceso' },
  programado:       { bg: 'rgba(104,116,181,0.15)', color: '#A5B4FC', border: 'rgba(165,180,252,0.2)',  label: 'Programado' },
  completado:       { bg: 'rgba(27,122,62,0.12)',   color: '#4ADE80', border: 'rgba(74,222,128,0.2)',   label: 'Completado' },
}

function Badge({ estado }: { estado: string }) {
  const key = estado.toLowerCase().replace(/ /g, '_')
  const s = ESTADO_STYLES[key] ?? {
    bg: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)',
    border: 'rgba(255,255,255,0.1)', label: estado,
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 9999, background: s.bg, color: s.color, border: `1px solid ${s.border}`, fontFamily: FONT, fontWeight: 700, fontSize: 10, letterSpacing: '0.07em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.color, flexShrink: 0, boxShadow: `0 0 6px ${s.color}` }} />
      {s.label}
    </span>
  )
}

interface DonutSeg { value: number; color: string }

function Donut({ segments, size = 88, stroke = 14 }: { segments: DonutSeg[]; size?: number; stroke?: number }) {
  const r     = (size - stroke) / 2
  const circ  = 2 * Math.PI * r
  const total = segments.reduce((s, x) => s + x.value, 0)
  let offset  = 0
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={stroke} />
      {segments.map((seg, i) => {
        const dash = total > 0 ? (seg.value / total) * circ : 0
        const el = (
          <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={seg.color} strokeWidth={stroke}
            strokeDasharray={`${dash} ${circ}`} strokeDashoffset={-offset}
            strokeLinecap="round" />
        )
        offset += dash
        return el
      })}
    </svg>
  )
}

function MiniBar({ data, color = '#4ADE80' }: { data: number[]; color?: string }) {
  const max = Math.max(...data, 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 28 }}>
      {data.map((v, i) => (
        <div key={i} style={{ flex: 1, background: color, opacity: 0.2 + 0.8 * (v / max), height: `${Math.max(8, (v / max) * 100)}%`, borderRadius: 2 }} />
      ))}
    </div>
  )
}

function KPICard({ label, value, sub, icon, trend, trendUp, gradient }: {
  label: string; value: string; sub: string; icon: React.ReactNode
  trend?: string; trendUp?: boolean; gradient?: boolean
}) {
  return (
    <div
      style={{
        background: gradient
          ? 'linear-gradient(135deg, rgba(104,116,181,0.2) 0%, rgba(108,190,218,0.1) 100%)'
          : 'var(--t-bg-card)',
        border: `1px solid ${gradient ? 'rgba(104,116,181,0.3)' : 'var(--t-border)'}`,
        padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 6,
        position: 'relative', overflow: 'hidden', backdropFilter: 'blur(8px)',
        transition: 'border-color 200ms, transform 200ms',
      }}
      onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = 'rgba(104,116,181,0.5)'; el.style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = gradient ? 'rgba(104,116,181,0.3)' : 'var(--t-border)'; el.style.transform = '' }}
    >
      {gradient && <div style={{ position: 'absolute', right: -30, top: -30, width: 100, height: 100, borderRadius: '50%', background: 'var(--clt-gradient)', opacity: 0.15, filter: 'blur(20px)' }} />}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--t-text-4)' }}>{label}</span>
        <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--t-bg-card3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: gradient ? '#6CBEDA' : 'var(--t-text-5)' }}>
          {icon}
        </div>
      </div>
      <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 30, color: 'var(--t-text-white)', letterSpacing: '-0.02em', lineHeight: 1, marginTop: 4 }}>{value}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {trend && (
          <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 10, letterSpacing: '0.06em', color: trendUp ? '#4ADE80' : '#F87171', background: trendUp ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)', padding: '2px 6px', borderRadius: 4 }}>
            {trendUp ? '↑' : '↓'} {trend}
          </span>
        )}
        <span style={{ fontSize: 11, color: 'var(--t-text-5)', fontFamily: FONT }}>{sub}</span>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter()
  const [kpis, setKpis]           = useState<KPIs | null>(null)
  const [activos, setActivos]     = useState<Activo[]>([])
  const [mants, setMants]         = useState<Mantenimiento[]>([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    Promise.allSettled([
      api.get<KPIs>('/v1/activos/kpis'),
      api.get<PaginatedActivos>('/v1/activos?page_size=5&sort=created_at:desc'),
      api.get<{ items: Mantenimiento[] }>('/v1/mantenimientos?page_size=5'),
    ]).then(([kr, ar, mr]) => {
      if (kr.status === 'fulfilled') setKpis(kr.value)
      if (ar.status === 'fulfilled') setActivos(ar.value.items ?? [])
      if (mr.status === 'fulfilled') setMants(mr.value.items ?? [])
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 256 }}>
      <div style={{ width: 32, height: 32, border: '2px solid #6874B5', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  const totalActivos = kpis?.total_activos               ?? 0
  const enMant       = kpis?.en_mantenimiento            ?? 0
  const dadosBaja    = kpis?.dados_de_baja               ?? 0
  const reservados   = kpis?.reservados                  ?? 0
  const valorLibros  = kpis?.valor_libro_total           ?? 0
  const depAcum      = kpis?.depreciacion_acumulada_total ?? 0
  const valorCartera = kpis?.valor_total_cartera         ?? 0
  const activosCount = Math.max(0, totalActivos - enMant - dadosBaja - reservados)

  const maxCat     = Math.max(...(kpis?.por_categoria ?? []).map(c => c.total), 1)
  const pendientes = mants.filter(m => m.estado !== 'completado')
  const today      = new Date().toLocaleDateString('es-PY', { day: '2-digit', month: 'long', year: 'numeric' })

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontFamily: FONT, fontWeight: 900, fontSize: 24, color: 'var(--t-text-white)', margin: 0, lineHeight: 1.1, letterSpacing: '-0.02em' }}>Dashboard</h2>
          <p style={{ fontSize: 12, color: 'var(--t-text-5)', margin: '5px 0 0' }}>Resumen general · {today}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 20px', background: 'var(--t-bg-card)', border: '1px solid var(--t-border)', color: 'var(--t-text-2)', fontFamily: FONT, fontWeight: 700, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}>
            <Download size={14} />Exportar
          </button>
          <button
            onClick={() => router.push('/activos/nuevo')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 20px', background: 'linear-gradient(135deg, #6874B5, #6CBEDA)', border: 'none', color: '#fff', fontFamily: FONT, fontWeight: 700, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}
          >
            <Plus size={14} />Nuevo Activo
          </button>
        </div>
      </div>

      {/* ── KPI row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        <KPICard label="Total Activos"       value={new Intl.NumberFormat('es-PY').format(totalActivos)} sub="en inventario"     icon={<Package size={14} />}      trend="+3 este mes" trendUp />
        <KPICard label="Valor en Libros"     value={fmtM(valorLibros)}  sub="valor neto actual"  icon={<TrendingUp size={14} />}   trend="2.1%"        trendUp />
        <KPICard label="Depreciación Acum."  value={fmtM(depAcum)}      sub={`${pct(depAcum, valorCartera)}% del valor orig.`} icon={<TrendingDown size={14} />} />
        <KPICard label="En Mantenimiento"    value={String(enMant)}     sub={`${dadosBaja} dados de baja`} icon={<Wrench size={14} />} gradient />
      </div>

      {/* ── Middle row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr 1fr', gap: 12, marginBottom: 16 }}>

        {/* Estado inventario — donut */}
        <div style={{ background: 'var(--t-bg-card)', border: '1px solid var(--t-border)', backdropFilter: 'blur(8px)', padding: 22 }}>
          <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--t-text-3)', margin: '0 0 16px' }}>Estado Inventario</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <Donut size={88} stroke={14} segments={[
                { value: activosCount, color: '#4ADE80' },
                { value: enMant,       color: '#FBB040' },
                { value: dadosBaja,    color: '#F87171' },
                { value: reservados,   color: '#A5B4FC' },
              ]} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                <span style={{ fontFamily: FONT, fontWeight: 900, fontSize: 18, color: 'var(--t-text-white)', lineHeight: 1 }}>{totalActivos}</span>
                <span style={{ fontSize: 9, color: 'var(--t-text-5)', fontFamily: FONT, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>total</span>
              </div>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {([
                { label: 'Activos',       count: activosCount, color: '#4ADE80' },
                { label: 'Mantenimiento', count: enMant,       color: '#FBB040' },
                { label: 'Baja',          count: dadosBaja,    color: '#F87171' },
                { label: 'Reservado',     count: reservados,   color: '#A5B4FC' },
              ] as const).map(it => (
                <div key={it.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: it.color, boxShadow: `0 0 6px ${it.color}80`, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: 'var(--t-text-4)' }}>{it.label}</span>
                  </div>
                  <span style={{ fontFamily: FONT, fontWeight: 900, fontSize: 13, color: 'var(--t-text-white)' }}>{it.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Activos por categoría */}
        <div style={{ background: 'var(--t-bg-card)', border: '1px solid var(--t-border)', backdropFilter: 'blur(8px)', padding: 22 }}>
          <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--t-text-3)', margin: '0 0 16px' }}>Activos por Categoría</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(kpis?.por_categoria ?? []).map(c => (
              <div key={c.categoria_id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: 'var(--t-text-3)' }}>{c.nombre}</span>
                  <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, color: 'var(--t-text-2)' }}>{c.total}</span>
                </div>
                <div style={{ height: 3, background: 'var(--t-bg-input)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct(c.total, maxCat)}%`, background: c.color_hex, borderRadius: 2, boxShadow: `0 0 8px ${c.color_hex}80`, transition: 'width 600ms var(--clt-ease)' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Altas vs Bajas */}
        <div style={{ background: 'var(--t-bg-card)', border: '1px solid var(--t-border)', backdropFilter: 'blur(8px)', padding: 22 }}>
          <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--t-text-3)', margin: '0 0 16px' }}>Altas vs Bajas</p>
          <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
            <div>
              <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 26, color: '#4ADE80', lineHeight: 1 }}>+18</div>
              <div style={{ fontSize: 10, color: 'var(--t-text-5)', fontFamily: FONT, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 3 }}>Altas</div>
            </div>
            <div style={{ width: 1, background: 'var(--t-border)' }} />
            <div>
              <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 26, color: '#F87171', lineHeight: 1 }}>−4</div>
              <div style={{ fontSize: 10, color: 'var(--t-text-5)', fontFamily: FONT, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 3 }}>Bajas</div>
            </div>
          </div>
          <MiniBar data={[2, 5, 3, 4, 2, 2]} color="#4ADE80" />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            {['Nov', 'Dic', 'Ene', 'Feb', 'Mar', 'Abr'].map(m => (
              <span key={m} style={{ fontSize: 9, color: 'var(--t-text-6)', fontFamily: FONT, fontWeight: 700 }}>{m}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

        {/* Últimos registrados */}
        <div style={{ background: 'var(--t-bg-card)', border: '1px solid var(--t-border)', backdropFilter: 'blur(8px)' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--t-text-3)', margin: 0 }}>Últimos Registrados</p>
            <button onClick={() => router.push('/activos')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: FONT, fontWeight: 700, fontSize: 10, color: '#6CBEDA', letterSpacing: '0.08em', textTransform: 'uppercase', padding: 0 }}>
              Ver todos →
            </button>
          </div>
          {activos.slice(0, 5).map((a, i) => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: i < Math.min(activos.length, 5) - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
              <div style={{ width: 34, height: 34, background: 'rgba(104,116,181,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid rgba(104,116,181,0.2)' }}>
                <Package size={14} style={{ color: '#6874B5' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 12, color: 'var(--t-text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.nombre}</div>
                <div style={{ fontSize: 10, color: 'var(--t-text-5)' }}>{a.codigo} · {a.area ?? '—'}</div>
              </div>
              <Badge estado={a.estado} />
            </div>
          ))}
          {activos.length === 0 && (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--t-text-5)', fontSize: 12, fontFamily: FONT, fontWeight: 700 }}>Sin activos registrados</div>
          )}
        </div>

        {/* Mantenimientos pendientes */}
        <div style={{ background: 'var(--t-bg-card)', border: '1px solid var(--t-border)', backdropFilter: 'blur(8px)' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--t-text-3)', margin: 0 }}>Mantenimientos Pendientes</p>
            <button onClick={() => router.push('/mantenimiento')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: FONT, fontWeight: 700, fontSize: 10, color: '#6CBEDA', letterSpacing: '0.08em', textTransform: 'uppercase', padding: 0 }}>
              Ver todos →
            </button>
          </div>
          {pendientes.slice(0, 5).map((m, i) => {
            const enProceso = m.estado === 'en_proceso'
            return (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: i < Math.min(pendientes.length, 5) - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                <div style={{ width: 34, height: 34, background: enProceso ? 'rgba(251,176,64,0.1)' : 'rgba(165,180,252,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1px solid ${enProceso ? 'rgba(251,176,64,0.2)' : 'rgba(165,180,252,0.2)'}` }}>
                  <Wrench size={14} style={{ color: enProceso ? '#FBB040' : '#A5B4FC' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 12, color: 'var(--t-text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.descripcion}</div>
                  <div style={{ fontSize: 10, color: 'var(--t-text-5)' }}>{m.tipo} · Est. {fmtDate(m.fecha_estimada_fin)}</div>
                </div>
                <Badge estado={m.estado} />
              </div>
            )
          })}
          {pendientes.length === 0 && (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--t-text-5)', fontSize: 12, fontFamily: FONT, fontWeight: 700 }}>Sin mantenimientos pendientes</div>
          )}
        </div>
      </div>
    </div>
  )
}
