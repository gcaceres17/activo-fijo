'use client'
import { useEffect, useRef, useState, ReactNode, CSSProperties } from 'react'

// ── Helpers ──────────────────────────────────────────────────────────────────

export const FONT = 'var(--clt-font-display)'
export const MONO = 'var(--clt-font-mono)'

export function fmt(n: number) {
  return new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 }).format(n)
}
export function fmtNum(n: number) {
  return new Intl.NumberFormat('es-PY').format(n)
}
export function fmtDate(d?: string | null) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
export function pct(a: number, b: number) {
  return b > 0 ? Math.round((a / b) * 100) : 0
}

// ── Estado badge ─────────────────────────────────────────────────────────────

export const ESTADO_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  'Activo':           { bg: 'rgba(27,122,62,0.12)',    color: '#4ADE80', border: 'rgba(74,222,128,0.2)' },
  'activo':           { bg: 'rgba(27,122,62,0.12)',    color: '#4ADE80', border: 'rgba(74,222,128,0.2)' },
  'En Mantenimiento': { bg: 'rgba(245,166,35,0.12)',   color: '#FBB040', border: 'rgba(251,176,64,0.2)' },
  'en_mantenimiento': { bg: 'rgba(245,166,35,0.12)',   color: '#FBB040', border: 'rgba(251,176,64,0.2)' },
  'Dado de Baja':     { bg: 'rgba(239,68,68,0.12)',    color: '#F87171', border: 'rgba(248,113,113,0.2)' },
  'dado_de_baja':     { bg: 'rgba(239,68,68,0.12)',    color: '#F87171', border: 'rgba(248,113,113,0.2)' },
  'Reservado':        { bg: 'rgba(104,116,181,0.15)',  color: '#A5B4FC', border: 'rgba(165,180,252,0.2)' },
  'reservado':        { bg: 'rgba(104,116,181,0.15)',  color: '#A5B4FC', border: 'rgba(165,180,252,0.2)' },
  'Vigente':          { bg: 'rgba(27,122,62,0.12)',    color: '#4ADE80', border: 'rgba(74,222,128,0.2)' },
  'vigente':          { bg: 'rgba(27,122,62,0.12)',    color: '#4ADE80', border: 'rgba(74,222,128,0.2)' },
  'Baja':             { bg: 'rgba(239,68,68,0.12)',    color: '#F87171', border: 'rgba(248,113,113,0.2)' },
  'baja':             { bg: 'rgba(239,68,68,0.12)',    color: '#F87171', border: 'rgba(248,113,113,0.2)' },
  'Completado':       { bg: 'rgba(27,122,62,0.12)',    color: '#4ADE80', border: 'rgba(74,222,128,0.2)' },
  'completado':       { bg: 'rgba(27,122,62,0.12)',    color: '#4ADE80', border: 'rgba(74,222,128,0.2)' },
  'En Proceso':       { bg: 'rgba(245,166,35,0.12)',   color: '#FBB040', border: 'rgba(251,176,64,0.2)' },
  'en_proceso':       { bg: 'rgba(245,166,35,0.12)',   color: '#FBB040', border: 'rgba(251,176,64,0.2)' },
  'Programado':       { bg: 'rgba(104,116,181,0.15)',  color: '#A5B4FC', border: 'rgba(165,180,252,0.2)' },
  'programado':       { bg: 'rgba(104,116,181,0.15)',  color: '#A5B4FC', border: 'rgba(165,180,252,0.2)' },
  'Conectado':        { bg: 'rgba(27,122,62,0.12)',    color: '#4ADE80', border: 'rgba(74,222,128,0.2)' },
  'Desconectado':     { bg: 'rgba(239,68,68,0.12)',    color: '#F87171', border: 'rgba(248,113,113,0.2)' },
  'Emparejado':       { bg: 'rgba(104,116,181,0.15)',  color: '#A5B4FC', border: 'rgba(165,180,252,0.2)' },
  'Inactivo':         { bg: 'rgba(239,68,68,0.12)',    color: '#F87171', border: 'rgba(248,113,113,0.2)' },
}

const ESTADO_LABELS: Record<string, string> = {
  activo: 'Activo', en_mantenimiento: 'En Mantenimiento', dado_de_baja: 'Dado de Baja',
  reservado: 'Reservado', vigente: 'Vigente', baja: 'Baja', completado: 'Completado',
  en_proceso: 'En Proceso', programado: 'Programado',
}

export function Badge({ estado }: { estado: string }) {
  const s = ESTADO_COLORS[estado] ?? { bg: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', border: 'rgba(255,255,255,0.1)' }
  const label = ESTADO_LABELS[estado] ?? estado
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 9999, background: s.bg, color: s.color, border: `1px solid ${s.border}`, fontFamily: FONT, fontWeight: 700, fontSize: 10, letterSpacing: '0.07em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.color, flexShrink: 0, boxShadow: `0 0 6px ${s.color}` }} />
      {label}
    </span>
  )
}

// ── KPI Card ─────────────────────────────────────────────────────────────────

export function KPICard({ label, value, sub, icon, trend, trendUp, gradient }: {
  label: string; value: string | number; sub?: string; icon: ReactNode
  trend?: string; trendUp?: boolean; gradient?: boolean
}) {
  return (
    <div
      style={{ background: gradient ? 'linear-gradient(135deg,rgba(104,116,181,0.2) 0%,rgba(108,190,218,0.1) 100%)' : 'var(--t-bg-card)', border: `1px solid ${gradient ? 'rgba(104,116,181,0.3)' : 'var(--t-border)'}`, padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 6, position: 'relative', overflow: 'hidden', backdropFilter: 'blur(8px)', transition: 'border-color 200ms,transform 200ms' }}
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
        {trend && <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 10, letterSpacing: '0.06em', color: trendUp ? '#4ADE80' : '#F87171', background: trendUp ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)', padding: '2px 6px', borderRadius: 4 }}>{trendUp ? '↑' : '↓'} {trend}</span>}
        {sub && <span style={{ fontSize: 11, color: 'var(--t-text-5)', fontFamily: FONT }}>{sub}</span>}
      </div>
    </div>
  )
}

// ── Table ─────────────────────────────────────────────────────────────────────

export interface ColDef<T = Record<string, unknown>> {
  key: string
  label: string
  style?: CSSProperties
  tdStyle?: CSSProperties
  render?: (value: unknown, row: T) => ReactNode
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function Table<T extends Record<string, unknown>>({ columns, rows, onRowClick }: {
  columns: ColDef<any>[]; rows: T[]; onRowClick?: (row: T) => void
}) {
  return (
    <div style={{ overflowX: 'auto', width: '100%' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--clt-font-body)', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--t-border)' }}>
            {columns.map(c => (
              <th key={c.key + c.label} style={{ padding: '10px 16px', textAlign: 'left', fontFamily: FONT, fontWeight: 700, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--t-text-4)', whiteSpace: 'nowrap', background: 'var(--t-bg-th)', ...c.style }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={columns.length} style={{ padding: '40px', textAlign: 'center', color: 'var(--t-text-5)', fontFamily: FONT, fontWeight: 700, fontSize: 13 }}>Sin resultados</td></tr>
          ) : rows.map((row, i) => (
            <tr key={i}
              onClick={() => onRowClick?.(row)}
              style={{ borderBottom: '1px solid var(--t-border3)', cursor: onRowClick ? 'pointer' : 'default', transition: 'background 100ms' }}
              onMouseEnter={e => { if (onRowClick) (e.currentTarget as HTMLTableRowElement).style.background = 'var(--t-bg-hover)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = '' }}
            >
              {columns.map(c => (
                <td key={c.key + c.label} style={{ padding: '11px 16px', color: 'var(--t-text-2)', verticalAlign: 'middle', ...c.tdStyle }}>
                  {c.render ? c.render(row[c.key], row) : String(row[c.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── SearchBar ─────────────────────────────────────────────────────────────────

export function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div style={{ position: 'relative', flex: 1 }}>
      <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--t-text-4)', flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx={11} cy={11} r={8} /><path d="m21 21-4.35-4.35" /></svg>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder ?? 'Buscar...'} style={{ width: '100%', paddingLeft: 36, paddingRight: 12, height: 38, background: 'var(--t-bg-input)', border: '1px solid var(--t-border)', color: 'var(--t-text-1)', fontFamily: 'var(--clt-font-body)', fontSize: 13, outline: 'none', boxSizing: 'border-box', borderRadius: 0, transition: 'border-color 150ms' }}
        onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(104,116,181,0.6)' }}
        onBlur={e => { (e.target as HTMLInputElement).style.borderColor = 'var(--t-border)' }}
      />
    </div>
  )
}

// ── SelectDark ────────────────────────────────────────────────────────────────

export function SelectDark({ value, onChange, options, style: s }: {
  value: string; onChange: (v: string) => void
  options: { value: string; label: string }[]; style?: CSSProperties
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={{ height: 38, background: 'var(--t-bg-input)', border: '1px solid var(--t-border)', color: 'var(--t-text-2)', fontFamily: 'var(--clt-font-body)', fontSize: 13, padding: '0 10px', outline: 'none', cursor: 'pointer', borderRadius: 0, ...s }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

// ── Btn ───────────────────────────────────────────────────────────────────────

type BtnVariant = 'primary' | 'accent' | 'ghost' | 'danger' | 'success'

export function Btn({ children, variant = 'primary', onClick, small, icon, disabled, style: ex }: {
  children?: ReactNode; variant?: BtnVariant; onClick?: () => void
  small?: boolean; icon?: ReactNode; disabled?: boolean; style?: CSSProperties
}) {
  const variants: Record<BtnVariant, CSSProperties> = {
    primary: { background: 'var(--t-bg-card)', color: 'var(--t-text-1)', borderColor: 'var(--t-border)' },
    accent: { background: 'linear-gradient(135deg,var(--clt-violet),var(--clt-cyan))', color: '#fff', borderColor: 'transparent' },
    ghost: { background: 'transparent', color: 'var(--t-text-3)', borderColor: 'var(--t-border)' },
    danger: { background: 'rgba(239,68,68,0.15)', color: '#F87171', borderColor: 'rgba(239,68,68,0.3)' },
    success: { background: 'rgba(74,222,128,0.12)', color: '#4ADE80', borderColor: 'rgba(74,222,128,0.25)' },
  }
  return (
    <button disabled={disabled} onClick={onClick}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: FONT, fontWeight: 700, fontSize: small ? 10 : 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: small ? '6px 14px' : '9px 20px', border: '1px solid transparent', cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all 120ms', outline: 'none', opacity: disabled ? 0.4 : 1, borderRadius: 0, whiteSpace: 'nowrap', ...variants[variant], ...ex }}
      onMouseEnter={e => { if (!disabled) { const el = e.currentTarget as HTMLButtonElement; el.style.filter = 'brightness(1.15)'; el.style.transform = 'translateY(-1px)' } }}
      onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.filter = ''; el.style.transform = '' }}
    >
      {icon && <span style={{ display: 'flex', width: small ? 12 : 14, height: small ? 12 : 14 }}>{icon}</span>}
      {children}
    </button>
  )
}

// ── Modal ─────────────────────────────────────────────────────────────────────

export function Modal({ title, onClose, children, width = 740 }: {
  title: string; onClose: () => void; children: ReactNode; width?: number
}) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,16,24,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: 'var(--t-modal-bg)', border: '1px solid var(--t-border)', width: '100%', maxWidth: width, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 32px 64px rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid var(--t-border)', flexShrink: 0 }}>
          <span style={{ fontFamily: FONT, fontWeight: 900, fontSize: 15, color: 'var(--t-text-white)', letterSpacing: '-0.01em' }}>{title}</span>
          <button onClick={onClose} style={{ background: 'var(--t-bg-card)', border: '1px solid var(--t-border)', cursor: 'pointer', color: 'var(--t-text-3)', display: 'flex', padding: 6, borderRadius: 4 }}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <div style={{ padding: 24, overflowY: 'auto' }}>{children}</div>
      </div>
    </div>
  )
}

// ── FormField ─────────────────────────────────────────────────────────────────

export function FormField({ label, required, children, hint, style: s }: {
  label: string; required?: boolean; children: ReactNode; hint?: string; style?: CSSProperties
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, ...s }}>
      <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--t-text-4)' }}>
        {label}{required && <span style={{ color: '#F87171', marginLeft: 3 }}>*</span>}
      </span>
      {children}
      {hint && <span style={{ fontSize: 11, color: 'var(--t-text-5)', fontFamily: 'var(--clt-font-body)' }}>{hint}</span>}
    </label>
  )
}

// ── InputDark ─────────────────────────────────────────────────────────────────

export function InputDark({ value, onChange, type = 'text', placeholder, required, style: s }: {
  value: string; onChange: (v: string) => void; type?: string
  placeholder?: string; required?: boolean; style?: CSSProperties
}) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required={required}
      style={{ height: 38, background: 'var(--t-bg-input)', border: '1px solid var(--t-border-input)', color: 'var(--t-text-1)', fontFamily: 'var(--clt-font-body)', fontSize: 13, padding: '0 12px', outline: 'none', width: '100%', boxSizing: 'border-box', borderRadius: 0, ...s }}
      onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(104,116,181,0.6)' }}
      onBlur={e => { (e.target as HTMLInputElement).style.borderColor = 'var(--t-border-input)' }}
    />
  )
}

// ── SelectFieldDark ───────────────────────────────────────────────────────────

export function SelectFieldDark({ value, onChange, options, required, style: s }: {
  value: string; onChange: (v: string) => void
  options: { value: string; label: string }[]; required?: boolean; style?: CSSProperties
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} required={required}
      style={{ height: 38, background: 'var(--t-bg-input)', border: '1px solid var(--t-border-input)', color: 'var(--t-text-1)', fontFamily: 'var(--clt-font-body)', fontSize: 13, padding: '0 12px', outline: 'none', width: '100%', cursor: 'pointer', boxSizing: 'border-box', borderRadius: 0, ...s }}
      onFocus={e => { (e.target as HTMLSelectElement).style.borderColor = 'rgba(104,116,181,0.6)' }}
      onBlur={e => { (e.target as HTMLSelectElement).style.borderColor = 'var(--t-border-input)' }}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

// ── Donut ─────────────────────────────────────────────────────────────────────

export function Donut({ segments, size = 80, stroke = 12 }: {
  segments: { value: number; color: string }[]; size?: number; stroke?: number
}) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const total = segments.reduce((s, x) => s + x.value, 0)
  let offset = 0
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--t-bg-card3)" strokeWidth={stroke} />
      {segments.map((seg, i) => {
        const dash = total > 0 ? (seg.value / total) * circ : 0
        const el = (
          <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={seg.color} strokeWidth={stroke}
            strokeDasharray={`${dash} ${circ}`} strokeDashoffset={-offset} strokeLinecap="round" />
        )
        offset += dash
        return el
      })}
    </svg>
  )
}

// ── MiniBar ───────────────────────────────────────────────────────────────────

export function MiniBar({ data, color = 'var(--clt-violet)' }: { data: number[]; color?: string }) {
  const max = Math.max(...data, 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 28 }}>
      {data.map((v, i) => (
        <div key={i} style={{ flex: 1, background: color, opacity: 0.2 + 0.8 * (v / max), height: `${Math.max(8, (v / max) * 100)}%`, borderRadius: 2 }} />
      ))}
    </div>
  )
}

// ── ProgressBar ───────────────────────────────────────────────────────────────

export function ProgressBar({ value, max, color = 'var(--clt-violet)', label }: {
  value: number; max: number; color?: string; label?: string
}) {
  const p = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        {label && <span style={{ fontSize: 11, color: 'var(--t-text-4)', fontFamily: 'var(--clt-font-body)' }}>{label}</span>}
        <span style={{ fontSize: 10, color: 'var(--t-text-5)', fontFamily: FONT, fontWeight: 700 }}>{Math.round(p)}%</span>
      </div>
      <div style={{ height: 4, background: 'var(--t-bg-card3)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${p}%`, background: color, borderRadius: 2, transition: 'width 600ms var(--clt-ease)', boxShadow: `0 0 8px ${color}60` }} />
      </div>
    </div>
  )
}

// ── PageHeader ────────────────────────────────────────────────────────────────

export function PageHeader({ title, sub, children }: { title: string; sub?: string; children?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
      <div>
        <h2 style={{ fontFamily: FONT, fontWeight: 900, fontSize: 24, color: 'var(--t-text-white)', margin: 0, lineHeight: 1.1, letterSpacing: '-0.02em' }}>{title}</h2>
        {sub && <p style={{ fontFamily: 'var(--clt-font-body)', fontSize: 12, color: 'var(--t-text-5)', margin: '5px 0 0' }}>{sub}</p>}
      </div>
      {children && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{children}</div>}
    </div>
  )
}

// ── Card ──────────────────────────────────────────────────────────────────────

export function Card({ children, style: s, noPad }: { children: ReactNode; style?: CSSProperties; noPad?: boolean }) {
  return (
    <div style={{ background: 'var(--t-bg-card)', border: '1px solid var(--t-border)', backdropFilter: 'blur(8px)', ...(noPad ? {} : { padding: 22 }), ...s }}>
      {children}
    </div>
  )
}

// ── SectionTitle ──────────────────────────────────────────────────────────────

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
      <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--t-text-3)' }}>{children}</span>
      {action}
    </div>
  )
}

// ── QRCode (pseudo) ───────────────────────────────────────────────────────────

export function QRCode({ value, size = 160 }: { value: string; size?: number }) {
  const hash = value.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const modules = 21
  const cell = size / modules
  const cells: { r: number; c: number }[] = []
  for (let r = 0; r < modules; r++) {
    for (let c = 0; c < modules; c++) {
      const inFinder = (r < 7 && c < 7) || (r < 7 && c >= modules - 7) || (r >= modules - 7 && c < 7)
      const timing = r === 6 || c === 6
      const bit = inFinder || timing || ((hash * r * 3 + c * 7 + r + c) % 3 === 0)
      if (bit) cells.push({ r, c })
    }
  }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ imageRendering: 'pixelated' }}>
      <rect width={size} height={size} fill="white" />
      {cells.map(({ r, c }, i) => (
        <rect key={i} x={c * cell} y={r * cell} width={cell} height={cell} fill="#1a1a2e" />
      ))}
      <rect x={size / 2 - 14} y={size / 2 - 8} width={28} height={16} fill="white" />
      <text x={size / 2} y={size / 2 + 5} textAnchor="middle" fontFamily="system-ui" fontWeight="900" fontSize="9" fill="#2A3645">CLT</text>
    </svg>
  )
}

// ── PhotoUpload ───────────────────────────────────────────────────────────────

export function PhotoUpload({ value, onChange, size = 120 }: {
  value: string | null; onChange: (v: string) => void; size?: number
}) {
  const [drag, setDrag] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File | null | undefined) => {
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = e => onChange(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setDrag(true) }}
      onDragLeave={() => setDrag(false)}
      onDrop={e => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]) }}
      style={{ width: size, height: size, border: `2px dashed ${drag ? 'var(--clt-violet)' : 'var(--t-border)'}`, background: drag ? 'rgba(104,116,181,0.1)' : 'var(--t-bg-input)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 150ms', position: 'relative', flexShrink: 0, overflow: 'hidden' }}
    >
      {value ? (
        <>
          <img src={value} alt="Foto" style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 150ms' }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.opacity = '1' }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.opacity = '0' }}>
            <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx={12} cy={13} r={4} /></svg>
            <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 10, color: '#fff', marginTop: 4, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Cambiar</span>
          </div>
        </>
      ) : (
        <>
          <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="var(--t-text-5)" strokeWidth={2}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx={12} cy={13} r={4} /></svg>
          <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 9, color: 'var(--t-text-5)', marginTop: 8, letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: 'center', lineHeight: 1.3, padding: '0 8px' }}>Subir foto</span>
        </>
      )}
      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFile(e.target.files?.[0])} />
    </div>
  )
}
