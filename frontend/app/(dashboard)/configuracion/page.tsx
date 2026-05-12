'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { Dispositivo } from '@/types'
import { Badge, Btn, Card, ColDef, FONT, MONO, FormField, InputDark, KPICard, PageHeader, SectionTitle, SelectFieldDark, Table } from '@/components/ui'
import { Settings, BookOpen, Zap, HardDrive, Users, Save, Wifi, WifiOff, RefreshCw, CheckCircle, XCircle, Info, Printer, PlusCircle } from 'lucide-react'

type Tab = 'general' | 'contable' | 'integracion' | 'dispositivos' | 'usuarios'

const TABS: { id: Tab; icon: typeof Settings; label: string }[] = [
  { id: 'general', icon: Settings, label: 'General' },
  { id: 'contable', icon: BookOpen, label: 'Contable' },
  { id: 'integracion', icon: Zap, label: 'Integración' },
  { id: 'dispositivos', icon: HardDrive, label: 'Dispositivos' },
  { id: 'usuarios', icon: Users, label: 'Usuarios' },
]

const DEV_TIPO_COLOR: Record<string, string> = {
  'Impresora': 'var(--clt-violet)',
  'Lector QR/Barcode': 'var(--clt-cyan)',
}

export default function ConfiguracionPage() {
  const [tab, setTab] = useState<Tab>('general')
  const [saved, setSaved] = useState(false)
  const [testConn, setTestConn] = useState<'ok' | 'error' | null>(null)
  const [testing, setTesting] = useState(false)
  const [dispositivos, setDispositivos] = useState<Dispositivo[]>([])

  useEffect(() => {
    api.get<Dispositivo[]>('/v1/dispositivos').then(setDispositivos).catch(() => {})
  }, [])

  function handleTest() {
    setTestConn(null); setTesting(true)
    setTimeout(() => { setTestConn('ok'); setTesting(false) }, 1200)
  }

  return (
    <div>
      <PageHeader title="Configuración" sub="Parámetros del sistema, integraciones y dispositivos">
        {tab !== 'dispositivos' && (
          <Btn icon={<Save size={14} />} variant="accent" small onClick={() => setSaved(true)}>Guardar cambios</Btn>
        )}
      </PageHeader>

      {saved && (
        <div style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.25)', padding: '12px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <CheckCircle size={16} style={{ color: '#4ADE80', flexShrink: 0 }} />
          <span style={{ fontFamily: 'var(--clt-font-body)', fontSize: 13, color: 'var(--t-text-3)', flex: 1 }}>Configuración guardada correctamente.</span>
          <button onClick={() => setSaved(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t-text-5)', fontSize: 18 }}>×</button>
        </div>
      )}

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        {TABS.map(t => {
          const Icon = t.icon
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 7, fontFamily: FONT, fontWeight: 700, fontSize: 11, letterSpacing: '0.07em', textTransform: 'uppercase', color: tab === t.id ? 'var(--clt-cyan)' : 'rgba(255,255,255,0.3)', borderBottom: tab === t.id ? '2px solid var(--clt-cyan)' : '2px solid transparent', marginBottom: -1, transition: 'color 120ms', whiteSpace: 'nowrap' }}>
              <Icon size={13} />
              {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'general' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Card>
            <SectionTitle>Empresa</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <FormField label="Nombre de la empresa"><InputDark value="CLT S.A." onChange={() => {}} /></FormField>
              <FormField label="RUC"><InputDark value="80120453-2" onChange={() => {}} /></FormField>
              <FormField label="Moneda base">
                <SelectFieldDark value="PYG" onChange={() => {}} options={[{ value: 'PYG', label: 'Guaraní (₲)' }, { value: 'USD', label: 'Dólar (US$)' }]} />
              </FormField>
              <FormField label="Ejercicio fiscal">
                <SelectFieldDark value="2025" onChange={() => {}} options={['2023', '2024', '2025', '2026'].map(y => ({ value: y, label: y }))} />
              </FormField>
            </div>
          </Card>
          <Card>
            <SectionTitle>Depreciación por defecto</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <FormField label="Método">
                <SelectFieldDark value="lineal" onChange={() => {}} options={[{ value: 'lineal', label: 'Lineal' }, { value: 'acelerado', label: 'Acelerado' }]} />
              </FormField>
              <FormField label="Valor residual">
                <SelectFieldDark value="0" onChange={() => {}} options={[{ value: '0', label: '0%' }, { value: '5', label: '5%' }, { value: '10', label: '10%' }]} />
              </FormField>
              <FormField label="Frecuencia de cálculo">
                <SelectFieldDark value="mensual" onChange={() => {}} options={[{ value: 'mensual', label: 'Mensual' }, { value: 'trimestral', label: 'Trimestral' }, { value: 'anual', label: 'Anual' }]} />
              </FormField>
            </div>
          </Card>
        </div>
      )}

      {tab === 'contable' && (
        <Card>
          <SectionTitle>Plan de cuentas</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <FormField label="Cuenta — Alta de activo"><InputDark value="1.2.1.001 — Activos Fijos" onChange={() => {}} /></FormField>
            <FormField label="Cuenta — Deprec. acumulada"><InputDark value="1.2.9.001 — Deprec. Acumulada" onChange={() => {}} /></FormField>
            <FormField label="Cuenta — Gasto depreciación"><InputDark value="5.1.3.002 — Gasto Deprec. AF" onChange={() => {}} /></FormField>
            <FormField label="Generar asiento automático">
              <SelectFieldDark value="ambos" onChange={() => {}} options={[{ value: 'alta', label: 'Alta y baja' }, { value: 'deprec', label: 'Depreciación' }, { value: 'ambos', label: 'Ambos' }]} />
            </FormField>
          </div>
        </Card>
      )}

      {tab === 'integracion' && (
        <Card>
          <SectionTitle>Core bancario — Holding Banco Continental</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <FormField label="Endpoint API" style={{ gridColumn: '1/-1' }}>
              <InputDark value="https://api.continental.com.py/activos/v1" onChange={() => {}} />
            </FormField>
            <FormField label="Token de autenticación">
              <InputDark type="password" value="••••••••••••••••" onChange={() => {}} />
            </FormField>
            <FormField label="Entidad del holding">
              <SelectFieldDark value="clt" onChange={() => {}} options={[{ value: 'clt', label: 'CLT S.A.' }, { value: 'bc', label: 'Banco Continental S.A.' }, { value: 'financiera', label: 'Financiera S.A.' }, { value: 'seguros', label: 'Continental Seguros' }]} />
            </FormField>
          </div>
          {testConn && (
            <div style={{ background: testConn === 'ok' ? 'rgba(74,222,128,0.06)' : 'rgba(248,113,113,0.06)', border: `1px solid ${testConn === 'ok' ? 'rgba(74,222,128,0.25)' : 'rgba(248,113,113,0.25)'}`, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
              {testConn === 'ok' ? <CheckCircle size={15} style={{ color: '#4ADE80' }} /> : <XCircle size={15} style={{ color: '#F87171' }} />}
              <span style={{ fontSize: 12, color: testConn === 'ok' ? '#4ADE80' : '#F87171', fontFamily: FONT, fontWeight: 700 }}>
                {testConn === 'ok' ? 'Conexión exitosa — API respondió en 124ms' : 'Error de conexión — Verificá el token y el endpoint'}
              </span>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="ghost" small icon={<Wifi size={14} />} disabled={testing} onClick={handleTest}>{testing ? 'Probando…' : 'Probar conexión'}</Btn>
            <Btn variant="ghost" small icon={<RefreshCw size={14} />}>Sincronizar ahora</Btn>
          </div>
        </Card>
      )}

      {tab === 'dispositivos' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12, marginBottom: 20 }}>
            <KPICard label="Dispositivos activos" value={dispositivos.filter(d => d.estado === 'Conectado' || d.estado === 'Emparejado').length} icon={<HardDrive size={14} />} sub="conectados ahora" />
            <KPICard label="Sin conexión" value={dispositivos.filter(d => d.estado === 'Desconectado').length} icon={<WifiOff size={14} />} sub="requieren atención" gradient />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12, marginBottom: 16 }}>
            {dispositivos.map(d => {
              const color = DEV_TIPO_COLOR[d.tipo] ?? 'rgba(255,255,255,0.4)'
              const connected = d.estado === 'Conectado' || d.estado === 'Emparejado'
              return (
                <Card key={d.id} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <div style={{ width: 46, height: 46, background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color }}>
                    <Printer size={20} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <div>
                        <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 14, color: 'var(--t-text-1)' }}>{d.nombre}</div>
                        <div style={{ fontSize: 10, color: 'var(--t-text-5)', fontFamily: FONT, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 2 }}>{d.tipo} · {d.protocolo}</div>
                      </div>
                      <Badge estado={d.estado} />
                    </div>
                    {d.driver && <div style={{ fontSize: 11, color: 'var(--t-text-5)', fontFamily: 'var(--clt-font-body)', marginBottom: 6 }}>Driver: <span style={{ color: 'var(--t-text-3)', fontFamily: MONO }}>{d.driver}</span></div>}
                    {d.ultima_conexion && <div style={{ fontSize: 10, color: 'var(--t-text-6)', marginBottom: 12 }}>Último acceso: {d.ultima_conexion}</div>}
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Btn variant={connected ? 'success' : 'ghost'} small icon={connected ? <CheckCircle size={12} /> : <Zap size={12} />}>{connected ? 'Conectado' : 'Reconectar'}</Btn>
                      <Btn variant="ghost" small icon={<Settings size={12} />}>Config.</Btn>
                      <Btn variant="ghost" small icon={<Printer size={12} />}>Test print</Btn>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>

          <div style={{ background: 'var(--t-bg-card)', border: '2px dashed rgba(255,255,255,0.1)', padding: '28px 20px', cursor: 'pointer', textAlign: 'center', transition: 'border-color 150ms' }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(104,116,181,0.4)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.1)' }}>
            <PlusCircle size={24} style={{ color: 'var(--t-text-6)', marginBottom: 8 }} />
            <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 12, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--t-text-6)' }}>Agregar dispositivo</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.15)', fontFamily: 'var(--clt-font-body)', marginTop: 4 }}>Impresoras de etiquetas, lectores QR/Barcode, escáneres</div>
          </div>

          <div style={{ marginTop: 20, background: 'rgba(104,116,181,0.06)', border: '1px solid rgba(104,116,181,0.2)', padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Info size={15} style={{ color: 'var(--clt-cyan)' }} />
              <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, color: 'var(--clt-cyan)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Jornadas de inventario</span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--t-text-4)', margin: 0, lineHeight: 1.6 }}>Durante las jornadas de inventario, conectá los lectores QR/Barcode y las impresoras de etiquetas. El sistema detectará automáticamente los dispositivos HID y los lectores Bluetooth emparejados.</p>
          </div>
        </div>
      )}

      {tab === 'usuarios' && (
        <Card noPad>
          <Table
            columns={[
              { key: 'usuario', label: 'Usuario', render: v => <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 12, color: 'var(--clt-cyan)' }}>{String(v)}</span> },
              { key: 'nombre', label: 'Nombre', render: v => <span style={{ fontSize: 13, color: 'var(--t-text-2)' }}>{String(v)}</span> },
              { key: 'rol', label: 'Rol', render: v => <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 10, color: 'var(--clt-violet)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{String(v)}</span> },
              { key: 'ultimo', label: 'Último acceso', render: v => <span style={{ fontSize: 11, color: 'var(--t-text-5)' }}>{String(v)}</span> },
              { key: 'estado', label: 'Estado', render: v => <Badge estado={String(v)} /> },
              { key: 'usuario', label: '', render: () => <Btn variant="ghost" small>Editar</Btn> },
            ]}
            rows={[
              { usuario: 'admin@clt.com.py', nombre: 'Administrador', rol: 'Administrador', estado: 'Activo', ultimo: 'Hoy 09:14' },
              { usuario: 'contabilidad@clt.com.py', nombre: 'María Giménez', rol: 'Contabilidad', estado: 'Activo', ultimo: 'Ayer 16:30' },
              { usuario: 'rrhh@clt.com.py', nombre: 'Pedro Gómez', rol: 'RRHH (lectura)', estado: 'Activo', ultimo: 'Hace 3 días' },
              { usuario: 'auditoria@continental.com.py', nombre: 'Auditor Externo', rol: 'Solo consulta', estado: 'Inactivo', ultimo: 'Hace 30 días' },
            ]}
          />
          <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <Btn icon={<Users size={14} />} variant="ghost" small>Agregar usuario</Btn>
          </div>
        </Card>
      )}
    </div>
  )
}
