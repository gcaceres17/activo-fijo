'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import type { PaginatedActivos, Activo, Grupo, Sucursal, Asignacion, Mantenimiento } from '@/types'
import {
  Badge, Btn, Card, ColDef, FONT, MONO, Modal, PageHeader,
  PhotoUpload, ProgressBar, QRCode, SearchBar, SectionTitle, SelectDark,
  Table, fmt, fmtDate,
} from '@/components/ui'
import { Package, List, Grid, Upload, Download, Plus } from 'lucide-react'

// ── Modal Detalle ─────────────────────────────────────────────────────────────

const TABS = ['info', 'deprec', 'asig', 'mant', 'docs', 'qr'] as const
type Tab = typeof TABS[number]
const TAB_LABELS: Record<Tab, string> = {
  info: 'Información', deprec: 'Depreciación', asig: 'Asignaciones',
  mant: 'Mantenimiento', docs: 'Documentos', qr: 'Código QR',
}

function ModalDetalle({ activo, grupos, sucursales, onClose, onEdit, onDarDeBaja }: {
  activo: Activo; grupos: Grupo[]; sucursales: Sucursal[]
  onClose: () => void; onEdit: () => void; onDarDeBaja: () => void
}) {
  const [tab, setTab] = useState<Tab>('info')
  const [asigs, setAsigs] = useState<Asignacion[] | null>(null)
  const [mants, setMants] = useState<Mantenimiento[] | null>(null)
  const [bajaLoading, setBajaLoading] = useState(false)

  const grupo = grupos.find(g => g.id === activo.grupo_id)
  const sucursal = sucursales.find(s => s.id === activo.sucursal_id)
  const vidaUtilAnios = activo.vida_util_años ?? Math.ceil(activo.vida_util_meses / 12)
  const cuotaAnual = activo.depreciacion_mensual * 12
  const anoCompra = activo.fecha_compra ? new Date(activo.fecha_compra + 'T00:00:00').getFullYear() : new Date().getFullYear()

  useEffect(() => {
    if (tab === 'asig' && asigs === null) {
      api.get<{ items: Asignacion[] } | Asignacion[]>(`/v1/asignaciones?activo_id=${activo.id}&page_size=50`)
        .then(res => setAsigs(Array.isArray(res) ? res : (res as { items: Asignacion[] }).items ?? []))
        .catch(() => setAsigs([]))
    }
  }, [tab, activo.id, asigs])

  useEffect(() => {
    if (tab === 'mant' && mants === null) {
      api.get<{ items: Mantenimiento[] } | Mantenimiento[]>(`/v1/mantenimientos?activo_id=${activo.id}&page_size=50`)
        .then(res => setMants(Array.isArray(res) ? res : (res as { items: Mantenimiento[] }).items ?? []))
        .catch(() => setMants([]))
    }
  }, [tab, activo.id, mants])

  return (
    <Modal title={`${activo.codigo} — ${activo.nombre}`} onClose={onClose} width={820}>
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.08)', overflowX: 'auto' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '9px 16px',
            fontFamily: FONT, fontWeight: 700, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
            color: tab === t ? 'var(--clt-cyan)' : 'rgba(255,255,255,0.3)',
            borderBottom: tab === t ? '2px solid var(--clt-cyan)' : '2px solid transparent',
            marginBottom: -1, transition: 'color 120ms', whiteSpace: 'nowrap',
          }}>{TAB_LABELS[t]}</button>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', paddingRight: 4 }}><Badge estado={activo.estado} /></div>
      </div>

      {/* INFO */}
      {tab === 'info' && (
        <div>
          <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
            <PhotoUpload value={activo.foto_url ?? null} onChange={() => {}} size={110} />
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {([
                ['Código interno', activo.codigo],
                ['Grupo', grupo?.nombre ?? '—'],
                ['Marca', activo.marca ?? '—'],
                ['Modelo', activo.modelo ?? '—'],
                ['N° de Serie', activo.numero_serie ?? '—'],
                ['Fecha de Compra', fmtDate(activo.fecha_compra)],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 8 }}>
                  <div style={{ fontSize: 9, color: 'var(--t-text-5)', fontFamily: FONT, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3 }}>{k}</div>
                  <div style={{ fontSize: 13, color: 'var(--t-text-1)', fontFamily: FONT, fontWeight: 700 }}>{v || '—'}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {([
              ['Valor de Adquisición', fmt(activo.valor_adquisicion), ''],
              ['Vida Útil', `${activo.vida_util_meses} meses`, ''],
              ['Sucursal', sucursal?.nombre ?? '—', ''],
              ['Dep. Mensual', fmt(activo.depreciacion_mensual), ''],
              ['Valor Actual', fmt(activo.valor_libro_actual), 'var(--clt-cyan)'],
              ['Depreciación Acum.', fmt(activo.depreciacion_acumulada ?? 0), '#F87171'],
            ] as [string, string, string][]).map(([k, v, c]) => (
              <div key={k} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 8 }}>
                <div style={{ fontSize: 9, color: 'var(--t-text-5)', fontFamily: FONT, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3 }}>{k}</div>
                <div style={{ fontSize: 13, color: c || 'rgba(255,255,255,0.85)', fontFamily: FONT, fontWeight: 700 }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DEPRECIACIÓN */}
      {tab === 'deprec' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
            {([
              ['Valor Original', fmt(activo.valor_adquisicion), 'rgba(255,255,255,0.7)'],
              ['Deprec. Acumulada', fmt(activo.depreciacion_acumulada ?? 0), '#F87171'],
              ['Valor en Libros', fmt(activo.valor_libro_actual), 'var(--clt-cyan)'],
            ] as [string, string, string][]).map(([l, v, c]) => (
              <div key={l} style={{ background: 'var(--t-bg-card2)', border: '1px solid rgba(255,255,255,0.06)', padding: '14px 16px' }}>
                <div style={{ fontSize: 9, color: 'var(--t-text-5)', fontFamily: FONT, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>{l}</div>
                <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 16, color: c }}>{v}</div>
              </div>
            ))}
          </div>
          <ProgressBar label="Porcentaje depreciado" value={activo.depreciacion_acumulada ?? 0} max={activo.valor_adquisicion} color="#F87171" />
          <div style={{ marginTop: 20 }}>
            <SectionTitle>Tabla de depreciación — método lineal (resumen anual)</SectionTitle>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: 'var(--clt-font-body)' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  {['Año', 'Cuota Anual', 'Deprec. Acum.', 'Valor Residual'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontFamily: FONT, fontWeight: 700, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--t-text-5)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: vidaUtilAnios }, (_, i) => {
                  const acum = cuotaAnual * (i + 1)
                  const residual = Math.max(activo.valor_residual, activo.valor_adquisicion - acum)
                  const yr = anoCompra + i
                  const isPast = acum <= (activo.depreciacion_acumulada ?? 0)
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: isPast ? 'rgba(255,255,255,0.02)' : '' }}>
                      <td style={{ padding: '8px 12px', fontFamily: FONT, fontWeight: isPast ? 700 : 400, color: isPast ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.4)' }}>{yr}</td>
                      <td style={{ padding: '8px 12px', color: 'var(--t-text-3)' }}>{fmt(cuotaAnual)}</td>
                      <td style={{ padding: '8px 12px', color: '#F87171', fontFamily: FONT, fontWeight: 700 }}>{fmt(acum)}</td>
                      <td style={{ padding: '8px 12px', color: 'var(--clt-cyan)', fontFamily: FONT, fontWeight: 700 }}>{fmt(residual)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ASIGNACIONES */}
      {tab === 'asig' && (
        asigs === null ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 10 }}>
            <div style={{ width: 18, height: 18, border: '2px solid #6874B5', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : (
          <Table
            columns={[
              { key: 'id', label: 'ID', style: { width: 90 }, render: v => <span style={{ fontFamily: MONO, fontSize: 11, color: 'var(--clt-cyan)' }}>{String(v).slice(0, 8)}…</span> },
              { key: 'responsable_nombre', label: 'Responsable', render: (v, r) => (
                <div>
                  <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 13, color: 'var(--t-text-1)' }}>{String(v)}</div>
                  {(r as unknown as Asignacion).responsable_codigo && <div style={{ fontSize: 10, color: 'var(--t-text-5)' }}>Cód: {(r as unknown as Asignacion).responsable_codigo}</div>}
                </div>
              )},
              { key: 'sucursal_id', label: 'Sucursal', render: v => {
                const s = sucursales.find(x => x.id === String(v))
                return <span style={{ fontSize: 12, color: 'var(--t-text-3)' }}>{s?.nombre ?? '—'}</span>
              }},
              { key: 'fecha_inicio', label: 'Desde', render: v => <span style={{ fontSize: 12, color: 'var(--t-text-3)' }}>{fmtDate(String(v))}</span> },
              { key: 'vigente', label: 'Estado', render: v => <Badge estado={v ? 'activo' : 'dado_de_baja'} /> },
            ] as ColDef<Asignacion>[]}
            rows={asigs as unknown as Record<string, unknown>[]}
          />
        )
      )}

      {/* MANTENIMIENTO */}
      {tab === 'mant' && (
        mants === null ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 10 }}>
            <div style={{ width: 18, height: 18, border: '2px solid #6874B5', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : (
          <Table
            columns={[
              { key: 'id', label: 'Orden', style: { width: 90 }, render: v => <span style={{ fontFamily: MONO, fontSize: 11, color: 'var(--clt-cyan)' }}>{String(v).slice(0, 8)}…</span> },
              { key: 'tipo', label: 'Tipo', render: v => <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 10, letterSpacing: '0.07em', textTransform: 'uppercase', color: v === 'correctivo' ? '#F87171' : v === 'preventivo' ? 'var(--clt-violet)' : 'var(--clt-cyan)' }}>{String(v)}</span> },
              { key: 'descripcion', label: 'Descripción', render: v => <span style={{ fontSize: 11, color: 'var(--t-text-3)' }}>{String(v).length > 50 ? String(v).slice(0, 48) + '…' : String(v)}</span> },
              { key: 'costo', label: 'Costo', render: v => Number(v) > 0 ? fmt(Number(v)) : <span style={{ color: 'var(--t-text-6)' }}>Sin costo</span> },
              { key: 'estado', label: 'Estado', render: v => <Badge estado={String(v)} /> },
            ] as ColDef<Mantenimiento>[]}
            rows={mants as unknown as Record<string, unknown>[]}
          />
        )
      )}

      {/* DOCUMENTOS */}
      {tab === 'docs' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ color: 'var(--t-text-5)', fontFamily: FONT, fontWeight: 700, fontSize: 13, padding: '20px 0' }}>Sin documentos adjuntos</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', border: '2px dashed rgba(255,255,255,0.1)', cursor: 'pointer', minWidth: 180, color: 'var(--t-text-6)', transition: 'border-color 120ms' }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(104,116,181,0.4)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.1)' }}>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="16,16 12,12 8,16" /><line x1={12} y1={12} x2={12} y2={21} /><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" /></svg>
            <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11 }}>Adjuntar archivo</span>
          </div>
        </div>
      )}

      {/* QR */}
      {tab === 'qr' && (
        <div style={{ display: 'flex', gap: 40, alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{ background: 'white', padding: 16, border: '1px solid rgba(255,255,255,0.1)' }}>
              <QRCode value={activo.codigo} size={180} />
            </div>
            <div style={{ fontFamily: MONO, fontSize: 12, color: 'var(--t-text-3)', textAlign: 'center' }}>{activo.codigo}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn icon={<svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="6,9 6,2 18,2 18,9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x={6} y={14} width={12} height={8} /></svg>} variant="ghost" small>Imprimir</Btn>
              <Btn icon={<svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7,10 12,15 17,10" /><line x1={12} y1={15} x2={12} y2={3} /></svg>} variant="ghost" small>Descargar</Btn>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <SectionTitle>Información codificada</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {([
                ['ID del activo', activo.codigo],
                ['Nombre', activo.nombre],
                ['Grupo', grupo?.nombre ?? '—'],
                ['Serie', activo.numero_serie ?? '—'],
                ['Sucursal', sucursal?.nombre ?? '—'],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize: 10, color: 'var(--t-text-5)', fontFamily: FONT, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', width: 130, flexShrink: 0 }}>{k}</span>
                  <span style={{ fontSize: 12, color: 'var(--t-text-2)', fontFamily: FONT, fontWeight: 700 }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 20, background: 'rgba(104,116,181,0.08)', border: '1px solid rgba(104,116,181,0.2)', padding: '12px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="var(--clt-cyan)" strokeWidth={2}><circle cx={12} cy={12} r={10} /><line x1={12} y1={8} x2={12} y2={12} /><line x1={12} y1={16} x2={12.01} y2={16} /></svg>
                <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 10, color: 'var(--clt-cyan)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Para jornadas de inventario</span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--t-text-3)', margin: 0, lineHeight: 1.5 }}>Imprimí este QR en la etiqueta del activo. Los lectores configurados en <strong style={{ color: 'var(--t-text-2)' }}>Configuración → Dispositivos</strong> lo reconocerán automáticamente.</p>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', gap: 8, marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <Btn icon={<svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>} variant="ghost" small onClick={onEdit}>Editar</Btn>
        <Btn icon={<svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x={3} y={3} width={18} height={18} rx={2} ry={2} /><path d="M8 12h8" /><path d="M12 8v8" /></svg>} variant="ghost" small onClick={() => setTab('qr')}>Ver QR</Btn>
        <Btn icon={<svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="6,9 6,2 18,2 18,9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x={6} y={14} width={12} height={8} /></svg>} variant="ghost" small>Imprimir ficha</Btn>
        {activo.estado !== 'dado_de_baja' && (
          <Btn icon={<svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 8v13H3V8" /><path d="M1 3h22v5H1z" /><path d="M10 12h4" /></svg>} variant="danger" small
            disabled={bajaLoading}
            onClick={async () => {
              if (!confirm(`¿Dar de baja "${activo.nombre}"? Esta acción no se puede deshacer.`)) return
              setBajaLoading(true)
              try { await api.delete(`/v1/activos/${activo.id}`); onDarDeBaja() }
              catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error al dar de baja'); setBajaLoading(false) }
            }}>
            {bajaLoading ? 'Procesando…' : 'Dar de baja'}
          </Btn>
        )}
        <div style={{ flex: 1 }} />
        <Btn variant="ghost" small onClick={onClose}>Cerrar</Btn>
      </div>
    </Modal>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ActivosPage() {
  const router = useRouter()
  const [data, setData] = useState<PaginatedActivos | null>(null)
  const [grupos, setGrupos] = useState<Grupo[]>([])
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [estado, setEstado] = useState('')
  const [grupoId, setGrupoId] = useState('')
  const [sucursalId, setSucursalId] = useState('')
  const [page, setPage] = useState(1)
  const [view, setView] = useState<'table' | 'grid'>('table')
  const [detalle, setDetalle] = useState<Activo | null>(null)

  async function fetchActivos() {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), page_size: '20' })
    if (q) params.set('q', q)
    if (estado) params.set('estado', estado)
    if (grupoId) params.set('grupo_id', grupoId)
    if (sucursalId) params.set('sucursal_id', sucursalId)
    try {
      const res = await api.get<PaginatedActivos>(`/v1/activos?${params}`)
      setData(res)
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  useEffect(() => {
    Promise.allSettled([
      api.get<Grupo[]>('/v1/taxonomia/grupos'),
      api.get<Sucursal[]>('/v1/sucursales'),
    ]).then(([gr, sr]) => {
      if (gr.status === 'fulfilled') setGrupos(gr.value)
      if (sr.status === 'fulfilled') setSucursales(sr.value)
    })
  }, [])

  useEffect(() => { fetchActivos() }, [page, estado, grupoId, sucursalId])
  useEffect(() => {
    const t = setTimeout(fetchActivos, 400)
    return () => clearTimeout(t)
  }, [q])

  const items = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = data?.total_pages ?? 1

  const cols: ColDef<Activo>[] = [
    {
      key: 'codigo', label: 'Código', style: { width: 110 },
      render: v => <span style={{ fontFamily: MONO, fontSize: 12, color: 'var(--clt-cyan)' }}>{String(v)}</span>,
    },
    {
      key: 'nombre', label: 'Activo',
      render: (v, r) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, background: r.foto_url ? 'none' : 'rgba(104,116,181,0.12)', border: '1px solid rgba(104,116,181,0.15)', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {r.foto_url ? <img src={String(r.foto_url)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : <Package size={13} style={{ color: 'var(--clt-violet)' }} />}
          </div>
          <div>
            <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 13, color: 'var(--t-text-1)' }}>{String(v)}</div>
            <div style={{ fontSize: 10, color: 'var(--t-text-5)' }}>{String(r.marca ?? '')} {String(r.modelo ?? '')}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'grupo_id', label: 'Grupo',
      render: v => {
        const g = grupos.find(x => x.id === String(v))
        return <span style={{ fontSize: 12, color: 'var(--t-text-3)' }}>{g?.nombre ?? '—'}</span>
      },
    },
    {
      key: 'sucursal_id', label: 'Sucursal',
      render: v => {
        const s = sucursales.find(x => x.id === String(v))
        return <span style={{ fontSize: 11, color: 'var(--t-text-4)', fontFamily: FONT, fontWeight: 700 }}>{s?.nombre ?? '—'}</span>
      },
    },
    { key: 'valor_adquisicion', label: 'Valor Adq.', render: v => <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 12, color: 'var(--t-text-2)' }}>{fmt(Number(v))}</span> },
    { key: 'valor_libro_actual', label: 'Valor Actual', render: v => <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 12, color: 'var(--clt-cyan)' }}>{fmt(Number(v))}</span> },
    { key: 'estado', label: 'Estado', render: v => <Badge estado={String(v)} /> },
  ]

  const hasFilter = q || estado || grupoId || sucursalId

  return (
    <div>
      <PageHeader title="Inventario de Activos" sub={`${total} activos encontrados`}>
        <div style={{ display: 'flex', gap: 4, border: '1px solid rgba(255,255,255,0.1)', padding: 2 }}>
          {(['table', 'grid'] as const).map(v => (
            <button key={v} onClick={() => setView(v)} style={{ width: 30, height: 28, background: view === v ? 'rgba(255,255,255,0.1)' : 'none', border: 'none', cursor: 'pointer', color: view === v ? '#fff' : 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {v === 'table' ? <List size={13} /> : <Grid size={13} />}
            </button>
          ))}
        </div>
        <Btn icon={<Upload size={14} />} variant="ghost" small>Importar</Btn>
        <Btn icon={<Download size={14} />} variant="ghost" small>Exportar</Btn>
        <Btn icon={<Plus size={14} />} variant="accent" small onClick={() => router.push('/activos/nuevo')}>Nuevo Activo</Btn>
      </PageHeader>

      {/* Filtros */}
      <Card style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <SearchBar value={q} onChange={v => { setQ(v); setPage(1) }} placeholder="Buscar por nombre, código, serie..." />
          <SelectDark value={grupoId} onChange={v => { setGrupoId(v); setPage(1) }} style={{ minWidth: 160 }}
            options={[{ value: '', label: 'Todos los grupos' }, ...grupos.map(g => ({ value: g.id, label: `${g.codigo} — ${g.nombre}` }))]} />
          <SelectDark value={estado} onChange={v => { setEstado(v); setPage(1) }} style={{ minWidth: 140 }}
            options={[
              { value: '', label: 'Todos los estados' },
              { value: 'activo', label: 'Activo' },
              { value: 'en_mantenimiento', label: 'En Mantenimiento' },
              { value: 'dado_de_baja', label: 'Dado de Baja' },
            ]} />
          <SelectDark value={sucursalId} onChange={v => { setSucursalId(v); setPage(1) }} style={{ minWidth: 160 }}
            options={[{ value: '', label: 'Todas las sucursales' }, ...sucursales.map(s => ({ value: s.id, label: s.nombre }))]} />
          {hasFilter && (
            <Btn variant="ghost" small onClick={() => { setQ(''); setEstado(''); setGrupoId(''); setSucursalId(''); setPage(1) }}>Limpiar</Btn>
          )}
        </div>
      </Card>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
          <div style={{ width: 28, height: 28, border: '2px solid #6874B5', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : view === 'table' ? (
        <Card noPad>
          <Table columns={cols} rows={items as unknown as Record<string, unknown>[]} onRowClick={row => setDetalle(row as unknown as Activo)} />
          <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--t-text-6)', fontFamily: 'var(--clt-font-body)' }}>Mostrando {items.length} de {total} activos</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <Btn variant="ghost" small disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Anterior</Btn>
              <Btn variant="ghost" small disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Siguiente →</Btn>
            </div>
          </div>
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12 }}>
          {items.map(a => (
            <div key={a.id}
              style={{ background: 'var(--t-bg-card)', border: '1px solid var(--t-border)', padding: 18, cursor: 'pointer', transition: 'border-color 150ms,transform 150ms' }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = 'rgba(104,116,181,0.4)'; el.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = 'var(--t-border)'; el.style.transform = '' }}
              onClick={() => setDetalle(a)}>
              <div style={{ width: '100%', height: 90, background: 'rgba(104,116,181,0.08)', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(104,116,181,0.1)', overflow: 'hidden' }}>
                {a.foto_url ? <img src={a.foto_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : <Package size={28} style={{ color: 'rgba(104,116,181,0.4)' }} />}
              </div>
              <div style={{ fontFamily: MONO, fontSize: 10, color: 'var(--clt-cyan)', marginBottom: 4 }}>{a.codigo}</div>
              <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 12, color: 'var(--t-text-1)', lineHeight: 1.3, marginBottom: 8 }}>{a.nombre}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Badge estado={a.estado} />
                <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, color: 'var(--clt-cyan)' }}>{fmt(a.valor_libro_actual)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {detalle && (
        <ModalDetalle
          activo={detalle}
          grupos={grupos}
          sucursales={sucursales}
          onClose={() => setDetalle(null)}
          onEdit={() => { router.push(`/activos/${detalle.id}`); setDetalle(null) }}
          onDarDeBaja={() => { setDetalle(null); fetchActivos() }}
        />
      )}
    </div>
  )
}
