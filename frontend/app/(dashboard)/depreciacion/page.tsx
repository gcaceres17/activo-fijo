'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { PaginatedActivos, Activo, Categoria, KPIs } from '@/types'
import { Btn, Card, ColDef, FONT, MONO, KPICard, PageHeader, SelectDark, Table, fmt, fmtDate, pct } from '@/components/ui'
import { Tag, TrendingDown, BookOpen, Calendar, Download } from 'lucide-react'

export default function DepreciacionPage() {
  const [activos, setActivos] = useState<Activo[]>([])
  const [kpis, setKpis] = useState<KPIs | null>(null)
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [catFilter, setCatFilter] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.allSettled([
      api.get<PaginatedActivos>('/v1/activos?page_size=100'),
      api.get<KPIs>('/v1/activos/kpis'),
      api.get<Categoria[]>('/v1/categorias'),
    ]).then(([ar, kr, catr]) => {
      if (ar.status === 'fulfilled') setActivos(ar.value.items ?? [])
      if (kr.status === 'fulfilled') setKpis(kr.value)
      if (catr.status === 'fulfilled') setCategorias(catr.value)
    }).finally(() => setLoading(false))
  }, [])

  const filtered = catFilter ? activos.filter(a => a.categoria_id === catFilter) : activos

  const totalAdq    = filtered.reduce((s, a) => s + a.valor_adquisicion, 0)
  const totalDeprec = filtered.reduce((s, a) => s + (a.depreciacion_acumulada ?? 0), 0)
  const totalActual = filtered.reduce((s, a) => s + a.valor_libro_actual, 0)
  const cuotaAnual  = filtered.reduce((s, a) => s + a.valor_adquisicion / (a.vida_util_años ?? 5), 0)

  const cols: ColDef<Activo>[] = [
    { key: 'codigo', label: 'Código', style: { width: 100 }, render: v => <span style={{ fontFamily: MONO, fontSize: 11, color: 'var(--clt-cyan)' }}>{String(v)}</span> },
    { key: 'nombre', label: 'Activo', render: (v, r) => <div><div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 13, color: 'var(--t-text-1)' }}>{String(v)}</div><div style={{ fontSize: 10, color: 'var(--t-text-5)' }}>{String(r.categoria_id)}</div></div> },
    { key: 'fecha_compra', label: 'Alta', render: v => <span style={{ fontSize: 12, color: 'var(--t-text-3)' }}>{fmtDate(String(v ?? ''))}</span> },
    { key: 'vida_util_años', label: 'V. Útil', render: v => <span style={{ fontSize: 12, color: 'var(--t-text-3)' }}>{String(v ?? '')} años</span> },
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
        <SelectDark value={catFilter} onChange={setCatFilter} style={{ minWidth: 160 }}
          options={[{ value: '', label: 'Todas las categorías' }, ...categorias.map(c => ({ value: c.id, label: c.nombre }))]} />
        <Btn icon={<Download size={14} />} variant="ghost" small>Exportar informe</Btn>
      </PageHeader>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        <KPICard label="Valor original" value={`₲${new Intl.NumberFormat('es-PY').format(Math.round(totalAdq / 1_000_000))}M`} icon={<Tag size={14} />} sub="costo de adquisición" />
        <KPICard label="Deprec. acumulada" value={`₲${new Intl.NumberFormat('es-PY').format(Math.round(totalDeprec / 1_000_000))}M`} icon={<TrendingDown size={14} />} sub={`${pct(totalDeprec, totalAdq)}% del total`} />
        <KPICard label="Valor en libros" value={`₲${new Intl.NumberFormat('es-PY').format(Math.round(totalActual / 1_000_000))}M`} icon={<BookOpen size={14} />} sub="valor actual neto" gradient />
        <KPICard label="Cuota anual" value={`₲${new Intl.NumberFormat('es-PY').format(Math.round(cuotaAnual / 1_000_000))}M`} icon={<Calendar size={14} />} sub="gasto del ejercicio" />
      </div>

      <Card noPad>
        <Table columns={cols} rows={filtered as unknown as Record<string, unknown>[]} />
      </Card>
    </div>
  )
}
