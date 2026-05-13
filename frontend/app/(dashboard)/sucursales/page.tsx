'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { Sucursal } from '@/types'
import { Btn, Card, FONT, MONO, FormField, InputDark, Modal, PageHeader, SelectDark } from '@/components/ui'
import { Plus, Save, MapPin, Building2, Layers } from 'lucide-react'

const NIVEL_LABELS: Record<number, string> = { 1: 'Sucursal', 2: 'Área', 3: 'Sector' }
const NIVEL_COLORS: Record<number, string> = { 1: '#6874B5', 2: '#6CBEDA', 3: '#4ADE80' }

interface SucursalForm {
  codigo: string; nombre: string; nivel: string; parent_id: string
}

export default function SucursalesPage() {
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<SucursalForm>({ codigo: '', nombre: '', nivel: '1', parent_id: '' })
  const set = (k: keyof SucursalForm) => (v: string) => setForm(f => ({ ...f, [k]: v }))

  async function load() {
    setLoading(true)
    try {
      const data = await api.get<Sucursal[]>('/v1/sucursales')
      setSucursales(data)
    } catch { } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function save() {
    if (!form.codigo || !form.nombre) return
    setSaving(true)
    try {
      await api.post('/v1/sucursales', {
        codigo: form.codigo,
        nombre: form.nombre,
        nivel: Number(form.nivel),
        parent_id: form.parent_id || null,
      })
      setShowModal(false)
      await load()
    } catch { } finally { setSaving(false) }
  }

  const nivel1 = sucursales.filter(s => s.nivel === 1)
  const nivel2 = sucursales.filter(s => s.nivel === 2)
  const nivel3 = sucursales.filter(s => s.nivel === 3)

  const parentOptions = sucursales
    .filter(s => s.nivel < Number(form.nivel))
    .map(s => ({ value: s.id, label: `${s.codigo} — ${s.nombre}` }))

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 256 }}>
      <div style={{ width: 28, height: 28, border: '2px solid #6874B5', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div>
      <PageHeader title="Sucursales y Áreas" sub={`${nivel1.length} sucursales · ${nivel2.length} áreas · ${nivel3.length} sectores`}>
        <Btn icon={<Plus size={14} />} variant="accent" small onClick={() => { setForm({ codigo: '', nombre: '', nivel: '1', parent_id: '' }); setShowModal(true) }}>Nueva sucursal</Btn>
      </PageHeader>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        {([
          { label: 'Sucursales', count: nivel1.length, icon: <Building2 size={14} />, color: '#6874B5' },
          { label: 'Áreas', count: nivel2.length, icon: <Layers size={14} />, color: '#6CBEDA' },
          { label: 'Sectores', count: nivel3.length, icon: <MapPin size={14} />, color: '#4ADE80' },
        ]).map(({ label, count, icon, color }) => (
          <div key={label} style={{ background: 'var(--t-bg-card)', border: '1px solid var(--t-border)', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 36, height: 36, background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
              {icon}
            </div>
            <div>
              <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 24, color: 'var(--t-text-white)', lineHeight: 1 }}>{count}</div>
              <div style={{ fontSize: 10, color: 'var(--t-text-5)', fontFamily: FONT, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 3 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Hierarchy tree */}
      <Card noPad>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontFamily: FONT, fontWeight: 700, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--t-text-4)' }}>
          Estructura jerárquica
        </div>
        {nivel1.map((s1, i1) => {
          const areas = nivel2.filter(s => s.parent_id === s1.id)
          return (
            <div key={s1.id} style={{ borderBottom: i1 < nivel1.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
              {/* Nivel 1 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 20px', background: 'rgba(104,116,181,0.04)' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#6874B5', boxShadow: '0 0 6px #6874B580', flexShrink: 0 }} />
                <span style={{ fontFamily: MONO, fontSize: 10, color: 'var(--t-text-5)', width: 80, flexShrink: 0 }}>{s1.codigo}</span>
                <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 13, color: 'var(--t-text-1)', flex: 1 }}>{s1.nombre}</span>
                <span style={{ fontSize: 9, color: '#6874B5', fontFamily: FONT, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', background: 'rgba(104,116,181,0.12)', padding: '2px 8px', borderRadius: 9999 }}>Sucursal</span>
                <button onClick={() => { setForm({ codigo: '', nombre: '', nivel: '2', parent_id: s1.id }); setShowModal(true) }}
                  style={{ width: 24, height: 24, background: 'rgba(104,116,181,0.1)', border: '1px solid rgba(104,116,181,0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--clt-violet)' }}>
                  <Plus size={10} />
                </button>
              </div>
              {/* Nivel 2 */}
              {areas.map((s2, i2) => {
                const sectores = nivel3.filter(s => s.parent_id === s2.id)
                return (
                  <div key={s2.id}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px 10px 40px', borderTop: '1px solid rgba(255,255,255,0.03)' }}>
                      <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#6CBEDA', flexShrink: 0 }} />
                      <span style={{ fontFamily: MONO, fontSize: 10, color: 'var(--t-text-5)', width: 80, flexShrink: 0 }}>{s2.codigo}</span>
                      <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 12, color: 'var(--t-text-2)', flex: 1 }}>{s2.nombre}</span>
                      <span style={{ fontSize: 9, color: '#6CBEDA', fontFamily: FONT, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', background: 'rgba(108,190,218,0.1)', padding: '2px 8px', borderRadius: 9999 }}>Área</span>
                      <button onClick={() => { setForm({ codigo: '', nombre: '', nivel: '3', parent_id: s2.id }); setShowModal(true) }}
                        style={{ width: 24, height: 24, background: 'rgba(108,190,218,0.08)', border: '1px solid rgba(108,190,218,0.15)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6CBEDA' }}>
                        <Plus size={10} />
                      </button>
                    </div>
                    {/* Nivel 3 */}
                    {sectores.map(s3 => (
                      <div key={s3.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 20px 8px 60px', borderTop: '1px solid rgba(255,255,255,0.02)', background: 'rgba(255,255,255,0.01)' }}>
                        <div style={{ width: 3, height: 3, borderRadius: '50%', background: '#4ADE80', flexShrink: 0 }} />
                        <span style={{ fontFamily: MONO, fontSize: 10, color: 'var(--t-text-6)', width: 80, flexShrink: 0 }}>{s3.codigo}</span>
                        <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, color: 'var(--t-text-3)', flex: 1 }}>{s3.nombre}</span>
                        <span style={{ fontSize: 9, color: '#4ADE80', fontFamily: FONT, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', background: 'rgba(74,222,128,0.08)', padding: '2px 8px', borderRadius: 9999 }}>Sector</span>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          )
        })}
        {nivel1.length === 0 && (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--t-text-5)', fontFamily: FONT, fontWeight: 700, fontSize: 13 }}>
            Sin sucursales registradas. Crea la primera con el botón de arriba.
          </div>
        )}
      </Card>

      {showModal && (
        <Modal title="Nueva sucursal / área / sector" onClose={() => setShowModal(false)} width={440}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <FormField label="Nivel" required>
              <SelectDark value={form.nivel} onChange={set('nivel')} options={[
                { value: '1', label: 'Nivel 1 — Sucursal' },
                { value: '2', label: 'Nivel 2 — Área' },
                { value: '3', label: 'Nivel 3 — Sector' },
              ]} />
            </FormField>
            {Number(form.nivel) > 1 && (
              <FormField label="Depende de" required>
                <SelectDark value={form.parent_id} onChange={set('parent_id')}
                  options={[{ value: '', label: 'Seleccionar…' }, ...parentOptions]} />
              </FormField>
            )}
            <FormField label="Código" required>
              <InputDark value={form.codigo} onChange={v => set('codigo')(v.toUpperCase())} placeholder={form.nivel === '1' ? 'Ej. ASU' : form.nivel === '2' ? 'Ej. ASU-TI' : 'Ej. ASU-TI-01'}/>
            </FormField>
            <FormField label="Nombre" required>
              <InputDark value={form.nombre} onChange={set('nombre')} placeholder={form.nivel === '1' ? 'Ej. Casa Matriz Asunción' : form.nivel === '2' ? 'Ej. Tecnología' : 'Ej. Soporte'} />
            </FormField>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
            <Btn variant="ghost" small onClick={() => setShowModal(false)}>Cancelar</Btn>
            <Btn variant="accent" small icon={<Save size={14} />} onClick={save}
              disabled={saving || !form.codigo || !form.nombre || (Number(form.nivel) > 1 && !form.parent_id)}>
              {saving ? 'Guardando…' : `Crear ${NIVEL_LABELS[Number(form.nivel)]}`}
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}
