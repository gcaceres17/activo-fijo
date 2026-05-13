'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { PaginatedActivos, Activo, Grupo, KPIs } from '@/types'
import { Btn, Card, ColDef, FONT, MONO, KPICard, PageHeader, SelectDark, Table, fmt, fmtDate, pct } from '@/components/ui'
import { Tag, TrendingDown, BookOpen, Calendar, Download } from 'lucide-react'

export default function DepreciacionPage() {
  const [activos, setActivos] = useState<Activo[]>([])
  const [kpis, setKpis] = useState<KPIs | null>(null)
  const [grupos, setGrupos] = useState<Grupo[]>([])
  const [grupoFilter, setGrupoFilter] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.allSettled([
      api.get<PaginatedActivos>('/v1/activos?page_size=100'),
      api.get<KPIs>('/v1/activos/kpis'),
      api.get<Grupo[]>('/v1/taxonomia/grupos'),
    ]).then(([ar, kr, gr]) => {
      if (ar.status === 'fulfilled') setActivos(ar.value.items ?? [])
      if (kr.status === 'fulfilled') setKpis(kr.value)
      if (gr.status === 'fulfilled') setGrupos(gr.value)
    }).finally(() => setLoading(false))
  }, [])

  const filtered = grupoFilter ? activos.filter(a => a.grupo_id === grupoFilter) : activos

  const totalAdq    = filtered.reduce((s, a) => s + a.valor_adquisicion, 0)
  const totalDeprec = filtered.reduce((s, a) => s + (a.depreciacion_acumulada ?? 0), 0)
  const totalActual = filtered.reduce((s, a) => s + a.valor_libro_actual, 0)
  const cuotaMensual = filtered.reduce((s, a) => s + a.depreciacion_mensual, 0)

  const cols: ColDef<Activo>[] = [
    { key: 'codigo', label: 'Código', style: { width: 100 }, render: v => <span style={{ fontFamily: MONO, fontSize: 11, color: 'var(--clt-cyan)' }}>{String(v)}</span> },
    { key: 'nombre', label: 'Activo', render: (v, r) => <div><div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 13, color: 'var(--t-text-1)' }}>{String(v)}</div><div style={{ fontSize: 10, color: 'var(--t-text-5)' }}>{grupos.find(g => g.id === String(r.grupo_id))?.nombre ?? '—'}</div></div> },
    { key: 'fecha_compra', label: 'Alta', render: v => <span style={{ fontSize: 12, color: 'var(--t-text-3)' }}>{fmtDate(String(v ?? ''))}</span> },
    { key: 'vida_util_meses', label: 'V. Útil', render: v => <span style={{ fontSize: 12, color: 'var(--t-text-3)' }}>{String(v ?? '')} meses</span> },
    { key: 'valor_adquisicion', label: 'Valor Orig.', render: v => <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 12, color: 'var(--t-text-3)' }}>{fmt(Number(v))}</span> },
    { key: 'depreciacion_acumulada', label: 'Deprec. Acum.', render: v => <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 12, color: '#F87171' }}>{fmt(Number(v ?? 0))}</span> },
    { key: 'valor_libro_actual', label: 'Valor Actual', render: v => <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 12, color: 'var(--clt-cyan)' }}>{fmt(Number(v))}</span> },
    {
      key: 'porcentaje_depreciado', label: '% Deprec.',
      render: (_v, r) => {
        const p = pct((r.depreciacion_acumulada as number) ?? 0, r.valor_adquisicion as number)
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 90 }}>
            <div style={{ flex: 1, height: 3, background: 'var(--t-border2)', borderRadius: 2 }}>
              <div style={{ height: '100%', width: `${p}%`, background: p > 80 ? '#F87171' : 'var(--clt-violet)', borderRadius: 2 }} />
            </div>
            <span style={{ fontSize: 10, fontFamily: FONT, fontWeight: 700, color: 'var(--t-text-4)', whiteSpace: 'nowrap' }}>{p}%</span>
          </div>
        )
      },
    },
  ]

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 256 }}>
      <div style={{ width: 28, height: 28, border: '2px solid #6874B5', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div>
      <PageHeader title="Depreciación de Activos" sub="Cálculo y seguimiento de la depreciación del inventario">
        <SelectDark value={grupoFilter} onChange={setGrupoFilter} style={{ minWidth: 160 }}
          options={[{ value: '', label: 'Todos los grupos' }, ...grupos.map(g => ({ value: g.id, label: `${g.codigo} — ${g.nombre}` }))]} />
        <Btn icon={<Download size={14} />} variant="ghost" small>Exportar informe</Btn>
      </PageHeader>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        <KPICard label="Valor original" value={`₲${new Intl.NumberFormat('es-PY').format(Math.round(totalAdq / 1_000_000))}M`} icon={<Tag size={14} />} sub="costo de adquisición" />
        <KPICard label="Deprec. acumulada" value={`₲${new Intl.NumberFormat('es-PY').format(Math.round(totalDeprec / 1_000_000))}M`} icon={<TrendingDown size={14} />} sub={`${pct(totalDeprec, totalAdq)}% del total`} />
        <KPICard label="Valor en libros" value={`₲${new Intl.NumberFormat('es-PY').format(Math.round(totalActual / 1_000_000))}M`} icon={<BookOpen size={14} />} sub="valor actual neto" gradient />
        <KPICard label="Cuota mensual" value={`₲${new Intl.NumberFormat('es-PY').format(Math.round(cuotaMensual / 1_000_000))}M`} icon={<Calendar size={14} />} sub="gasto del período" />
      </div>

      <Card noPad>
        <Table columns={cols} rows={filtered as unknown as Record<string, unknown>[]} />
      </Card>
    </div>
  )
}
