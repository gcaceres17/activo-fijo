-- ============================================================
-- Migration 004: Tablas transaccionales
-- ============================================================

CREATE TABLE IF NOT EXISTS public.asignaciones (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id         UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    activo_id         UUID NOT NULL REFERENCES public.activos(id) ON DELETE CASCADE,
    empleado_nombre   VARCHAR(200) NOT NULL,
    empleado_cedula   VARCHAR(20),
    area              VARCHAR(100) NOT NULL,
    centro_costo_id   UUID REFERENCES public.centros_costo(id),
    fecha_asignacion  DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_baja        DATE,
    observaciones     TEXT,
    estado            VARCHAR(10) NOT NULL DEFAULT 'vigente'
                      CHECK (estado IN ('vigente','baja')),
    created_at        TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at        TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT asig_fechas_check CHECK (fecha_baja IS NULL OR fecha_baja >= fecha_asignacion)
);
-- INV-4.1: Un activo solo puede tener una asignación vigente
CREATE UNIQUE INDEX idx_asig_vigente_unique ON public.asignaciones(activo_id)
    WHERE estado = 'vigente';
CREATE INDEX idx_asignaciones_tenant ON public.asignaciones(tenant_id);
CREATE INDEX idx_asignaciones_activo ON public.asignaciones(activo_id);
CREATE INDEX idx_asignaciones_estado ON public.asignaciones(estado);
CREATE TRIGGER asignaciones_updated_at BEFORE UPDATE ON public.asignaciones
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.mantenimientos (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id            UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    activo_id            UUID NOT NULL REFERENCES public.activos(id) ON DELETE CASCADE,
    tipo                 VARCHAR(20) NOT NULL CHECK (tipo IN ('preventivo','correctivo','predictivo')),
    descripcion          TEXT NOT NULL,
    tecnico              VARCHAR(200) NOT NULL,
    proveedor            VARCHAR(200),
    fecha_inicio         DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_estimada_fin   DATE,
    fecha_fin_real       DATE,
    costo                NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (costo >= 0),
    estado               VARCHAR(20) NOT NULL DEFAULT 'programado'
                         CHECK (estado IN ('programado','en_proceso','completado','cancelado')),
    created_at           TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at           TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX idx_mnt_tenant ON public.mantenimientos(tenant_id);
CREATE INDEX idx_mnt_activo ON public.mantenimientos(activo_id);
CREATE INDEX idx_mnt_estado ON public.mantenimientos(estado);
CREATE TRIGGER mantenimientos_updated_at BEFORE UPDATE ON public.mantenimientos
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Append-only audit log
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id      UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    fecha_hora     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    usuario_email  VARCHAR(255) NOT NULL,
    accion         VARCHAR(50) NOT NULL,
    entidad        VARCHAR(50),
    entidad_id     UUID,
    detalle        TEXT NOT NULL DEFAULT '',
    ip_origen      VARCHAR(45),
    created_at     TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX idx_audit_tenant     ON public.audit_logs(tenant_id);
CREATE INDEX idx_audit_fecha      ON public.audit_logs(fecha_hora DESC);
CREATE INDEX idx_audit_usuario    ON public.audit_logs(usuario_email);
CREATE INDEX idx_audit_accion     ON public.audit_logs(accion);

CREATE TABLE IF NOT EXISTS public.dispositivos (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id        UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    nombre           VARCHAR(100) NOT NULL,
    tipo             VARCHAR(20) NOT NULL CHECK (tipo IN ('impresora','lector_qr','lector_barcode')),
    protocolo        VARCHAR(20) NOT NULL CHECK (protocolo IN ('usb','tcp_ip','bluetooth','usb_hid')),
    driver           VARCHAR(200),
    ip_address       VARCHAR(45),
    estado           VARCHAR(20) NOT NULL DEFAULT 'desconectado'
                     CHECK (estado IN ('conectado','desconectado','emparejado')),
    ultima_conexion  TIMESTAMPTZ,
    created_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX idx_dispositivos_tenant ON public.dispositivos(tenant_id);
CREATE TRIGGER dispositivos_updated_at BEFORE UPDATE ON public.dispositivos
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
