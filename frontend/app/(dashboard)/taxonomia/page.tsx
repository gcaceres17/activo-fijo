'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { Grupo, Clase } from '@/types'
import { Btn, Card, FONT, MONO, FormField, InputDark, Modal, PageHeader, SectionTitle } from '@/components/ui'
import { Plus, Save, ChevronDown, ChevronRight, Edit2, Trash2 } from 'lucide-react'

const GROUP_COLORS = ['#6874B5','#6CBEDA','#65A0D3','#4ADE80','#FBB040','#F87171','#A5B4FC','#34D399','#FB923C','#60A5FA','#E879F9','#F472B6','#94A3B8','#FBBF24','#2DD4BF','#818CF8']

type ModalMode = 'grupo' | 'clase'

export default function TaxonomiaPage() {
  const [grupos, setGrupos] = useState<Grupo[]>([])
  const [clases, setClases] = useState<Clase[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [modal, setModal] = useState<{ mode: ModalMode; grupoId?: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [grupoForm, setGrupoForm] = useState({ codigo: '', nombre: '' })
  const [claseForm, setClaseForm] = useState({ codigo: '', nombre: '', tasa_depreciacion: '' })

  async function load() {
    setLoading(true)
    const [gr, cl] = await Promise.allSettled([
      api.get<Grupo[]>('/v1/taxonomia/grupos'),
      api.get<Clase[]>('/v1/taxonomia/clases'),
    ])
    if (gr.status === 'fulfilled') setGrupos(gr.value)
    if (cl.status === 'fulfilled') setClases(cl.value)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function toggle(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function openGrupo() {
    setGrupoForm({ codigo: '', nombre: '' })
    setModal({ mode: 'grupo' })
  }

  function openClase(grupoId: string) {
    setClaseForm({ codigo: '', nombre: '', tasa_depreciacion: '' })
    setModal({ mode: 'clase', grupoId })
  }

  async function saveGrupo() {
    if (!grupoForm.codigo || !grupoForm.nombre) return
    setSaving(true)
    try {
      await api.post('/v1/taxonomia/grupos', grupoForm)
      setModal(null)
      await load()
    } catch { } finally { setSaving(false) }
  }

  async function saveClase() {
    if (!claseForm.codigo || !claseForm.nombre || !modal?.grupoId) return
    setSaving(true)
    try {
      await api.post(`/v1/taxonomia/grupos/${modal.grupoId}/clases`, {
        ...claseForm,
        tasa_depreciacion: claseForm.tasa_depreciacion ? Number(claseForm.tasa_depreciacion) / 100 : null,
      })
      setModal(null)
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
      <PageHeader title="Grupos y Clases" sub={`${grupos.length} grupos · ${clases.length} clases de activos`}>
        <Btn icon={<Plus size={14} />} variant="accent" small onClick={openGrupo}>Nuevo Grupo</Btn>
      </PageHeader>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
        {grupos.map((g, idx) => {
          const color = GROUP_COLORS[idx % GROUP_COLORS.length]
          const clasesDelGrupo = clases.filter(c => c.grupo_id === g.id)
          const isOpen = expanded.has(g.id)
          return (
            <Card key={g.id} style={{ borderLeft: `3px solid ${color}`, padding: 0, overflow: 'hidden' }}>
              {/* Grupo header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', cursor: 'pointer' }}
                onClick={() => toggle(g.id)}>
                <div style={{ width: 36, height: 36, background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 10, color }}>{g.codigo}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 14, color: 'var(--t-text-1)' }}>{g.nombre}</div>
                  <div style={{ fontSize: 10, color: 'var(--t-text-5)', fontFamily: FONT, fontWeight: 700, marginTop: 2 }}>{clasesDelGrupo.length} clase{clasesDelGrupo.length !== 1 ? 's' : ''}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button onClick={e => { e.stopPropagation(); openClase(g.id) }}
                    style={{ width: 26, height: 26, background: 'rgba(104,116,181,0.1)', border: '1px solid rgba(104,116,181,0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--clt-violet)' }}>
                    <Plus size={11} />
                  </button>
                  <button style={{ width: 26, height: 26, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t-text-6)' }}>
                    <Edit2 size={11} />
                  </button>
                  <div style={{ color: 'var(--t-text-5)' }}>
                    {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </div>
                </div>
              </div>

              {/* Clases list */}
              {isOpen && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  {clasesDelGrupo.length === 0 ? (
                    <div style={{ padding: '12px 16px', fontSize: 11, color: 'var(--t-text-6)', fontFamily: FONT, fontWeight: 700 }}>
                      Sin clases. Agregá una con <span style={{ color: color }}>+</span>
                    </div>
                  ) : (
                    clasesDelGrupo.map((c, ci) => (
                      <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px 10px 20px', borderBottom: ci < clasesDelGrupo.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', background: 'var(--t-bg-card2)' }}>
                        <div style={{ width: 3, height: 3, borderRadius: '50%', background: color, flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ fontFamily: MONO, fontSize: 10, color: 'var(--t-text-5)', marginRight: 8 }}>{c.codigo}</span>
                          <span style={{ fontSize: 12, color: 'var(--t-text-2)', fontFamily: FONT, fontWeight: 700 }}>{c.nombre}</span>
                        </div>
                        {c.tasa_depreciacion != null && (
                          <span style={{ fontSize: 10, color: color, fontFamily: FONT, fontWeight: 700, background: `${color}18`, padding: '2px 8px', borderRadius: 9999, flexShrink: 0 }}>
                            {(c.tasa_depreciacion * 100).toFixed(1)}% anual
                          </span>
                        )}
                        <button style={{ width: 22, height: 22, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t-text-6)', flexShrink: 0 }}>
                          <Trash2 size={10} />
                        </button>
                      </div>
                    ))
                  )}
                  <div style={{ padding: '10px 16px', background: 'var(--t-bg-card2)' }}>
                    <button onClick={() => openClase(g.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'none', border: `1px dashed ${color}40`, cursor: 'pointer', padding: '5px 10px', color, fontFamily: FONT, fontWeight: 700, fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      <Plus size={10} /> Agregar clase
                    </button>
                  </div>
                </div>
              )}
            </Card>
          )
        })}

        {/* New group placeholder */}
        <div onClick={openGrupo} style={{ border: '2px dashed rgba(255,255,255,0.08)', padding: '28px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', transition: 'border-color 150ms', minHeight: 90 }}
          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(104,116,181,0.4)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.08)' }}>
          <Plus size={20} style={{ color: 'rgba(104,116,181,0.4)' }} />
          <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, color: 'var(--t-text-6)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Nuevo grupo</span>
        </div>
      </div>

      {/* Modal Grupo */}
      {modal?.mode === 'grupo' && (
        <Modal title="Nuevo Grupo" onClose={() => setModal(null)} width={420}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <FormField label="Código" required>
              <InputDark value={grupoForm.codigo} onChange={v => setGrupoForm(f => ({ ...f, codigo: v.toUpperCase() }))} placeholder="Ej. EQI"/>
            </FormField>
            <FormField label="Nombre" required>
              <InputDark value={grupoForm.nombre} onChange={v => setGrupoForm(f => ({ ...f, nombre: v }))} placeholder="Ej. Equipos Informáticos" />
            </FormField>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
            <Btn variant="ghost" small onClick={() => setModal(null)}>Cancelar</Btn>
            <Btn variant="accent" small icon={<Save size={14} />} onClick={saveGrupo} disabled={saving || !grupoForm.codigo || !grupoForm.nombre}>
              {saving ? 'Guardando…' : 'Crear grupo'}
            </Btn>
          </div>
        </Modal>
      )}

      {/* Modal Clase */}
      {modal?.mode === 'clase' && (
        <Modal title="Nueva Clase" onClose={() => setModal(null)} width={440}>
          <div style={{ marginBottom: 12, padding: '8px 12px', background: 'rgba(104,116,181,0.08)', border: '1px solid rgba(104,116,181,0.2)', fontSize: 11, color: 'var(--t-text-4)', fontFamily: FONT }}>
            Grupo: <strong style={{ color: 'var(--t-text-1)' }}>{grupos.find(g => g.id === modal.grupoId)?.nombre}</strong>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <FormField label="Código" required>
              <InputDark value={claseForm.codigo} onChange={v => setClaseForm(f => ({ ...f, codigo: v.toUpperCase() }))} placeholder="Ej. EQI-NB"/>
            </FormField>
            <FormField label="Nombre" required>
              <InputDark value={claseForm.nombre} onChange={v => setClaseForm(f => ({ ...f, nombre: v }))} placeholder="Ej. Notebooks y Laptops" />
            </FormField>
            <FormField label="Tasa de depreciación anual (%)">
              <InputDark value={claseForm.tasa_depreciacion} onChange={v => setClaseForm(f => ({ ...f, tasa_depreciacion: v }))} placeholder="Ej. 20 (para 20% anual)" type="number" />
            </FormField>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
            <Btn variant="ghost" small onClick={() => setModal(null)}>Cancelar</Btn>
            <Btn variant="accent" small icon={<Save size={14} />} onClick={saveClase} disabled={saving || !claseForm.codigo || !claseForm.nombre}>
              {saving ? 'Guardando…' : 'Crear clase'}
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}
