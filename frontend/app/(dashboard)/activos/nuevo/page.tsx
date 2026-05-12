'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import type { Categoria, CentroCosto } from '@/types'
import { Btn, Card, FONT, FormField, InputDark, PageHeader, PhotoUpload, SelectFieldDark, fmt, fmtDate } from '@/components/ui'
import { Check, Save, ArrowRight } from 'lucide-react'

const STEPS = ['Identificación', 'Valoración', 'Asignación', 'Confirmar'] as const
const VIDA_UTIL_OPTIONS = ['3', '5', '7', '10', '15', '20', '25', '50'].map(v => ({ value: v, label: `${v} años` }))
const ESTADO_OPTIONS = ['Activo', 'Reservado'].map(v => ({ value: v.toLowerCase().replace(' ', '_'), label: v }))

export default function NuevoActivoPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [centros, setCentros] = useState<CentroCosto[]>([])

  const [form, setForm] = useState({
    codigo: '', nombre: '', categoria_id: '', marca: '', modelo: '',
    numero_serie: '', fecha_compra: '', valor_adquisicion: '',
    vida_util_anos: '5', estado: 'activo',
    area: '', centro_costo_id: '', responsable: '', ubicacion: '',
    observaciones: '', foto: null as string | null,
  })

  const set = (k: string) => (v: string) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    Promise.allSettled([
      api.get<Categoria[]>('/v1/categorias'),
      api.get<CentroCosto[]>('/v1/centros-costo'),
    ]).then(([catsR, ccsR]) => {
      if (catsR.status === 'fulfilled') setCategorias(catsR.value)
      if (ccsR.status === 'fulfilled') setCentros(ccsR.value)
    })
  }, [])

  const depAnual = form.valor_adquisicion && form.vida_util_anos
    ? Math.round(Number(form.valor_adquisicion) / Number(form.vida_util_anos))
    : 0

  const ccSelec = centros.find(c => c.id === form.centro_costo_id)

  async function handleSave() {
    setLoading(true); setError('')
    try {
      const payload = {
        nombre: form.nombre, categoria_id: form.categoria_id, marca: form.marca || undefined,
        modelo: form.modelo || undefined, numero_serie: form.numero_serie || undefined,
        fecha_compra: form.fecha_compra || undefined, valor_adquisicion: Number(form.valor_adquisicion),
        vida_util_años: Number(form.vida_util_anos), estado: form.estado,
        area: form.area || undefined, centro_costo_id: form.centro_costo_id || undefined,
        responsable: form.responsable || undefined, ubicacion: form.ubicacion || undefined,
      }
      await api.post('/v1/activos', payload)
      setSaved(true)
    } catch (e: unknown) {
      setError((e as { message?: string }).message ?? 'Error al registrar el activo')
    } finally { setLoading(false) }
  }

  if (saved) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 16 }}>
        <div style={{ width: 72, height: 72, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Check size={36} style={{ color: '#4ADE80' }} />
        </div>
        <h3 style={{ fontFamily: FONT, fontWeight: 900, fontSize: 22, color: 'var(--t-text-white)', margin: 0, letterSpacing: '-0.02em' }}>Activo registrado exitosamente</h3>
        <p style={{ color: 'var(--t-text-4)', fontFamily: 'var(--clt-font-body)', fontSize: 14, margin: 0, textAlign: 'center' }}>
          <strong style={{ color: 'var(--clt-cyan)' }}>{form.nombre}</strong> fue dado de alta correctamente.
        </p>
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <Btn variant="ghost" small onClick={() => router.push('/activos')}>Ver inventario</Btn>
          <Btn variant="accent" small onClick={() => { setForm({ codigo: '', nombre: '', categoria_id: '', marca: '', modelo: '', numero_serie: '', fecha_compra: '', valor_adquisicion: '', vida_util_anos: '5', estado: 'activo', area: '', centro_costo_id: '', responsable: '', ubicacion: '', observaciones: '', foto: null }); setStep(1); setSaved(false) }}>Registrar otro</Btn>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Registrar nuevo activo" sub="Completá todos los datos del activo fijo">
        <Btn variant="ghost" small onClick={() => router.push('/activos')}>Cancelar</Btn>
      </PageHeader>

      {/* Stepper */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 0, marginBottom: 24 }}>
        {STEPS.map((s, i) => {
          const n = i + 1; const active = n === step; const done = n < step
          return (
            <div key={s} onClick={() => done && setStep(n)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px', background: active ? 'rgba(104,116,181,0.2)' : done ? 'var(--t-border3)' : 'rgba(255,255,255,0.02)', borderBottom: `2px solid ${active ? 'var(--clt-violet)' : done ? 'rgba(74,222,128,0.4)' : 'var(--t-border2)'}`, cursor: done ? 'pointer' : 'default', transition: 'all 120ms', borderRight: i < 3 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: active ? 'var(--clt-gradient)' : done ? 'rgba(74,222,128,0.2)' : 'var(--t-border2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: done ? '1px solid rgba(74,222,128,0.4)' : active ? 'none' : '1px solid rgba(255,255,255,0.1)' }}>
                {done ? <Check size={12} style={{ color: '#4ADE80' }} /> : <span style={{ fontFamily: FONT, fontWeight: 900, fontSize: 11, color: active ? '#fff' : 'rgba(255,255,255,0.3)' }}>{n}</span>}
              </div>
              <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: active ? '#fff' : done ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.25)' }}>{s}</span>
            </div>
          )
        })}
      </div>

      {error && (
        <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', padding: '12px 16px', marginBottom: 16, color: '#F87171', fontFamily: 'var(--clt-font-body)', fontSize: 13 }}>{error}</div>
      )}

      <Card>
        {step === 1 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
              <PhotoUpload value={form.foto} onChange={set('foto')} size={130} />
              <span style={{ fontSize: 10, color: 'var(--t-text-6)', fontFamily: FONT, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', textAlign: 'center' }}>Foto del activo</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <FormField label="Código interno" hint="Se auto-genera si se deja vacío">
                <InputDark value={form.codigo} onChange={set('codigo')} placeholder="ACT-0013" />
              </FormField>
              <FormField label="Categoría" required>
                <SelectFieldDark value={form.categoria_id} onChange={set('categoria_id')}
                  options={[{ value: '', label: 'Seleccioná una categoría' }, ...categorias.map(c => ({ value: c.id, label: c.nombre }))]} />
              </FormField>
              <FormField label="Nombre / descripción" required style={{ gridColumn: '1/-1' }}>
                <InputDark value={form.nombre} onChange={set('nombre')} placeholder="Ej. Laptop Dell Latitude 5540" required />
              </FormField>
              <FormField label="Marca">
                <InputDark value={form.marca} onChange={set('marca')} placeholder="Dell, HP, Toyota…" />
              </FormField>
              <FormField label="Modelo">
                <InputDark value={form.modelo} onChange={set('modelo')} placeholder="Latitude 5540" />
              </FormField>
              <FormField label="Número de serie" hint="Debe ser único en el sistema">
                <InputDark value={form.numero_serie} onChange={set('numero_serie')} placeholder="SN-00000" />
              </FormField>
              <FormField label="Estado inicial">
                <SelectFieldDark value={form.estado} onChange={set('estado')} options={ESTADO_OPTIONS} />
              </FormField>
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <FormField label="Fecha de compra" required>
              <InputDark type="date" value={form.fecha_compra} onChange={set('fecha_compra')} required />
            </FormField>
            <FormField label="Valor de adquisición (₲)" required>
              <InputDark type="number" value={form.valor_adquisicion} onChange={set('valor_adquisicion')} placeholder="0" required />
            </FormField>
            <FormField label="Vida útil (años)" required>
              <SelectFieldDark value={form.vida_util_anos} onChange={set('vida_util_anos')} options={VIDA_UTIL_OPTIONS} />
            </FormField>
            <FormField label="Método de depreciación">
              <SelectFieldDark value="lineal" onChange={() => {}} options={[{ value: 'lineal', label: 'Lineal (cuota constante)' }]} />
            </FormField>
            {form.valor_adquisicion && form.vida_util_anos && (
              <div style={{ gridColumn: '1/-1', background: 'rgba(104,116,181,0.08)', border: '1px solid rgba(104,116,181,0.2)', padding: 16, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                {([
                  ['Cuota anual', fmt(depAnual)],
                  ['Cuota mensual', fmt(Math.round(depAnual / 12))],
                  ['Valor residual', fmt(Math.max(0, Number(form.valor_adquisicion) - depAnual * Number(form.vida_util_anos)))],
                ] as [string, string][]).map(([l, v]) => (
                  <div key={l}>
                    <div style={{ fontSize: 9, color: 'var(--t-text-5)', fontFamily: FONT, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 5 }}>{l}</div>
                    <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 18, color: 'var(--clt-cyan)' }}>{v}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <FormField label="Área responsable" required>
              <InputDark value={form.area} onChange={set('area')} placeholder="Tecnología, Administración…" />
            </FormField>
            <FormField label="Centro de costo" hint="Requerido para integración contable">
              <SelectFieldDark value={form.centro_costo_id} onChange={set('centro_costo_id')}
                options={[{ value: '', label: 'Seleccioná centro de costo' }, ...centros.map(c => ({ value: c.id, label: `${c.codigo} — ${c.nombre}` }))]} />
            </FormField>
            <FormField label="Responsable (empleado)">
              <InputDark value={form.responsable} onChange={set('responsable')} placeholder="Nombre del responsable" />
            </FormField>
            <FormField label="Ubicación física">
              <InputDark value={form.ubicacion} onChange={set('ubicacion')} placeholder="Sede Central - Piso 3" />
            </FormField>
            <FormField label="Observaciones" style={{ gridColumn: '1/-1' }}>
              <textarea value={form.observaciones} onChange={e => set('observaciones')(e.target.value)} rows={3} placeholder="Observaciones adicionales…"
                style={{ background: 'var(--t-bg-input)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--t-text-2)', fontFamily: 'var(--clt-font-body)', fontSize: 13, padding: '10px 12px', outline: 'none', width: '100%', resize: 'vertical', boxSizing: 'border-box' }} />
            </FormField>
          </div>
        )}

        {step === 4 && (
          <div>
            <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
              {form.foto && <img src={form.foto} alt="" style={{ width: 80, height: 80, objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }} />}
              <div style={{ background: 'var(--t-bg-card2)', border: '1px solid rgba(255,255,255,0.06)', padding: 20, flex: 1 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {([
                    ['Código', form.codigo || '(auto)'], ['Nombre', form.nombre || '—'],
                    ['Categoría', categorias.find(c => c.id === form.categoria_id)?.nombre || '—'],
                    ['Marca / Modelo', `${form.marca} ${form.modelo}`.trim() || '—'],
                    ['N° Serie', form.numero_serie || '—'], ['Fecha compra', fmtDate(form.fecha_compra)],
                    ['Valor adq.', form.valor_adquisicion ? fmt(Number(form.valor_adquisicion)) : '—'],
                    ['Vida útil', form.vida_util_anos ? `${form.vida_util_anos} años` : '—'],
                    ['Área', form.area || '—'],
                    ['Centro de costo', ccSelec ? `${ccSelec.codigo} — ${ccSelec.nombre}` : '—'],
                    ['Responsable', form.responsable || '—'], ['Estado', form.estado],
                  ] as [string, string][]).map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', gap: 8, borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: 8 }}>
                      <span style={{ fontSize: 10, color: 'var(--t-text-5)', fontFamily: FONT, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', width: 110, flexShrink: 0 }}>{k}</span>
                      <span style={{ fontSize: 12, color: 'var(--t-text-2)', fontFamily: FONT, fontWeight: 700 }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.2)' }}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#4ADE80" strokeWidth={2} style={{ flexShrink: 0 }}><polygon points="13,2 3,14 12,14 11,22 21,10 12,10 13,2" /></svg>
              <span style={{ fontSize: 12, color: 'var(--t-text-3)', fontFamily: 'var(--clt-font-body)' }}>Al confirmar se generará el asiento contable de alta y el código QR del activo automáticamente.</span>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.07)', justifyContent: 'flex-end' }}>
          {step > 1 && <Btn variant="ghost" small onClick={() => setStep(s => s - 1)}>← Anterior</Btn>}
          {step < 4
            ? <Btn variant="primary" small icon={<ArrowRight size={14} />} onClick={() => setStep(s => s + 1)}>Siguiente</Btn>
            : <Btn variant="accent" small icon={<Save size={14} />} disabled={loading} onClick={handleSave}>{loading ? 'Registrando…' : 'Registrar activo'}</Btn>
          }
        </div>
      </Card>
    </div>
  )
}
