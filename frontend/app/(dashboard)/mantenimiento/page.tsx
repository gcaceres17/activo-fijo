'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { Mantenimiento, Activo, PaginatedActivos } from '@/types'
import { Badge, Btn, Card, ColDef, FONT, MONO, FormField, InputDark, KPICard, Modal, PageHeader, SearchBar, SelectDark, SelectFieldDark, Table, fmt, fmtDate } from '@/components/ui'
import { ClipboardList, Wrench, Calendar, DollarSign, Plus, Save } from 'lucide-react'

const TIPO_COLOR: Record<string, string> = { Correctivo: '#F87171', Preventivo: 'var(--clt-violet)', Predictivo: 'var(--clt-cyan)' }

export default function MantenimientoPage() {
  const [mantenimientos, setMantenimientos] = useState<Mantenimiento[]>([])
  const [activos, setActivos] = useState<Activo[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [tipo, setTipo] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ activo_id: '', tipo: '', tecnico: '', fecha_inicio: new Date().toISOString().split('T')[0], costo: '', descripcion: '' })

  const set = (k: string) => (v: string) => setForm(f => ({ ...f, [k]: v }))

  async function load() {
    const [mR, actR] = await Promise.allSettled([
      api.get<{ items: Mantenimiento[] }>('/v1/mantenimientos?page_size=100'),
      api.get<PaginatedActivos>('/v1/activos?page_size=100'),
    ])
    if (mR.status === 'fulfilled') setMantenimientos(mR.value.items ?? [])
    if (actR.status === 'fulfilled') setActivos(actR.value.items ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function save() {
    if (!form.activo_id || !form.tipo || !form.tecnico || !form.descripcion) {
      setError('Activo, tipo, técnico y descripción son obligatorios.')
      return
    }
    setSaving(true); setError('')
    try {
      await api.post('/v1/mantenimientos', {
        activo_id: form.activo_id,
        tipo: form.tipo,
        tecnico: form.tecnico,
        descripcion: form.descripcion,
        fecha_inicio: form.fecha_inicio || new Date().toISOString().split('T')[0],
        costo: form.costo ? Number(form.costo) : 0,
      })
      setShowModal(false)
      setForm({ activo_id: '', tipo: '', tecnico: '', fecha_inicio: new Date().toISOString().split('T')[0], costo: '', descripcion: '' })
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al crear la orden')
    } finally {
      setSaving(false)
    }
  }

  const filtered = mantenimientos.filter(m => {
    const sq = q.toLowerCase()
    return (!q || m.descripcion.toLowerCase().includes(sq) || m.activo_id.toLowerCase().includes(sq) || m.id.toLowerCase().includes(sq))
      && (!tipo || m.tipo === tipo)
  })

  const enProceso  = mantenimientos.filter(m => m.estado === 'en_proceso' || m.estado === 'En Proceso')
  const programado = mantenimientos.filter(m => m.estado === 'programado' || m.estado === 'Programado')
  const costoTotal = mantenimientos.reduce((s, m) => s + (m.costo ?? 0), 0)

  const cols: ColDef<Mantenimiento>[] = [
    { key: 'id', label: 'Orden', style: { width: 90 }, render: v => <span style={{ fontFamily: MONO, fontSize: 11, color: 'var(--clt-cyan)' }}>{String(v).slice(-8)}</span> },
    { key: 'activo_id', label: 'Activo', render: (v, r) => <div><div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 13, color: 'var(--t-text-1)' }}>{String(v)}</div></div> },
    {
      key: 'tipo', label: 'Tipo',
      render: v => <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 10, letterSpacing: '0.07em', textTransform: 'uppercase', color: TIPO_COLOR[String(v)] ?? 'var(--t-text-3)' }}>{String(v)}</span>,
    },
    { key: 'descripcion', label: 'Descripción', render: v => <span style={{ fontSize: 11, color: 'var(--t-text-4)' }}>{String(v).length > 50 ? String(v).slice(0, 48) + '…' : String(v)}</span> },
    { key: 'fecha_inicio', label: 'Fecha', render: v => <span style={{ fontSize: 12, color: 'var(--t-text-3)' }}>{fmtDate(String(v))}</span> },
    { key: 'costo', label: 'Costo', render: v => Number(v) > 0 ? <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 12, color: 'var(--t-text-2)' }}>{fmt(Number(v))}</span> : <span style={{ color: 'var(--t-text-6)' }}>Sin costo</span> },
    { key: 'estado', label: 'Estado', render: v => <Badge estado={String(v)} /> },
  ]

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 256 }}>
      <div style={{ width: 28, height: 28, border: '2px solid #6874B5', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div>
      <PageHeader title="Mantenimiento" sub="Historial y programación de órdenes de trabajo">
        <Btn icon={<Plus size={14} />} variant="accent" small onClick={() => setShowModal(true)}>Nueva orden</Btn>
      </PageHeader>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        <KPICard label="Total órdenes" value={mantenimientos.length} icon={<ClipboardList size={14} />} sub="histórico" />
        <KPICard label="En proceso" value={enProceso.length} icon={<Wrench size={14} />} sub="activos en taller" />
        <KPICard label="Programados" value={programado.length} icon={<Calendar size={14} />} sub="próximos" />
        <KPICard label="Costo total" value={`₲${new Intl.NumberFormat('es-PY').format(Math.round(costoTotal / 1000))}K`} icon={<DollarSign size={14} />} gradient />
      </div>

      <Card style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <SearchBar value={q} onChange={setQ} placeholder="Buscar por activo u orden..." />
          <SelectDark value={tipo} onChange={setTipo} style={{ minWidth: 150 }}
            options={[{ value: '', label: 'Todos los tipos' }, { value: 'Preventivo', label: 'Preventivo' }, { value: 'Correctivo', label: 'Correctivo' }, { value: 'Predictivo', label: 'Predictivo' }]} />
        </div>
      </Card>

      <Card noPad>
        <Table columns={cols} rows={filtered as unknown as Record<string, unknown>[]} />
      </Card>

      {showModal && (
        <Modal title="Nueva orden de mantenimiento" onClose={() => setShowModal(false)} width={560}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <FormField label="Activo" required style={{ gridColumn: '1/-1' }}>
              <SelectFieldDark value={form.activo_id} onChange={set('activo_id')}
                options={[{ value: '', label: 'Seleccioná un activo' }, ...activos.map(a => ({ value: a.id, label: `${a.codigo} — ${a.nombre}` }))]} />
            </FormField>
            <FormField label="Tipo" required>
              <SelectFieldDark value={form.tipo} onChange={set('tipo')}
                options={[{ value: '', label: 'Tipo' }, { value: 'preventivo', label: 'Preventivo' }, { value: 'correctivo', label: 'Correctivo' }, { value: 'predictivo', label: 'Predictivo' }]} />
            </FormField>
            <FormField label="Técnico">
              <InputDark value={form.tecnico} onChange={set('tecnico')} placeholder="Nombre del técnico" />
            </FormField>
            <FormField label="Fecha programada" required>
              <InputDark type="date" value={form.fecha_inicio} onChange={set('fecha_inicio')} />
            </FormField>
            <FormField label="Costo estimado (₲)">
              <InputDark type="number" value={form.costo} onChange={set('costo')} placeholder="0" />
            </FormField>
            <FormField label="Descripción" style={{ gridColumn: '1/-1' }}>
              <textarea value={form.descripcion} onChange={e => set('descripcion')(e.target.value)} rows={3}
                style={{ background: 'var(--t-bg-input)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--t-text-2)', fontFamily: 'var(--clt-font-body)', fontSize: 13, padding: '10px 12px', width: '100%', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
            </FormField>
          </div>
          {error && <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#F87171', fontSize: 12, fontFamily: FONT, fontWeight: 700 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
            <Btn variant="ghost" small onClick={() => { setShowModal(false); setError('') }}>Cancelar</Btn>
            <Btn variant="accent" small icon={<Save size={14} />} onClick={save}
              disabled={saving || !form.activo_id || !form.tipo || !form.tecnico || !form.descripcion}>
              {saving ? 'Guardando…' : 'Crear orden'}
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}
