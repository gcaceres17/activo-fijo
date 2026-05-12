'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { Asignacion, Activo, CentroCosto, PaginatedActivos } from '@/types'
import { Badge, Btn, Card, ColDef, FONT, MONO, FormField, InputDark, KPICard, Modal, PageHeader, SearchBar, SelectFieldDark, Table, fmtDate } from '@/components/ui'
import { Users, User, UserMinus, Plus, Save } from 'lucide-react'

export default function AsignacionesPage() {
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([])
  const [activos, setActivos] = useState<Activo[]>([])
  const [centros, setCentros] = useState<CentroCosto[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ activo_id: '', empleado_nombre: '', empleado_cedula: '', area: '', centro_costo_id: '', fecha_asignacion: new Date().toISOString().split('T')[0] })

  const set = (k: string) => (v: string) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    Promise.allSettled([
      api.get<{ items: Asignacion[] }>('/v1/asignaciones?page_size=100'),
      api.get<PaginatedActivos>('/v1/activos?estado=activo&page_size=100'),
      api.get<CentroCosto[]>('/v1/centros-costo'),
    ]).then(([aR, actR, ccR]) => {
      if (aR.status === 'fulfilled') setAsignaciones(aR.value.items ?? [])
      if (actR.status === 'fulfilled') setActivos(actR.value.items ?? [])
      if (ccR.status === 'fulfilled') setCentros(ccR.value)
    }).finally(() => setLoading(false))
  }, [])

  const filtered = asignaciones.filter(a => {
    const sq = q.toLowerCase()
    return !q || a.empleado_nombre.toLowerCase().includes(sq) || a.activo_id.toLowerCase().includes(sq) || a.area.toLowerCase().includes(sq)
  })

  const vigentes = asignaciones.filter(a => a.estado === 'vigente')
  const bajas = asignaciones.filter(a => a.estado === 'baja')
  const empleadosUnicos = new Set(vigentes.map(a => a.empleado_nombre)).size

  const cols: ColDef<Asignacion>[] = [
    { key: 'id', label: 'ID', style: { width: 90 }, render: v => <span style={{ fontFamily: MONO, fontSize: 11, color: 'var(--clt-cyan)' }}>{String(v).slice(-8)}</span> },
    { key: 'activo_id', label: 'Activo', render: (v, r) => <div><div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 13, color: 'var(--t-text-1)' }}>{String(v)}</div><div style={{ fontSize: 10, color: 'var(--t-text-5)' }}>Asignación</div></div> },
    { key: 'empleado_nombre', label: 'Empleado', render: (v, r) => <div><div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 13, color: 'var(--t-text-1)' }}>{String(v)}</div>{r.empleado_cedula && <div style={{ fontSize: 10, color: 'var(--t-text-5)' }}>CI: {String(r.empleado_cedula)}</div>}</div> },
    { key: 'area', label: 'Área', render: v => <span style={{ fontSize: 12, color: 'var(--t-text-3)' }}>{String(v)}</span> },
    {
      key: 'centro_costo_id', label: 'C. Costo',
      render: v => {
        const cc = centros.find(c => c.id === String(v))
        return <span style={{ fontSize: 11, color: 'var(--t-text-4)', fontFamily: FONT, fontWeight: 700 }}>{cc ? cc.codigo : '—'}</span>
      },
    },
    { key: 'fecha_asignacion', label: 'Desde', render: v => <span style={{ fontSize: 12, color: 'var(--t-text-3)' }}>{fmtDate(String(v))}</span> },
    { key: 'estado', label: 'Estado', render: v => <Badge estado={String(v)} /> },
    { key: 'estado', label: '', render: (v, r) => v === 'vigente' ? <Btn variant="ghost" small onClick={() => {}}>Devolver</Btn> : null },
  ]

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 256 }}>
      <div style={{ width: 28, height: 28, border: '2px solid #6874B5', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div>
      <PageHeader title="Asignaciones de Activos" sub="Control de activos asignados a empleados y áreas">
        <Btn icon={<Plus size={14} />} variant="accent" small onClick={() => setShowModal(true)}>Nueva asignación</Btn>
      </PageHeader>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
        <KPICard label="Total vigentes" value={vigentes.length} sub="asignaciones activas" icon={<Users size={14} />} />
        <KPICard label="Empleados" value={empleadosUnicos} sub="con activos asignados" icon={<User size={14} />} />
        <KPICard label="Bajas" value={bajas.length} sub="asignaciones finalizadas" icon={<UserMinus size={14} />} gradient />
      </div>

      <Card style={{ marginBottom: 12 }}>
        <SearchBar value={q} onChange={setQ} placeholder="Buscar por empleado, activo, área..." />
      </Card>

      <Card noPad>
        <Table columns={cols} rows={filtered as unknown as Record<string, unknown>[]} onRowClick={() => {}} />
      </Card>

      {showModal && (
        <Modal title="Nueva asignación" onClose={() => setShowModal(false)} width={560}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <FormField label="Activo a asignar" required>
              <SelectFieldDark value={form.activo_id} onChange={set('activo_id')}
                options={[{ value: '', label: 'Seleccioná un activo' }, ...activos.map(a => ({ value: a.id, label: `${a.codigo} — ${a.nombre}` }))]} />
            </FormField>
            <FormField label="Empleado responsable" required>
              <InputDark value={form.empleado_nombre} onChange={set('empleado_nombre')} placeholder="Nombre completo" />
            </FormField>
            <FormField label="Cédula de identidad" required>
              <InputDark value={form.empleado_cedula} onChange={set('empleado_cedula')} placeholder="X.XXX.XXX" />
            </FormField>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <FormField label="Área">
                <InputDark value={form.area} onChange={set('area')} placeholder="Área" />
              </FormField>
              <FormField label="Centro de costo">
                <SelectFieldDark value={form.centro_costo_id} onChange={set('centro_costo_id')}
                  options={[{ value: '', label: 'Centro de costo' }, ...centros.map(c => ({ value: c.id, label: `${c.codigo} — ${c.nombre.slice(0, 16)}…` }))]} />
              </FormField>
            </div>
            <FormField label="Fecha de asignación" required>
              <InputDark type="date" value={form.fecha_asignacion} onChange={set('fecha_asignacion')} />
            </FormField>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
            <Btn variant="ghost" small onClick={() => setShowModal(false)}>Cancelar</Btn>
            <Btn variant="accent" small icon={<Save size={14} />} onClick={() => setShowModal(false)}>Confirmar asignación</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}
