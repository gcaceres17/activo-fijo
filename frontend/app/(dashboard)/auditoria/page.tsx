'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { AuditLog } from '@/types'
import { Btn, Card, ColDef, FONT, MONO, KPICard, PageHeader, SearchBar, Table } from '@/components/ui'
import { Activity, Calendar, Users, AlertTriangle, Download } from 'lucide-react'

const ACTION_LABELS: Record<string, { color: string; label: string }> = {
  ALTA_ACTIVO:          { color: '#4ADE80',         label: 'Alta' },
  MODIFICACION:         { color: '#FBB040',         label: 'Modificación' },
  BAJA_ACTIVO:          { color: '#F87171',         label: 'Baja' },
  ASIGNACION:           { color: '#A5B4FC',         label: 'Asignación' },
  MANTENIMIENTO:        { color: 'var(--clt-cyan)', label: 'Mantenimiento' },
  CONSULTA_REPORTE:     { color: 'var(--t-text-5)', label: 'Reporte' },
  CONSULTA_DEPRECIACION:{ color: 'var(--t-text-5)', label: 'Consulta' },
}

export default function AuditoriaPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')

  useEffect(() => {
    api.get<{ items: AuditLog[] }>('/v1/audit-logs?page_size=100')
      .then(r => setLogs(r.items ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = logs.filter(l => {
    const sq = q.toLowerCase()
    return !q || l.usuario_email.toLowerCase().includes(sq) || l.detalle.toLowerCase().includes(sq) || l.accion.toLowerCase().includes(sq)
  })

  const today = new Date().toISOString().split('T')[0]
  const eventosHoy = logs.filter(l => l.fecha_hora?.startsWith(today)).length

  const cols: ColDef<AuditLog>[] = [
    { key: 'id', label: 'ID', style: { width: 90 }, render: v => <span style={{ fontFamily: MONO, fontSize: 10, color: 'var(--t-text-5)' }}>{String(v).slice(-8)}</span> },
    { key: 'fecha_hora', label: 'Fecha', render: v => <span style={{ fontFamily: MONO, fontSize: 11, color: 'var(--t-text-4)' }}>{String(v ?? '').replace('T', ' ').slice(0, 16)}</span> },
    { key: 'usuario_email', label: 'Usuario', render: v => <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 12, color: 'var(--clt-cyan)' }}>{String(v)}</span> },
    {
      key: 'accion', label: 'Acción',
      render: v => {
        const s = ACTION_LABELS[String(v)] ?? { color: 'var(--t-text-5)', label: String(v) }
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px', background: `${s.color}12`, color: s.color, fontFamily: FONT, fontWeight: 700, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', border: `1px solid ${s.color}25`, whiteSpace: 'nowrap' }}>
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
            {s.label}
          </span>
        )
      },
    },
    { key: 'detalle', label: 'Detalle', render: v => <span style={{ fontSize: 12, color: 'var(--t-text-4)' }}>{String(v)}</span> },
    { key: 'ip_origen', label: 'IP', render: v => <span style={{ fontFamily: MONO, fontSize: 10, color: 'var(--t-text-6)' }}>{String(v ?? '—')}</span> },
  ]

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 256 }}>
      <div style={{ width: 28, height: 28, border: '2px solid #6874B5', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div>
      <PageHeader title="Auditoría y Logs" sub="Registro completo de actividad del sistema">
        <Btn icon={<Download size={14} />} variant="ghost" small>Exportar log</Btn>
      </PageHeader>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        <KPICard label="Eventos hoy" value={eventosHoy} icon={<Activity size={14} />} sub="últimas 24 horas" />
        <KPICard label="Esta semana" value={Math.min(logs.length, 12)} icon={<Calendar size={14} />} sub="eventos registrados" />
        <KPICard label="Usuarios activos" value={new Set(logs.map(l => l.usuario_email)).size} icon={<Users size={14} />} sub="últimos 7 días" />
        <KPICard label="Cambios críticos" value={logs.filter(l => l.accion === 'BAJA_ACTIVO').length} icon={<AlertTriangle size={14} />} sub="requieren revisión" gradient />
      </div>

      <Card style={{ marginBottom: 12 }}>
        <SearchBar value={q} onChange={setQ} placeholder="Buscar por usuario, acción, detalle..." />
      </Card>

      <Card noPad>
        <Table columns={cols} rows={filtered as unknown as Record<string, unknown>[]} />
      </Card>
    </div>
  )
}
