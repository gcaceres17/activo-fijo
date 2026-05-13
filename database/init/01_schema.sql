-- ============================================================
-- Init 01: Schema completo (migrations 001-006)
-- Se ejecuta automáticamente al levantar el contenedor PostgreSQL
-- ============================================================

-- === 001: Funciones utilitarias ===
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- === 002: Tablas base (tenants, usuarios) ===

CREATE TABLE IF NOT EXISTS public.tenants (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre      VARCHAR(200) NOT NULL,
    ruc         VARCHAR(20) UNIQUE,
    activo      BOOLEAN DEFAULT TRUE NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE TRIGGER tenants_updated_at BEFORE UPDATE ON public.tenants
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.usuarios (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id        UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    email            VARCHAR(255) NOT NULL,
    password_hash    TEXT NOT NULL,
    nombre_completo  VARCHAR(200) NOT NULL,
    rol              VARCHAR(20) NOT NULL DEFAULT 'operador'
                     CHECK (rol IN ('sysadmin_clt','admin_banco','operador','auditor','relevador','admin')),
    activo           BOOLEAN DEFAULT TRUE NOT NULL,
    ad_subject       VARCHAR(200),
    ultimo_login     TIMESTAMPTZ,
    deleted_at       TIMESTAMPTZ,
    created_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE (tenant_id, email)
);
CREATE INDEX idx_usuarios_tenant ON public.usuarios(tenant_id);
CREATE INDEX idx_usuarios_email  ON public.usuarios(email);
CREATE TRIGGER usuarios_updated_at BEFORE UPDATE ON public.usuarios
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Tablas de taxonomía (reemplaza categorias)
CREATE TABLE IF NOT EXISTS public.grupos (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    codigo      VARCHAR(10) NOT NULL,
    nombre      VARCHAR(100) NOT NULL,
    deleted_at  TIMESTAMPTZ,
    UNIQUE (tenant_id, codigo)
);
CREATE INDEX idx_grupos_tenant ON public.grupos(tenant_id);

CREATE TABLE IF NOT EXISTS public.clases (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    grupo_id            UUID NOT NULL REFERENCES public.grupos(id) ON DELETE CASCADE,
    codigo              VARCHAR(20) NOT NULL,
    nombre              VARCHAR(100) NOT NULL,
    tasa_depreciacion   NUMERIC(5,4) CHECK (tasa_depreciacion BETWEEN 0 AND 1),
    deleted_at          TIMESTAMPTZ,
    UNIQUE (tenant_id, codigo)
);
CREATE INDEX idx_clases_tenant ON public.clases(tenant_id);
CREATE INDEX idx_clases_grupo  ON public.clases(grupo_id);

CREATE TABLE IF NOT EXISTS public.sucursales (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    codigo      VARCHAR(20) NOT NULL,
    nombre      VARCHAR(100) NOT NULL,
    nivel       SMALLINT NOT NULL DEFAULT 1 CHECK (nivel BETWEEN 1 AND 3),
    parent_id   UUID REFERENCES public.sucursales(id),
    deleted_at  TIMESTAMPTZ,
    UNIQUE (tenant_id, codigo)
);
CREATE INDEX idx_sucursales_tenant ON public.sucursales(tenant_id);

CREATE TABLE IF NOT EXISTS public.rubros_contables (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id    UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    codigo       VARCHAR(30) NOT NULL,
    nombre       VARCHAR(150) NOT NULL,
    origen       VARCHAR(10) NOT NULL DEFAULT 'manual' CHECK (origen IN ('manual','finansys')),
    finansys_id  VARCHAR(50),
    activo       BOOLEAN NOT NULL DEFAULT TRUE,
    deleted_at   TIMESTAMPTZ,
    UNIQUE (tenant_id, codigo)
);
CREATE INDEX idx_rubros_tenant ON public.rubros_contables(tenant_id);

-- === 003: Tabla activos ===

CREATE TABLE IF NOT EXISTS public.activos (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id            UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    codigo               VARCHAR(20) NOT NULL,
    nombre               VARCHAR(300) NOT NULL,
    grupo_id             UUID REFERENCES public.grupos(id),
    clase_id             UUID REFERENCES public.clases(id),
    sucursal_id          UUID REFERENCES public.sucursales(id),
    rubro_contable_id    UUID REFERENCES public.rubros_contables(id),
    marca                VARCHAR(100),
    modelo               VARCHAR(100),
    numero_serie         VARCHAR(150),
    fecha_compra         DATE,
    valor_adquisicion    NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (valor_adquisicion > 0),
    vida_util_meses      INTEGER NOT NULL DEFAULT 60 CHECK (vida_util_meses >= 12),
    valor_residual       NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (valor_residual >= 0),
    estado               VARCHAR(20) NOT NULL DEFAULT 'activo'
                         CHECK (estado IN ('activo','en_mantenimiento','dado_de_baja')),
    foto_url             TEXT,
    qr_url               TEXT,
    created_at           TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at           TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at           TIMESTAMPTZ,
    UNIQUE (tenant_id, codigo),
    CONSTRAINT activos_residual_check CHECK (valor_residual <= valor_adquisicion)
);

CREATE INDEX idx_activos_tenant   ON public.activos(tenant_id);
CREATE INDEX idx_activos_grupo    ON public.activos(grupo_id);
CREATE INDEX idx_activos_clase    ON public.activos(clase_id);
CREATE INDEX idx_activos_sucursal ON public.activos(sucursal_id);
CREATE INDEX idx_activos_estado   ON public.activos(estado);
CREATE INDEX idx_activos_deleted  ON public.activos(deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER activos_updated_at BEFORE UPDATE ON public.activos
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.activos_sequence (
    tenant_id   UUID PRIMARY KEY REFERENCES public.tenants(id),
    last_value  INTEGER NOT NULL DEFAULT 0
);

CREATE OR REPLACE FUNCTION public.next_activo_codigo(p_tenant_id UUID)
RETURNS VARCHAR AS $$
DECLARE
    next_val INTEGER;
BEGIN
    INSERT INTO public.activos_sequence (tenant_id, last_value)
    VALUES (p_tenant_id, 1)
    ON CONFLICT (tenant_id) DO UPDATE
    SET last_value = public.activos_sequence.last_value + 1
    RETURNING last_value INTO next_val;
    RETURN 'ACT-' || LPAD(next_val::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- === 004: Tablas transaccionales ===

CREATE TABLE IF NOT EXISTS public.asignaciones (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    activo_id           UUID NOT NULL REFERENCES public.activos(id) ON DELETE CASCADE,
    responsable_nombre  VARCHAR(200) NOT NULL,
    responsable_codigo  VARCHAR(30),
    sucursal_id         UUID REFERENCES public.sucursales(id),
    fecha_inicio        DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_fin           DATE,
    vigente             BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT asig_fechas_check CHECK (fecha_fin IS NULL OR fecha_fin >= fecha_inicio)
);
CREATE UNIQUE INDEX idx_asig_vigente ON public.asignaciones(activo_id) WHERE vigente = TRUE;
CREATE INDEX idx_asignaciones_tenant   ON public.asignaciones(tenant_id);
CREATE INDEX idx_asignaciones_activo   ON public.asignaciones(activo_id);
CREATE INDEX idx_asignaciones_sucursal ON public.asignaciones(sucursal_id);

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

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    usuario_id      UUID,
    accion          VARCHAR(50) NOT NULL,
    entidad         VARCHAR(50),
    entidad_id      UUID,
    payload_before  JSONB NOT NULL DEFAULT '{}',
    payload_after   JSONB NOT NULL DEFAULT '{}',
    ip_address      VARCHAR(45),
    created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX idx_audit_tenant    ON public.audit_logs(tenant_id);
CREATE INDEX idx_audit_usuario   ON public.audit_logs(usuario_id);
CREATE INDEX idx_audit_fecha     ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_accion    ON public.audit_logs(accion);

CREATE TABLE IF NOT EXISTS public.dispositivos (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id        UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    nombre           VARCHAR(100) NOT NULL,
    tipo             VARCHAR(20) NOT NULL
                     CHECK (tipo IN ('impresora_etiquetas','movil_relevador')),
    modelo           VARCHAR(100),
    ip_address       VARCHAR(45),
    estado_conexion  VARCHAR(15) NOT NULL DEFAULT 'desconocido'
                     CHECK (estado_conexion IN ('online','offline','desconocido')),
    ultimo_ping      TIMESTAMPTZ,
    config           JSONB NOT NULL DEFAULT '{}',
    deleted_at       TIMESTAMPTZ,
    created_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX idx_dispositivos_tenant ON public.dispositivos(tenant_id);
CREATE TRIGGER dispositivos_updated_at BEFORE UPDATE ON public.dispositivos
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- === 005: Vista KPIs (versión mensual) ===

CREATE OR REPLACE VIEW public.v_activos_kpis AS
SELECT
    tenant_id,
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND estado != 'dado_de_baja') AS total_activos,
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND estado = 'en_mantenimiento') AS en_mantenimiento,
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND estado = 'dado_de_baja')     AS dados_de_baja,
    COALESCE(SUM(valor_adquisicion) FILTER (WHERE deleted_at IS NULL AND estado != 'dado_de_baja'), 0)
        AS valor_total_cartera,
    COALESCE(SUM(
        CASE
          WHEN fecha_compra IS NOT NULL AND vida_util_meses > 0
          THEN LEAST(
            ((valor_adquisicion - valor_residual) / vida_util_meses)
            * LEAST(
                (EXTRACT(YEAR FROM AGE(CURRENT_DATE, fecha_compra)) * 12
                 + EXTRACT(MONTH FROM AGE(CURRENT_DATE, fecha_compra))),
                vida_util_meses
              ),
            valor_adquisicion - valor_residual
          )
          ELSE 0
        END
    ) FILTER (WHERE deleted_at IS NULL AND estado != 'dado_de_baja'), 0)
        AS depreciacion_acumulada_total
FROM public.activos
WHERE deleted_at IS NULL
GROUP BY tenant_id;
