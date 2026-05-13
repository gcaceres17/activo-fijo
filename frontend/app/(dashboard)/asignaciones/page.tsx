'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { Asignacion, Activo, Sucursal, PaginatedActivos } from '@/types'
import { Badge, Btn, Card, ColDef, FONT, MONO, FormField, InputDark, KPICard, Modal, PageHeader, SearchBar, SelectFieldDark, Table, fmtDate } from '@/components/ui'
import { Users, User, UserMinus, Plus, Save } from 'lucide-react'

export default function AsignacionesPage() {
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([])
  const [activos, setActivos] = useState<Activo[]>([])
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    activo_id: '', responsable_nombre: '', responsable_codigo: '',
    sucursal_id: '', fecha_inicio: new Date().toISOString().split('T')[0],
  })

  const set = (k: string) => (v: string) => setForm(f => ({ ...f, [k]: v }))

  async function load() {
    const [aR, actR, sR] = await Promise.allSettled([
      api.get<{ items: Asignacion[] }>('/v1/asignaciones?page_size=100'),
      api.get<PaginatedActivos>('/v1/activos?estado=activo&page_size=100'),
      api.get<Sucursal[]>('/v1/sucursales'),
    ])
    if (aR.status === 'fulfilled') setAsignaciones(aR.value.items ?? [])
    if (actR.status === 'fulfilled') setActivos(actR.value.items ?? [])
    if (sR.status === 'fulfilled') setSucursales(sR.value)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = asignaciones.filter(a => {
    const sq = q.toLowerCase()
    return !q || a.responsable_nombre.toLowerCase().includes(sq) || a.activo_id.toLowerCase().includes(sq)
  })

  const vigentes = asignaciones.filter(a => a.vigente)
  const bajas = asignaciones.filter(a => !a.vigente)
  const responsablesUnicos = new Set(vigentes.map(a => a.responsable_nombre)).size

  const cols: ColDef<Asignacion>[] = [
    { key: 'id', label: 'ID', style: { width: 90 }, render: v => <span style={{ fontFamily: MONO, fontSize: 11, color: 'var(--clt-cyan)' }}>{String(v).slice(-8)}</span> },
    { key: 'activo_id', label: 'Activo', render: v => {
      const a = activos.find(x => x.id === String(v))
      return <div>
        <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 13, color: 'var(--t-text-1)' }}>{a ? `${a.codigo} — ${a.nombre}` : String(v).slice(-8)}</div>
      </div>
    }},
    { key: 'responsable_nombre', label: 'Responsable', render: (v, r) => <div>
      <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 13, color: 'var(--t-text-1)' }}>{String(v)}</div>
      {(r as unknown as Asignacion).responsable_codigo && <div style={{ fontSize: 10, color: 'var(--t-text-5)' }}>Cód: {(r as unknown as Asignacion).responsable_codigo}</div>}
    </div> },
    { key: 'sucursal_id', label: 'Sucursal', render: v => {
      const s = sucursales.find(x => x.id === String(v))
      return <span style={{ fontSize: 11, color: 'var(--t-text-4)', fontFamily: FONT, fontWeight: 700 }}>{s?.nombre ?? '—'}</span>
    }},
    { key: 'fecha_inicio', label: 'Desde', render: v => <span style={{ fontSize: 12, color: 'var(--t-text-3)' }}>{fmtDate(String(v))}</span> },
    { key: 'vigente', label: 'Estado', render: v => <Badge estado={v ? 'activo' : 'dado_de_baja'} /> },
    { key: 'vigente', label: '', render: v => v ? <Btn variant="ghost" small onClick={() => {}}>Devolver</Btn> : null },
  ]

  async function save() {
    if (!form.activo_id || !form.responsable_nombre || !form.sucursal_id) return
    setSaving(true)
    try {
      await api.post('/v1/asignaciones', {
        activo_id: form.activo_id,
        responsable_nombre: form.responsable_nombre,
        responsable_codigo: form.responsable_codigo || null,
        sucursal_id: form.sucursal_id,
        fecha_inicio: form.fecha_inicio,
      })
      setShowModal(false)
      await load()
    } catch { } finally { setSaving(false) }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 256 }}>
      <div style={{ width: 28, height: 28, border: '2px solid #6874B5', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div>
      <PageHeader title="Asignaciones de Activos" sub="Control de activos asignados a responsables y sucursales">
        <Btn icon={<Plus size={14} />} variant="accent" small onClick={() => setShowModal(true)}>Nueva asignación</Btn>
      </PageHeader>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
        <KPICard label="Total vigentes" value={vigentes.length} sub="asignaciones activas" icon={<Users size={14} />} />
        <KPICard label="Responsables" value={responsablesUnicos} sub="con activos asignados" icon={<User size={14} />} />
        <KPICard label="Devueltos" value={bajas.length} sub="asignaciones finalizadas" icon={<UserMinus size={14} />} gradient />
      </div>

      <Card style={{ marginBottom: 12 }}>
        <SearchBar value={q} onChange={setQ} placeholder="Buscar por responsable, activo..." />
      </Card>

      <Card noPad>
        <Table columns={cols} rows={filtered as unknown as Record<string, unknown>[]} onRowClick={() => {}} />
      </Card>

      {showModal && (
        <Modal title="Nueva asignación" onClose={() => setShowModal(false)} width={520}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <FormField label="Activo a asignar" required>
              <SelectFieldDark value={form.activo_id} onChange={set('activo_id')}
                options={[{ value: '', label: 'Seleccioná un activo' }, ...activos.map(a => ({ value: a.id, label: `${a.codigo} — ${a.nombre}` }))]} />
            </FormField>
            <FormField label="Responsable" required>
              <InputDark value={form.responsable_nombre} onChange={set('responsable_nombre')} placeholder="Nombre completo del responsable" />
            </FormField>
            <FormField label="Código del responsable">
              <InputDark value={form.responsable_codigo} onChange={set('responsable_codigo')} placeholder="Ej. EMP-001" />
            </FormField>
            <FormField label="Sucursal" required>
              <SelectFieldDark value={form.sucursal_id} onChange={set('sucursal_id')}
                options={[{ value: '', label: 'Seleccioná una sucursal' }, ...sucursales.map(s => ({ value: s.id, label: s.nombre }))]} />
            </FormField>
            <FormField label="Fecha de asignación" required>
              <InputDark type="date" value={form.fecha_inicio} onChange={set('fecha_inicio')} />
            </FormField>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
            <Btn variant="ghost" small onClick={() => setShowModal(false)}>Cancelar</Btn>
            <Btn variant="accent" small icon={<Save size={14} />} onClick={save}
              disabled={saving || !form.activo_id || !form.responsable_nombre || !form.sucursal_id}>
              {saving ? 'Guardando…' : 'Confirmar asignación'}
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}
