'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import type { Grupo, Clase, Sucursal } from '@/types'
import { Btn, Card, FONT, FormField, InputDark, PageHeader, PhotoUpload, SelectFieldDark, fmt } from '@/components/ui'
import { Check, Save, ArrowRight } from 'lucide-react'

const STEPS = ['Identificación', 'Clasificación', 'Valoración', 'Confirmar'] as const

const VIDA_UTIL_OPTIONS = [
  { value: '12',  label: '1 año   (12 meses)' },
  { value: '24',  label: '2 años  (24 meses)' },
  { value: '36',  label: '3 años  (36 meses)' },
  { value: '48',  label: '4 años  (48 meses)' },
  { value: '60',  label: '5 años  (60 meses)' },
  { value: '84',  label: '7 años  (84 meses)' },
  { value: '120', label: '10 años (120 meses)' },
  { value: '180', label: '15 años (180 meses)' },
  { value: '240', label: '20 años (240 meses)' },
  { value: '600', label: '50 años (600 meses)' },
]

export default function NuevoActivoPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [grupos, setGrupos] = useState<Grupo[]>([])
  const [clases, setClases] = useState<Clase[]>([])
  const [sucursales, setSucursales] = useState<Sucursal[]>([])

  const [form, setForm] = useState({
    nombre: '', grupo_id: '', clase_id: '', sucursal_id: '',
    marca: '', modelo: '', numero_serie: '', fecha_compra: '',
    valor_adquisicion: '', vida_util_meses: '60', valor_residual: '0',
    foto: null as string | null,
  })

  const set = (k: string) => (v: string) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    Promise.allSettled([
      api.get<Grupo[]>('/v1/taxonomia/grupos'),
      api.get<Sucursal[]>('/v1/sucursales'),
    ]).then(([gr, sr]) => {
      if (gr.status === 'fulfilled') setGrupos(gr.value)
      if (sr.status === 'fulfilled') setSucursales(sr.value)
    })
  }, [])

  // Cargar clases cuando cambia el grupo
  useEffect(() => {
    if (!form.grupo_id) { setClases([]); return }
    api.get<Clase[]>(`/v1/taxonomia/grupos/${form.grupo_id}/clases`)
      .then(setClases)
      .catch(() => setClases([]))
    set('clase_id')('')
  }, [form.grupo_id])

  const depMensual = form.valor_adquisicion && form.vida_util_meses
    ? Math.round(
        (Number(form.valor_adquisicion) - Number(form.valor_residual || 0)) /
        Number(form.vida_util_meses)
      )
    : 0

  const grupoSelec = grupos.find(g => g.id === form.grupo_id)
  const claseSelec = clases.find(c => c.id === form.clase_id)
  const sucursalSelec = sucursales.find(s => s.id === form.sucursal_id)

  // Validaciones por step
  function canNext(): boolean {
    if (step === 1) return !!form.nombre
    if (step === 2) return !!(form.grupo_id && form.clase_id && form.sucursal_id)
    if (step === 3) return !!(form.valor_adquisicion && Number(form.valor_adquisicion) > 0)
    return true
  }

  async function handleSave() {
    setLoading(true); setError('')
    try {
      const payload = {
        nombre: form.nombre,
        grupo_id: form.grupo_id,
        clase_id: form.clase_id,
        sucursal_id: form.sucursal_id,
        marca: form.marca || undefined,
        modelo: form.modelo || undefined,
        numero_serie: form.numero_serie || undefined,
        fecha_compra: form.fecha_compra || undefined,
        valor_adquisicion: Number(form.valor_adquisicion),
        vida_util_meses: Number(form.vida_util_meses),
        valor_residual: Number(form.valor_residual || 0),
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
          <strong style={{ color: 'var(--clt-cyan)' }}>{form.nombre}</strong> fue dado de alta con código QR generado.
        </p>
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <Btn variant="ghost" small onClick={() => router.push('/activos')}>Ver inventario</Btn>
          <Btn variant="accent" small onClick={() => {
            setForm({ nombre: '', grupo_id: '', clase_id: '', sucursal_id: '', marca: '', modelo: '', numero_serie: '', fecha_compra: '', valor_adquisicion: '', vida_util_meses: '60', valor_residual: '0', foto: null })
            setStep(1); setSaved(false)
          }}>Registrar otro</Btn>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Registrar nuevo activo" sub="Completá todos los datos del bien">
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
        {/* STEP 1 — Identificación */}
        {step === 1 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
              <PhotoUpload value={form.foto} onChange={set('foto')} size={130} />
              <span style={{ fontSize: 10, color: 'var(--t-text-6)', fontFamily: FONT, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', textAlign: 'center' }}>Foto del activo</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <FormField label="Nombre / descripción" required style={{ gridColumn: '1/-1' }}>
                <InputDark value={form.nombre} onChange={set('nombre')} placeholder="Ej. Laptop Dell Latitude 5540" />
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
              <FormField label="Fecha de compra">
                <InputDark type="date" value={form.fecha_compra} onChange={set('fecha_compra')} />
              </FormField>
            </div>
          </div>
        )}

        {/* STEP 2 — Clasificación */}
        {step === 2 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <FormField label="Grupo" required hint="Categoría principal del activo">
              <SelectFieldDark value={form.grupo_id} onChange={set('grupo_id')}
                options={[{ value: '', label: 'Seleccioná un grupo' }, ...grupos.map(g => ({ value: g.id, label: `${g.codigo} — ${g.nombre}` }))]} />
            </FormField>
            <FormField label="Clase" required hint={form.grupo_id ? 'Subclase del grupo seleccionado' : 'Primero seleccioná un grupo'}>
              <SelectFieldDark value={form.clase_id} onChange={set('clase_id')}
                options={[{ value: '', label: form.grupo_id ? 'Seleccioná una clase' : '— Primero elegí un grupo —' }, ...clases.map(c => ({ value: c.id, label: `${c.codigo} — ${c.nombre}` }))]}
              />
            </FormField>
            <FormField label="Sucursal / Ubicación" required style={{ gridColumn: '1/-1' }} hint="Dónde está físicamente este activo">
              <SelectFieldDark value={form.sucursal_id} onChange={set('sucursal_id')}
                options={[{ value: '', label: 'Seleccioná una sucursal' }, ...sucursales.map(s => ({ value: s.id, label: `${'  '.repeat(s.nivel - 1)}${s.codigo} — ${s.nombre}` }))]} />
            </FormField>
            {form.grupo_id && form.clase_id && claseSelec?.tasa_depreciacion && (
              <div style={{ gridColumn: '1/-1', background: 'rgba(104,116,181,0.08)', border: '1px solid rgba(104,116,181,0.2)', padding: '12px 16px' }}>
                <div style={{ fontSize: 10, color: 'var(--t-text-5)', fontFamily: FONT, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Tasa de depreciación sugerida para esta clase</div>
                <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 18, color: 'var(--clt-cyan)' }}>
                  {(claseSelec.tasa_depreciacion * 100).toFixed(2)}% anual
                  <span style={{ fontSize: 12, color: 'var(--t-text-4)', fontWeight: 400, marginLeft: 8 }}>
                    → vida útil sugerida: {Math.round(1 / claseSelec.tasa_depreciacion)} años
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 3 — Valoración */}
        {step === 3 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <FormField label="Valor de adquisición (₲)" required>
              <InputDark type="number" value={form.valor_adquisicion} onChange={set('valor_adquisicion')} placeholder="0" />
            </FormField>
            <FormField label="Valor residual (₲)" hint="Valor estimado al final de la vida útil">
              <InputDark type="number" value={form.valor_residual} onChange={set('valor_residual')} placeholder="0" />
            </FormField>
            <FormField label="Vida útil" required>
              <SelectFieldDark value={form.vida_util_meses} onChange={set('vida_util_meses')} options={VIDA_UTIL_OPTIONS} />
            </FormField>
            <FormField label="Método de depreciación">
              <SelectFieldDark value="sln" onChange={() => {}} options={[{ value: 'sln', label: 'Línea Recta — SLN (BCP)' }]} />
            </FormField>
            {form.valor_adquisicion && (
              <div style={{ gridColumn: '1/-1', background: 'rgba(104,116,181,0.08)', border: '1px solid rgba(104,116,181,0.2)', padding: 16, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                {([
                  ['Cuota mensual', fmt(depMensual)],
                  ['Cuota anual',   fmt(depMensual * 12)],
                  ['Al término',    fmt(Math.max(0, Number(form.valor_residual || 0)))],
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

        {/* STEP 4 — Confirmar */}
        {step === 4 && (
          <div>
            <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
              {form.foto && <img src={form.foto} alt="" style={{ width: 80, height: 80, objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }} />}
              <div style={{ background: 'var(--t-bg-card2)', border: '1px solid rgba(255,255,255,0.06)', padding: 20, flex: 1 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {([
                    ['Nombre',       form.nombre || '—'],
                    ['Marca / Modelo', `${form.marca} ${form.modelo}`.trim() || '—'],
                    ['N° Serie',     form.numero_serie || '—'],
                    ['Fecha compra', form.fecha_compra || '—'],
                    ['Grupo',        grupoSelec ? `${grupoSelec.codigo} — ${grupoSelec.nombre}` : '—'],
                    ['Clase',        claseSelec ? `${claseSelec.codigo} — ${claseSelec.nombre}` : '—'],
                    ['Sucursal',     sucursalSelec ? sucursalSelec.nombre : '—'],
                    ['Valor adq.',   form.valor_adquisicion ? fmt(Number(form.valor_adquisicion)) : '—'],
                    ['Vida útil',    form.vida_util_meses ? `${form.vida_util_meses} meses` : '—'],
                    ['Cuota mensual',fmt(depMensual)],
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
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#4ADE80" strokeWidth={2}><polygon points="13,2 3,14 12,14 11,22 21,10 12,10 13,2" /></svg>
              <span style={{ fontSize: 12, color: 'var(--t-text-3)', fontFamily: 'var(--clt-font-body)' }}>
                Al confirmar se generará el código QR y se registrará el asiento de alta en auditoría.
              </span>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.07)', justifyContent: 'flex-end' }}>
          {step > 1 && <Btn variant="ghost" small onClick={() => setStep(s => s - 1)}>← Anterior</Btn>}
          {step < 4
            ? <Btn variant="primary" small icon={<ArrowRight size={14} />} disabled={!canNext()} onClick={() => setStep(s => s + 1)}>Siguiente</Btn>
            : <Btn variant="accent" small icon={<Save size={14} />} disabled={loading} onClick={handleSave}>{loading ? 'Registrando…' : 'Registrar activo'}</Btn>
          }
        </div>
      </Card>
    </div>
  )
}
