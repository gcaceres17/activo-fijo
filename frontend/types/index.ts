export interface Activo {
  id: string; codigo: string; nombre: string; categoria_id: string;
  marca?: string; modelo?: string; numero_serie?: string; fecha_compra?: string;
  valor_adquisicion: number; vida_util_años: number; valor_residual: number;
  depreciacion_anual: number; depreciacion_acumulada: number; valor_libro_actual: number;
  porcentaje_depreciado: number; estado: 'activo'|'en_mantenimiento'|'dado_de_baja'|'reservado';
  area?: string; centro_costo_id?: string; responsable?: string; ubicacion?: string;
  foto_url?: string; documentos: string[]; created_at: string; updated_at: string;
}

export interface PaginatedActivos {
  items: Activo[]; total: number; page: number; page_size: number; total_pages: number;
}

export interface KPIs {
  total_activos: number; en_mantenimiento: number; dados_de_baja: number; reservados: number;
  valor_total_cartera: number; depreciacion_acumulada_total: number; valor_libro_total: number;
  por_categoria: { categoria_id: string; nombre: string; color_hex: string; icono: string; total: number; valor: number }[];
}

export interface Categoria {
  id: string; nombre: string; icono: string; color_hex: string; vida_util_default_años: number;
}

export interface CentroCosto { id: string; codigo: string; nombre: string; }

export interface Asignacion {
  id: string; activo_id: string; empleado_nombre: string; empleado_cedula?: string;
  area: string; centro_costo_id?: string; fecha_asignacion: string; fecha_baja?: string;
  observaciones?: string; estado: 'vigente'|'baja'; created_at: string;
}

export interface Mantenimiento {
  id: string; activo_id: string; tipo: string; descripcion: string; tecnico: string;
  proveedor?: string; fecha_inicio: string; fecha_estimada_fin?: string; fecha_fin_real?: string;
  costo: number; estado: string; created_at: string;
}

export interface AuditLog {
  id: string; fecha_hora: string; usuario_email: string; accion: string;
  entidad?: string; entidad_id?: string; detalle: string; ip_origen?: string;
}

export interface Dispositivo {
  id: string; nombre: string; tipo: string; protocolo: string;
  driver?: string; ip_address?: string; estado: string; ultima_conexion?: string;
}
