'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import type { Activo, Asignacion, Mantenimiento } from '@/types'
import { ArrowLeft, Printer, Download, Edit2, Archive, FileText, UploadCloud } from 'lucide-react'
import { Badge, Btn, Card, ColDef, FONT, MONO, KPICard, PhotoUpload, ProgressBar, QRCode, SectionTitle, Table, fmt, fmtDate, pct } from '@/components/ui'

const TABS = ['info','deprec','asig','mant','docs','qr'] as const
const TAB_LABELS: Record<string, string> = { info:'Información', deprec:'Depreciación', asig:'Asignaciones', mant:'Mantenimiento', docs:'Documentos', qr:'Código QR' }
const TIPO_COLOR: Record<string, string> = { Correctivo: '#F87171', correctivo: '#F87171', Preventivo: 'var(--clt-violet)', preventivo: 'var(--clt-violet)', Predictivo: 'var(--clt-cyan)', predictivo: 'var(--clt-cyan)' }

export default function ActivoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [activo, setActivo] = useState<Activo | null>(null)
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([])
  const [mantenimientos, setMantenimientos] = useState<Mantenimiento[]>([])
  const [tab, setTab] = useState<typeof TABS[number]>('info')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get<Activo>(`/v1/activos/${id}`),
      api.get<any>(`/v1/asignaciones?activo_id=${id}`).then(r => r.items || []),
      api.get<any>(`/v1/mantenimientos?activo_id=${id}`).then(r => r.items || []),
    ]).then(([a, asig, mnt]) => {
      setActivo(a); setAsignaciones(asig); setMantenimientos(mnt)
    }).catch(console.error).finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 256 }}>
      <div style={{ width: 28, height: 28, border: '2px solid #6874B5', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (!activo) return (
    <div style={{ textAlign: 'center', marginTop: 64, color: 'rgba(255,255,255,0.3)', fontFamily: FONT }}>
      Activo no encontrado
    </div>
  )

  const depPct = pct(activo.depreciacion_acumulada, activo.valor_adquisicion)
  const cuotaAnual = activo.vida_util_años ? activo.valor_adquisicion / activo.vida_util_años : 0

  const asigCols: ColDef<Asignacion>[] = [
    { key: 'id', label: 'ID', render: v => <span style={{ fontFamily: MONO, fontSize: 11, color: 'var(--clt-cyan)' }}>{String(v).slice(-8)}</span> },
    { key: 'empleado_nombre', label: 'Empleado', render: (v, r) => <div><div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 13, color: 'var(--t-text-1)' }}>{String(v)}</div>{r.empleado_cedula && <div style={{ fontSize: 10, color: 'var(--t-text-5)' }}>CI: {String(r.empleado_cedula)}</div>}</div> },
    { key: 'area', label: 'Área', render: v => <span style={{ fontSize: 12, color: 'var(--t-text-3)' }}>{String(v)}</span> },
    { key: 'fecha_asignacion', label: 'Desde', render: v => fmtDate(String(v)) },
    { key: 'estado', label: 'Estado', render: v => <Badge estado={String(v)} /> },
  ]

  const mantCols: ColDef<Mantenimiento>[] = [
    { key: 'id', label: 'Orden', render: v => <span style={{ fontFamily: MONO, fontSize: 11, color: 'var(--clt-cyan)' }}>{String(v).slice(-8)}</span> },
    { key: 'tipo', label: 'Tipo', render: v => <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 10, letterSpacing: '0.07em', textTransform: 'uppercase', color: TIPO_COLOR[String(v)] ?? 'var(--t-text-3)' }}>{String(v)}</span> },
    { key: 'descripcion', label: 'Descripción', render: v => <span style={{ fontSize: 11, color: 'var(--t-text-3)' }}>{String(v).slice(0, 50)}{String(v).length > 50 ? '…' : ''}</span> },
    { key: 'costo', label: 'Costo', render: v => fmt(Number(v ?? 0)) },
    { key: 'estado', label: 'Estado', render: v => <Badge estado={String(v)} /> },
  ]

  return (
    <div style={{ maxWidth: 860 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Link href="/activos" style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>
          <ArrowLeft size={14} />
        </Link>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: MONO, fontSize: 12, color: 'var(--clt-cyan)' }}>{activo.codigo}</span>
            <Badge estado={activo.estado} />
          </div>
          <h1 style={{ fontFamily: FONT, fontWeight: 900, fontSize: 20, color: 'var(--t-text-1)', margin: '2px 0 0', letterSpacing: '-0.01em' }}>{activo.nombre}</h1>
        </div>
      </div>

      <Card>
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
        </div>

        {/* Tab: Información */}
        {tab === 'info' && (
          <div>
            <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
              <PhotoUpload value={activo.foto_url ?? null} onChange={() => {}} size={110} />
              <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {([
                  ['Código interno', activo.codigo],
                  ['Categoría', activo.categoria_id],
                  ['Marca', activo.marca],
                  ['Modelo', activo.modelo],
                  ['N° de Serie', activo.numero_serie],
                  ['Fecha de Compra', fmtDate(String(activo.fecha_compra ?? ''))],
                ] as [string, string | undefined][]).map(([k, v]) => (
                  <div key={k} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 8 }}>
                    <div style={{ fontSize: 9, color: 'var(--t-text-5)', fontFamily: FONT, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3 }}>{k}</div>
                    <div style={{ fontSize: 13, color: 'var(--t-text-1)', fontFamily: FONT, fontWeight: 700 }}>{v ?? '—'}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {([
                ['Valor de Adquisición', fmt(activo.valor_adquisicion), ''],
                ['Vida Útil', `${activo.vida_util_años ?? '—'} años`, ''],
                ['Área Asignada', activo.area ?? '—', ''],
                ['Responsable', activo.responsable ?? '—', ''],
                ['Ubicación', activo.ubicacion ?? '—', ''],
                ['Valor Actual', fmt(activo.valor_libro_actual), 'var(--clt-cyan)'],
                ['Depreciación Acum.', fmt(activo.depreciacion_acumulada), '#F87171'],
              ] as [string, string, string][]).map(([k, v, color]) => (
                <div key={k} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 8 }}>
                  <div style={{ fontSize: 9, color: 'var(--t-text-5)', fontFamily: FONT, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3 }}>{k}</div>
                  <div style={{ fontSize: 13, color: color || 'rgba(255,255,255,0.85)', fontFamily: FONT, fontWeight: 700 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab: Depreciación */}
        {tab === 'deprec' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
              {([
                ['Valor Original', fmt(activo.valor_adquisicion), 'rgba(255,255,255,0.7)'],
                ['Deprec. Acumulada', fmt(activo.depreciacion_acumulada), '#F87171'],
                ['Valor en Libros', fmt(activo.valor_libro_actual), 'var(--clt-cyan)'],
              ] as [string, string, string][]).map(([l, v, c]) => (
                <div key={l} style={{ background: 'var(--t-bg-card2)', border: '1px solid rgba(255,255,255,0.06)', padding: '14px 16px' }}>
                  <div style={{ fontSize: 9, color: 'var(--t-text-5)', fontFamily: FONT, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>{l}</div>
                  <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 16, color: c }}>{v}</div>
                </div>
              ))}
            </div>
            <ProgressBar label="Porcentaje depreciado" value={activo.depreciacion_acumulada} max={activo.valor_adquisicion} color="#F87171" />
            <div style={{ marginTop: 20 }}>
              <SectionTitle>Tabla de depreciación anual — método lineal</SectionTitle>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: 'var(--clt-font-body)' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    {['Año', 'Cuota Anual', 'Deprec. Acum.', 'Valor Residual'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontFamily: FONT, fontWeight: 700, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--t-text-5)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: activo.vida_util_años ?? 5 }, (_, i) => {
                    const acum = cuotaAnual * (i + 1)
                    const residual = Math.max(0, activo.valor_adquisicion - acum)
                    const yr = (activo.fecha_compra ? new Date(String(activo.fecha_compra) + 'T00:00:00').getFullYear() : new Date().getFullYear()) + i
                    const isPast = acum <= (activo.depreciacion_acumulada)
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

        {/* Tab: Asignaciones */}
        {tab === 'asig' && (
          <Table columns={asigCols as unknown as ColDef<Record<string, unknown>>[]} rows={asignaciones as unknown as Record<string, unknown>[]} />
        )}

        {/* Tab: Mantenimiento */}
        {tab === 'mant' && (
          <Table columns={mantCols as unknown as ColDef<Record<string, unknown>>[]} rows={mantenimientos as unknown as Record<string, unknown>[]} />
        )}

        {/* Tab: Documentos */}
        {tab === 'docs' && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', border: '2px dashed rgba(255,255,255,0.1)', cursor: 'pointer', minWidth: 180, color: 'var(--t-text-6)', transition: 'border-color 120ms' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(104,116,181,0.4)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
            >
              <UploadCloud size={16} />
              <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11 }}>Adjuntar archivo</span>
            </div>
          </div>
        )}

        {/* Tab: QR */}
        {tab === 'qr' && (
          <div style={{ display: 'flex', gap: 40, alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div style={{ background: 'white', padding: 16, border: '1px solid rgba(255,255,255,0.1)' }}>
                <QRCode value={activo.codigo} size={180} />
              </div>
              <div style={{ fontFamily: MONO, fontSize: 12, color: 'var(--t-text-3)', textAlign: 'center' }}>{activo.codigo}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <a href={`${process.env.NEXT_PUBLIC_API_URL}/v1/activos/${id}/qr?format=png`} target="_blank" rel="noopener">
                  <Btn variant="ghost" small icon={<Download size={12} />}>Descargar</Btn>
                </a>
                <a href={`${process.env.NEXT_PUBLIC_API_URL}/v1/activos/${id}/qr?format=zpl`} target="_blank" rel="noopener">
                  <Btn variant="ghost" small icon={<Printer size={12} />}>Imprimir Zebra</Btn>
                </a>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <SectionTitle>Información codificada</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {([
                  ['ID del activo', activo.codigo],
                  ['Nombre', activo.nombre],
                  ['Categoría', activo.categoria_id],
                  ['Serie', activo.numero_serie ?? '—'],
                  ['Área', activo.area ?? '—'],
                ] as [string, string][]).map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ fontSize: 10, color: 'var(--t-text-5)', fontFamily: FONT, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', width: 130, flexShrink: 0 }}>{k}</span>
                    <span style={{ fontSize: 12, color: 'var(--t-text-2)', fontFamily: FONT, fontWeight: 700 }}>{v}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 20, background: 'rgba(104,116,181,0.08)', border: '1px solid rgba(104,116,181,0.2)', padding: '12px 16px' }}>
                <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 10, color: 'var(--clt-cyan)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Para jornadas de inventario</div>
                <p style={{ fontSize: 12, color: 'var(--t-text-3)', margin: 0, lineHeight: 1.5 }}>
                  Imprimí este QR en la etiqueta del activo. Los lectores configurados en <strong style={{ color: 'var(--t-text-2)' }}>Configuración → Dispositivos</strong> lo reconocerán automáticamente.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action footer */}
        <div style={{ display: 'flex', gap: 8, marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <Link href={`/activos/nuevo?edit=${id}`}>
            <Btn variant="ghost" small icon={<Edit2 size={12} />}>Editar</Btn>
          </Link>
          <Btn variant="ghost" small icon={<Printer size={12} />}>Imprimir ficha</Btn>
          {activo.estado !== 'dado_de_baja' && (
            <Btn variant="danger" small icon={<Archive size={12} />}>Dar de baja</Btn>
          )}
          <div style={{ flex: 1 }} />
          <Link href="/activos" style={{ textDecoration: 'none' }}>
            <Btn variant="ghost" small>Cerrar</Btn>
          </Link>
        </div>
      </Card>
    </div>
  )
}
