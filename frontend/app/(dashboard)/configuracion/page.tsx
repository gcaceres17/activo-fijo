'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { TenantSettings, TenantFeature, Usuario } from '@/types'
import {
  Badge, Btn, Card, FONT, FormField, InputDark, KPICard,
  Modal, PageHeader, SelectFieldDark, Table, ColDef,
} from '@/components/ui'
import { Settings, Users, ToggleLeft, ToggleRight, Plus, Save, Shield, Trash2, Edit2 } from 'lucide-react'
import { clearFeaturesCache } from '@/hooks/useFeatures'

type Tab = 'general' | 'features' | 'usuarios'

const ROL_OPTIONS = [
  { value: 'admin',    label: 'Administrador' },
  { value: 'operador', label: 'Operador' },
  { value: 'auditor',  label: 'Auditor' },
  { value: 'relevador',label: 'Relevador de inventario' },
]

const ROL_LABELS: Record<string, string> = {
  sysadmin_clt: 'Sys Admin CLT', admin_banco: 'Admin Banco',
  admin: 'Administrador', operador: 'Operador',
  auditor: 'Auditor', relevador: 'Relevador',
}

export default function ConfiguracionPage() {
  const [tab, setTab] = useState<Tab>('general')

  const [settings, setSettings] = useState<TenantSettings | null>(null)
  const [settingsForm, setSettingsForm] = useState<Partial<TenantSettings>>({})
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsOk, setSettingsOk] = useState(false)

  const [features, setFeatures] = useState<TenantFeature[]>([])
  const [togglingFeature, setTogglingFeature] = useState<string | null>(null)

  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [showUsuarioModal, setShowUsuarioModal] = useState(false)
  const [editingUser, setEditingUser] = useState<Usuario | null>(null)
  const [userForm, setUserForm] = useState({ email: '', nombre_completo: '', rol: 'operador', password: '' })
  const [savingUser, setSavingUser] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.allSettled([
      api.get<TenantSettings>('/v1/tenants/me/settings'),
      api.get<TenantFeature[]>('/v1/tenants/me/features'),
      api.get<Usuario[]>('/v1/tenants/me/usuarios'),
    ]).then(([sR, fR, uR]) => {
      if (sR.status === 'fulfilled') { setSettings(sR.value); setSettingsForm(sR.value) }
      if (fR.status === 'fulfilled') setFeatures(fR.value)
      if (uR.status === 'fulfilled') setUsuarios(uR.value)
    }).finally(() => setLoading(false))
  }, [])

  const setF = (k: keyof TenantSettings) => (v: string) =>
    setSettingsForm(f => ({ ...f, [k]: v }))

  async function saveSettings() {
    setSavingSettings(true)
    try {
      const updated = await api.patch<TenantSettings>('/v1/tenants/me/settings', settingsForm)
      setSettings(updated); setSettingsOk(true)
      setTimeout(() => setSettingsOk(false), 2500)
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error') }
    finally { setSavingSettings(false) }
  }

  async function toggleFeature(feature: string, current: boolean) {
    setTogglingFeature(feature)
    try {
      const updated = await api.patch<TenantFeature>(`/v1/tenants/me/features/${feature}`, { habilitado: !current })
      setFeatures(fs => fs.map(f => f.feature === feature ? { ...f, habilitado: updated.habilitado } : f))
      clearFeaturesCache()
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error') }
    finally { setTogglingFeature(null) }
  }

  function openCreateUser() {
    setEditingUser(null)
    setUserForm({ email: '', nombre_completo: '', rol: 'operador', password: '' })
    setShowUsuarioModal(true)
  }

  function openEditUser(u: Usuario) {
    setEditingUser(u)
    setUserForm({ email: u.email, nombre_completo: u.nombre_completo, rol: u.rol, password: '' })
    setShowUsuarioModal(true)
  }

  async function saveUser() {
    setSavingUser(true)
    try {
      if (editingUser) {
        const updated = await api.patch<Usuario>(`/v1/tenants/me/usuarios/${editingUser.id}`, {
          nombre_completo: userForm.nombre_completo, rol: userForm.rol,
        })
        setUsuarios(us => us.map(u => u.id === editingUser.id ? updated : u))
      } else {
        const created = await api.post<Usuario>('/v1/tenants/me/usuarios', userForm)
        setUsuarios(us => [...us, created])
      }
      setShowUsuarioModal(false)
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error') }
    finally { setSavingUser(false) }
  }

  async function deactivateUser(u: Usuario) {
    if (!confirm(`¿Desactivar a "${u.nombre_completo}"?`)) return
    try {
      await api.delete(`/v1/tenants/me/usuarios/${u.id}`)
      setUsuarios(us => us.map(x => x.id === u.id ? { ...x, activo: false } : x))
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error') }
  }

  const userCols: ColDef<Usuario>[] = [
    { key: 'nombre_completo', label: 'Usuario', render: (v, r) => (
      <div>
        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--t-text-1)' }}>{String(v)}</div>
        <div style={{ fontSize: 11, color: 'var(--t-text-4)' }}>{(r as unknown as Usuario).email}</div>
      </div>
    )},
    { key: 'rol', label: 'Rol', render: v => (
      <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 10, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--clt-cyan)' }}>
        {ROL_LABELS[String(v)] ?? String(v)}
      </span>
    )},
    { key: 'activo', label: 'Estado', render: v => <Badge estado={v ? 'activo' : 'dado_de_baja'} /> },
    { key: 'id', label: '', render: (_, r) => {
      const u = r as unknown as Usuario
      return (
        <div style={{ display: 'flex', gap: 6 }}>
          <Btn variant="ghost" small onClick={() => openEditUser(u)}><Edit2 size={11} /></Btn>
          {u.activo && <Btn variant="danger" small onClick={() => deactivateUser(u)}><Trash2 size={11} /></Btn>}
        </div>
      )
    }},
  ]

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 256 }}>
      <div style={{ width: 28, height: 28, border: '2px solid #6874B5', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div>
      <PageHeader title="Configuración" sub="Ajustes del tenant, feature flags y usuarios">
        {tab === 'general' && (
          <Btn icon={<Save size={14} />} variant="accent" small onClick={saveSettings} disabled={savingSettings}>
            {savingSettings ? 'Guardando…' : settingsOk ? '✓ Guardado' : 'Guardar cambios'}
          </Btn>
        )}
        {tab === 'usuarios' && (
          <Btn icon={<Plus size={14} />} variant="accent" small onClick={openCreateUser}>Nuevo usuario</Btn>
        )}
      </PageHeader>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 20, borderBottom: '1px solid var(--t-border)' }}>
        {([
          { key: 'general',  label: 'General',       icon: <Settings size={12} /> },
          { key: 'features', label: 'Feature Flags', icon: <ToggleRight size={12} /> },
          { key: 'usuarios', label: 'Usuarios',       icon: <Users size={12} /> },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '10px 18px', fontFamily: FONT, fontWeight: 700,
            fontSize: 11, letterSpacing: '0.07em', textTransform: 'uppercase',
            border: 'none', cursor: 'pointer', background: 'transparent',
            color: tab === t.key ? 'var(--clt-cyan)' : 'var(--t-text-4)',
            borderBottom: `2px solid ${tab === t.key ? 'var(--clt-cyan)' : 'transparent'}`,
            marginBottom: -1, transition: 'all 120ms',
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: General ───────────────────────────────────────────────────── */}
      {tab === 'general' && settings && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <Card style={{ gridColumn: '1 / -1' }}>
            <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--t-text-3)', marginBottom: 16 }}>
              Configuración regional
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <FormField label="Moneda">
                <SelectFieldDark value={settingsForm.moneda ?? 'PYG'} onChange={setF('moneda')}
                  options={[
                    { value: 'PYG', label: 'PYG — Guaraní paraguayo' },
                    { value: 'USD', label: 'USD — Dólar americano' },
                    { value: 'BRL', label: 'BRL — Real brasileño' },
                    { value: 'ARS', label: 'ARS — Peso argentino' },
                  ]} />
              </FormField>
              <FormField label="Zona horaria">
                <SelectFieldDark value={settingsForm.zona_horaria ?? 'America/Asuncion'} onChange={setF('zona_horaria')}
                  options={[
                    { value: 'America/Asuncion',     label: 'America/Asuncion (PY)' },
                    { value: 'America/Sao_Paulo',    label: 'America/Sao_Paulo (BR)' },
                    { value: 'America/Buenos_Aires', label: 'America/Buenos_Aires (AR)' },
                    { value: 'UTC',                  label: 'UTC' },
                  ]} />
              </FormField>
              <FormField label="Mes inicio año fiscal">
                <SelectFieldDark
                  value={String(settingsForm.ano_fiscal_inicio ?? 1)}
                  onChange={v => setSettingsForm(f => ({ ...f, ano_fiscal_inicio: Number(v) }))}
                  options={['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'].map((m, i) => ({ value: String(i + 1), label: m }))}
                />
              </FormField>
              <FormField label="Prefijo código de activo">
                <InputDark value={settingsForm.prefijo_activo ?? 'ACT'} onChange={setF('prefijo_activo')} placeholder="ACT" />
              </FormField>
            </div>
          </Card>

          <Card>
            <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--t-text-3)', marginBottom: 16 }}>
              Depreciación por defecto
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <FormField label="Vida útil por defecto (meses)">
                <InputDark type="number" value={String(settingsForm.vida_util_default_meses ?? 60)}
                  onChange={v => setSettingsForm(f => ({ ...f, vida_util_default_meses: Number(v) }))} />
              </FormField>
              <FormField label="Valor residual por defecto (%)">
                <InputDark type="number"
                  value={String(Math.round((settingsForm.valor_residual_pct ?? 0.1) * 100))}
                  onChange={v => setSettingsForm(f => ({ ...f, valor_residual_pct: Number(v) / 100 }))} />
              </FormField>
            </div>
          </Card>

          <Card>
            <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--t-text-3)', marginBottom: 16 }}>
              Logo de la organización
            </div>
            <FormField label="URL del logo" hint="PNG o SVG · se muestra en el sidebar y reportes">
              <InputDark value={settingsForm.logo_url ?? ''} onChange={setF('logo_url')} placeholder="https://..." />
            </FormField>
            {settingsForm.logo_url && (
              <div style={{ marginTop: 12, padding: 12, background: 'var(--t-bg-input)', border: '1px solid var(--t-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 64 }}>
                <img src={settingsForm.logo_url} alt="Logo preview" style={{ maxHeight: 48, maxWidth: '100%', objectFit: 'contain' }} />
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── Tab: Features ──────────────────────────────────────────────────── */}
      {tab === 'features' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {features.map(f => (
            <Card key={f.feature} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 22px' }}>
              <div>
                <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 13, color: 'var(--t-text-1)' }}>{f.label}</div>
                <div style={{ fontSize: 11, color: 'var(--t-text-5)', marginTop: 2, fontFamily: 'var(--clt-font-body)' }}>{f.feature}</div>
              </div>
              <button
                onClick={() => toggleFeature(f.feature, f.habilitado)}
                disabled={togglingFeature === f.feature}
                style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: togglingFeature === f.feature ? 0.5 : 1, transition: 'all 150ms', display: 'flex', alignItems: 'center', gap: 8, color: f.habilitado ? '#4ADE80' : 'var(--t-text-5)' }}
              >
                {f.habilitado ? <ToggleRight size={26} /> : <ToggleLeft size={26} />}
                <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 10, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                  {f.habilitado ? 'Activo' : 'Inactivo'}
                </span>
              </button>
            </Card>
          ))}
          <p style={{ fontSize: 11, color: 'var(--t-text-5)', fontFamily: 'var(--clt-font-body)', marginTop: 4, paddingLeft: 2 }}>
            Los cambios se aplican inmediatamente a todos los usuarios del tenant.
          </p>
        </div>
      )}

      {/* ── Tab: Usuarios ──────────────────────────────────────────────────── */}
      {tab === 'usuarios' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
            <KPICard label="Total usuarios" value={usuarios.length} sub="en el tenant" icon={<Users size={14} />} />
            <KPICard label="Activos" value={usuarios.filter(u => u.activo).length} sub="con acceso" icon={<Shield size={14} />} />
            <KPICard label="Admins" value={usuarios.filter(u => ['admin','admin_banco','sysadmin_clt'].includes(u.rol)).length} sub="con privilegios" icon={<Settings size={14} />} gradient />
          </div>
          <Card noPad>
            <Table columns={userCols} rows={usuarios as unknown as Record<string, unknown>[]} />
          </Card>
        </div>
      )}

      {/* ── Modal usuario ──────────────────────────────────────────────────── */}
      {showUsuarioModal && (
        <Modal title={editingUser ? 'Editar usuario' : 'Nuevo usuario'} onClose={() => setShowUsuarioModal(false)} width={480}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {!editingUser && (
              <FormField label="Email" required>
                <InputDark value={userForm.email} onChange={v => setUserForm(f => ({ ...f, email: v }))} placeholder="usuario@empresa.com" />
              </FormField>
            )}
            <FormField label="Nombre completo" required>
              <InputDark value={userForm.nombre_completo} onChange={v => setUserForm(f => ({ ...f, nombre_completo: v }))} placeholder="Nombre completo" />
            </FormField>
            <FormField label="Rol" required>
              <SelectFieldDark value={userForm.rol} onChange={v => setUserForm(f => ({ ...f, rol: v }))} options={ROL_OPTIONS} />
            </FormField>
            {!editingUser && (
              <FormField label="Contraseña inicial" required>
                <InputDark type="password" value={userForm.password} onChange={v => setUserForm(f => ({ ...f, password: v }))} placeholder="Mínimo 8 caracteres" />
              </FormField>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
            <Btn variant="ghost" small onClick={() => setShowUsuarioModal(false)}>Cancelar</Btn>
            <Btn variant="accent" small icon={<Save size={14} />} onClick={saveUser} disabled={savingUser}>
              {savingUser ? 'Guardando…' : editingUser ? 'Guardar cambios' : 'Crear usuario'}
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}
