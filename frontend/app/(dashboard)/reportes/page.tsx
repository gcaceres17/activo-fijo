'use client'
import { useState } from 'react'
import { Btn, Card, FONT, PageHeader } from '@/components/ui'
import { Package, TrendingDown, Users, Wrench, Archive, BookOpen, FileText, Grid } from 'lucide-react'
import { ReactNode } from 'react'

interface ReporteConfig {
  id: string; icon: ReactNode; title: string; desc: string; color: string; badge?: string
}

const REPORTES: ReporteConfig[] = [
  { id: 'inventario', icon: <Package size={18} />, title: 'Inventario completo', desc: 'Lista completa de activos con todos sus campos. Exportable a Excel y PDF.', color: 'var(--clt-violet)', badge: 'Popular' },
  { id: 'depreciacion', icon: <TrendingDown size={18} />, title: 'Informe de depreciación', desc: 'Cálculo de depreciación acumulada y proyección por período contable.', color: 'var(--clt-blue)' },
  { id: 'asignaciones', icon: <Users size={18} />, title: 'Activos por empleado / área', desc: 'Relación de activos asignados por empleado, área y centro de costo.', color: 'var(--clt-cyan)' },
  { id: 'mantenimiento', icon: <Wrench size={18} />, title: 'Historial de mantenimiento', desc: 'Órdenes de mantenimiento por período, tipo y costo total.', color: '#FBB040' },
  { id: 'bajas', icon: <Archive size={18} />, title: 'Activos dados de baja', desc: 'Listado de activos retirados con fecha y motivo de baja.', color: '#F87171' },
  { id: 'contable', icon: <BookOpen size={18} />, title: 'Asientos contables', desc: 'Altas, bajas y depreciación integradas con el módulo contable.', color: 'var(--t-text-3)' },
]

export default function ReportesPage() {
  const [generated, setGenerated] = useState<string | null>(null)

  return (
    <div>
      <PageHeader title="Reportes y Exportación" sub="Generá informes del módulo de activos fijos" />

      {generated && (
        <div style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.25)', padding: '12px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#4ADE80" strokeWidth={2} style={{ flexShrink: 0 }}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22,4 12,14.01 9,11.01" /></svg>
          <span style={{ fontFamily: 'var(--clt-font-body)', fontSize: 13, color: 'var(--t-text-3)', flex: 1 }}>
            Reporte <strong style={{ color: '#4ADE80' }}>"{generated}"</strong> generado. Descarga lista.
          </span>
          <button onClick={() => setGenerated(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t-text-5)', fontSize: 18 }}>×</button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
        {REPORTES.map(r => (
          <div key={r.id}
            style={{ background: 'var(--t-bg-card)', border: '1px solid var(--t-border)', backdropFilter: 'blur(8px)', padding: 22, cursor: 'pointer', transition: 'border-color 150ms,transform 150ms' }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = r.color; el.style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = 'var(--t-border)'; el.style.transform = '' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div style={{ width: 40, height: 40, background: `${r.color}20`, border: `1px solid ${r.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: r.color }}>
                {r.icon}
              </div>
              {r.badge && (
                <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 8px', background: 'rgba(104,116,181,0.2)', color: 'var(--clt-cyan)', border: '1px solid rgba(104,116,181,0.3)' }}>
                  {r.badge}
                </span>
              )}
            </div>
            <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 14, color: 'var(--t-text-1)', marginBottom: 6 }}>{r.title}</div>
            <div style={{ fontSize: 12, color: 'var(--t-text-4)', fontFamily: 'var(--clt-font-body)', marginBottom: 16, lineHeight: 1.5 }}>{r.desc}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn variant="ghost" small icon={<FileText size={12} />} onClick={() => setGenerated(r.title)}>PDF</Btn>
              <Btn variant="ghost" small icon={<Grid size={12} />} onClick={() => setGenerated(r.title)}>Excel</Btn>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
