// ── Multi-tenant ──────────────────────────────────────────────────────────────

export interface TenantSettings {
  tenant_id: string
  logo_url: string | null
  moneda: string
  zona_horaria: string
  ano_fiscal_inicio: number
  vida_util_default_meses: number
  valor_residual_pct: number
  prefijo_activo: string
}

export interface TenantFeature {
  feature: string
  label: string
  habilitado: boolean
}

export interface Usuario {
  id: string
  email: string
  nombre_completo: string
  rol: 'sysadmin_clt' | 'admin_banco' | 'admin' | 'operador' | 'auditor' | 'relevador'
  activo: boolean
}

// ── Taxonomía ─────────────────────────────────────────────────────────────────

export interface Grupo {
  id: string; codigo: string; nombre: string;
}

export interface Clase {
  id: string; grupo_id: string; codigo: string; nombre: string;
  tasa_depreciacion?: number;
}

export interface Sucursal {
  id: string; codigo: string; nombre: string; nivel: number; parent_id?: string;
}

export interface RubroContable {
  id: string; codigo: string; nombre: string; origen: 'manual'|'finansys'; activo: boolean;
}

export interface Activo {
  id: string; codigo: string; nombre: string;
  grupo_id: string; clase_id: string; sucursal_id: string;
  rubro_contable_id?: string;
  marca?: string; modelo?: string; numero_serie?: string; fecha_compra?: string;
  valor_adquisicion: number; vida_util_meses: number; vida_util_años: number;
  valor_residual: number;
  depreciacion_mensual: number; depreciacion_acumulada: number;
  valor_libro_actual: number; porcentaje_depreciado: number;
  estado: 'activo'|'en_mantenimiento'|'dado_de_baja';
  foto_url?: string; qr_url?: string;
  created_at: string; updated_at: string;
}

export interface PaginatedActivos {
  items: Activo[]; total: number; page: number; page_size: number; total_pages: number;
}

export interface KPIs {
  total_activos: number; en_mantenimiento: number; dados_de_baja: number;
  valor_total_cartera: number; depreciacion_acumulada_total: number; valor_libro_total: number;
  por_grupo: { grupo_id: string; nombre: string; total: number; valor: number }[];
}

export interface Asignacion {
  id: string; activo_id: string;
  responsable_nombre: string; responsable_codigo?: string;
  sucursal_id: string;
  fecha_inicio: string; fecha_fin?: string;
  vigente: boolean; created_at: string;
}

export interface Mantenimiento {
  id: string; activo_id: string; tipo: string; descripcion: string; tecnico: string;
  proveedor?: string; fecha_inicio: string; fecha_estimada_fin?: string; fecha_fin_real?: string;
  costo: number; estado: string; created_at: string;
}

export interface AuditLog {
  id: string; created_at: string; usuario_id: string; accion: string;
  entidad?: string; entidad_id?: string;
  payload_before: Record<string, unknown>; payload_after: Record<string, unknown>;
  ip_address?: string;
}

export interface Dispositivo {
  id: string; nombre: string; tipo: string; modelo?: string;
  ip_address?: string; estado_conexion: string; ultimo_ping?: string;
}
