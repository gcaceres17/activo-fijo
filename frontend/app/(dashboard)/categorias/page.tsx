'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { Categoria } from '@/types'
import { Btn, Card, FONT, FormField, InputDark, KPICard, Modal, PageHeader, ProgressBar, SectionTitle, SelectFieldDark } from '@/components/ui'
import { Plus, Save, Edit2 } from 'lucide-react'
import { ReactNode } from 'react'

const ICON_SVG: Record<string, ReactNode> = {
  'monitor': <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x={2} y={3} width={20} height={14} rx={2} /><line x1={8} y1={21} x2={16} y2={21} /><line x1={12} y1={17} x2={12} y2={21} /></svg>,
  'truck': <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x={1} y={3} width={15} height={13} /><polygon points="16,8 20,8 23,11 23,16 16,16 16,8" /><circle cx={5.5} cy={18.5} r={2.5} /><circle cx={18.5} cy={18.5} r={2.5} /></svg>,
  'armchair': <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M19 9V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v3" /><path d="M3 11v5a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v2H7v-2a2 2 0 0 0-4 0Z" /><path d="M5 18v2" /><path d="M19 18v2" /></svg>,
  'building': <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect width={16} height={20} x={4} y={2} rx={2} ry={2} /><path d="M9 22v-4h6v4" /><path d="M8 6h.01" /><path d="M16 6h.01" /><path d="M12 6h.01" /><path d="M12 10h.01" /><path d="M12 14h.01" /><path d="M16 10h.01" /><path d="M16 14h.01" /><path d="M8 10h.01" /><path d="M8 14h.01" /></svg>,
  'tool': <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>,
  'smartphone': <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x={5} y={2} width={14} height={20} rx={2} ry={2} /><line x1={12} y1={18} x2={12.01} y2={18} /></svg>,
}

interface CategoriaWithStats extends Categoria {
  total?: number; activos?: number; baja?: number
}

export default function CategoriasPage() {
  const [categorias, setCategorias] = useState<CategoriaWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ nombre: '', vida_util_default_anos: '5' })
  const set = (k: string) => (v: string) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    api.get<Categoria[]>('/v1/categorias')
      .then(cats => setCategorias(cats.map(c => ({ ...c, total: Math.floor(Math.random() * 10) + 2, activos: Math.floor(Math.random() * 8) + 1, baja: Math.floor(Math.random() * 2) }))))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const ICON_MAP: Record<string, ReactNode> = {
    laptop: ICON_SVG['monitor'], monitor: ICON_SVG['monitor'], desktop: ICON_SVG['monitor'],
    truck: ICON_SVG['truck'], car: ICON_SVG['truck'], vehicle: ICON_SVG['truck'],
    chair: ICON_SVG['armchair'], furniture: ICON_SVG['armchair'], desk: ICON_SVG['armchair'],
    building: ICON_SVG['building'], infrastructure: ICON_SVG['building'],
    tool: ICON_SVG['tool'], wrench: ICON_SVG['tool'], equipment: ICON_SVG['tool'],
    phone: ICON_SVG['smartphone'], mobile: ICON_SVG['smartphone'],
  }

  const getIcon = (icono: string) => ICON_MAP[icono] ?? ICON_SVG['monitor']

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 256 }}>
      <div style={{ width: 28, height: 28, border: '2px solid #6874B5', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div>
      <PageHeader title="Categorías de Activos" sub="Clasificación del inventario de activos fijos">
        <Btn icon={<Plus size={14} />} variant="accent" small onClick={() => setShowModal(true)}>Nueva categoría</Btn>
      </PageHeader>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
        {categorias.map(c => (
          <Card key={c.id} style={{ borderLeft: `3px solid ${c.color_hex}`, transition: 'border-color 150ms' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div style={{ width: 40, height: 40, background: `${c.color_hex}18`, border: `1px solid ${c.color_hex}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.color_hex }}>
                {getIcon(c.icono)}
              </div>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t-text-6)', display: 'flex', padding: 4 }}>
                <Edit2 size={13} />
              </button>
            </div>
            <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 15, color: 'var(--t-text-1)', marginBottom: 14 }}>{c.nombre}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 14 }}>
              {([['Total', c.total ?? 0, 'rgba(255,255,255,0.7)'], ['Activos', c.activos ?? 0, '#4ADE80'], ['Baja', c.baja ?? 0, '#F87171']] as [string, number, string][]).map(([l, v, col]) => (
                <div key={l} style={{ background: 'var(--t-bg-card2)', padding: 8, textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 20, color: col }}>{v}</div>
                  <div style={{ fontSize: 9, color: 'var(--t-text-5)', fontFamily: FONT, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{l}</div>
                </div>
              ))}
            </div>
            <ProgressBar value={c.activos ?? 0} max={c.total ?? 1} color={c.color_hex} />
          </Card>
        ))}
      </div>

      {showModal && (
        <Modal title="Nueva categoría" onClose={() => setShowModal(false)} width={440}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <FormField label="Nombre" required>
              <InputDark value={form.nombre} onChange={set('nombre')} placeholder="Ej. Equipos de Cómputo" />
            </FormField>
            <FormField label="Vida útil por defecto">
              <SelectFieldDark value={form.vida_util_default_anos} onChange={set('vida_util_default_anos')}
                options={['3', '5', '7', '10', '15', '20', '25'].map(v => ({ value: v, label: `${v} años` }))} />
            </FormField>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
            <Btn variant="ghost" small onClick={() => setShowModal(false)}>Cancelar</Btn>
            <Btn variant="accent" small icon={<Save size={14} />} onClick={() => setShowModal(false)}>Crear</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}
