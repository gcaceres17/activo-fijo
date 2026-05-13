-- ============================================================
-- Migration 006: Nuevo modelo Grupo + Clase + Sucursal + RubroContable
-- Altera tablas existentes para el esquema v2.0
-- ============================================================

-- ── Nuevas tablas ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.grupos (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    codigo      VARCHAR(10) NOT NULL,
    nombre      VARCHAR(100) NOT NULL,
    deleted_at  TIMESTAMPTZ,
    UNIQUE (tenant_id, codigo)
);
CREATE INDEX IF NOT EXISTS idx_grupos_tenant ON public.grupos(tenant_id);

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
CREATE INDEX IF NOT EXISTS idx_clases_tenant ON public.clases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_clases_grupo  ON public.clases(grupo_id);

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
CREATE INDEX IF NOT EXISTS idx_sucursales_tenant ON public.sucursales(tenant_id);

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
CREATE INDEX IF NOT EXISTS idx_rubros_tenant ON public.rubros_contables(tenant_id);

-- ── Alterar public.activos ───────────────────────────────────────────────

ALTER TABLE public.activos
    ADD COLUMN IF NOT EXISTS grupo_id           UUID REFERENCES public.grupos(id),
    ADD COLUMN IF NOT EXISTS clase_id           UUID REFERENCES public.clases(id),
    ADD COLUMN IF NOT EXISTS sucursal_id        UUID REFERENCES public.sucursales(id),
    ADD COLUMN IF NOT EXISTS rubro_contable_id  UUID REFERENCES public.rubros_contables(id),
    ADD COLUMN IF NOT EXISTS vida_util_meses    INTEGER CHECK (vida_util_meses >= 12),
    ADD COLUMN IF NOT EXISTS qr_url             TEXT;

-- Derivar vida_util_meses de vida_util_años donde existe
UPDATE public.activos SET vida_util_meses = vida_util_años * 12
WHERE vida_util_meses IS NULL AND vida_util_años IS NOT NULL;

-- Actualizar constraint de estado (eliminar 'reservado', mantener los tres válidos)
ALTER TABLE public.activos DROP CONSTRAINT IF EXISTS activos_estado_check;
ALTER TABLE public.activos ADD CONSTRAINT activos_estado_check
    CHECK (estado IN ('activo','en_mantenimiento','dado_de_baja'));

CREATE INDEX IF NOT EXISTS idx_activos_grupo    ON public.activos(grupo_id);
CREATE INDEX IF NOT EXISTS idx_activos_clase    ON public.activos(clase_id);
CREATE INDEX IF NOT EXISTS idx_activos_sucursal ON public.activos(sucursal_id);

-- ── Alterar public.asignaciones ──────────────────────────────────────────

ALTER TABLE public.asignaciones
    ADD COLUMN IF NOT EXISTS responsable_nombre  VARCHAR(200),
    ADD COLUMN IF NOT EXISTS responsable_codigo  VARCHAR(30),
    ADD COLUMN IF NOT EXISTS sucursal_id         UUID REFERENCES public.sucursales(id),
    ADD COLUMN IF NOT EXISTS vigente             BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS fecha_inicio        DATE,
    ADD COLUMN IF NOT EXISTS fecha_fin           DATE;

-- Migrar datos de columnas viejas
UPDATE public.asignaciones
SET responsable_nombre = empleado_nombre,
    responsable_codigo = empleado_cedula,
    fecha_inicio       = COALESCE(fecha_asignacion, CURRENT_DATE),
    fecha_fin          = fecha_baja,
    vigente            = (estado = 'vigente')
WHERE responsable_nombre IS NULL;

-- Unique partial para INV-4.1 con nuevo esquema
DROP INDEX IF EXISTS idx_asig_vigente_unique;
CREATE UNIQUE INDEX IF NOT EXISTS idx_asig_vigente_nuevo
    ON public.asignaciones(activo_id) WHERE vigente = TRUE;

-- ── Alterar public.usuarios ──────────────────────────────────────────────

ALTER TABLE public.usuarios
    DROP CONSTRAINT IF EXISTS usuarios_rol_check;
ALTER TABLE public.usuarios
    ADD CONSTRAINT usuarios_rol_check
    CHECK (rol IN ('sysadmin_clt','admin_banco','operador','auditor','relevador','admin'));

ALTER TABLE public.usuarios
    ADD COLUMN IF NOT EXISTS ad_subject  VARCHAR(200),
    ADD COLUMN IF NOT EXISTS deleted_at  TIMESTAMPTZ;

-- ── Alterar public.dispositivos ──────────────────────────────────────────

ALTER TABLE public.dispositivos DROP CONSTRAINT IF EXISTS dispositivos_tipo_check;
ALTER TABLE public.dispositivos ADD CONSTRAINT dispositivos_tipo_check
    CHECK (tipo IN ('impresora_etiquetas','movil_relevador'));

ALTER TABLE public.dispositivos DROP CONSTRAINT IF EXISTS dispositivos_estado_check;

ALTER TABLE public.dispositivos
    ADD COLUMN IF NOT EXISTS modelo           VARCHAR(100),
    ADD COLUMN IF NOT EXISTS estado_conexion  VARCHAR(15) NOT NULL DEFAULT 'desconocido'
                             CHECK (estado_conexion IN ('online','offline','desconocido')),
    ADD COLUMN IF NOT EXISTS ultimo_ping      TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS config           JSONB NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS deleted_at       TIMESTAMPTZ;

-- ── Alterar public.audit_logs ────────────────────────────────────────────

ALTER TABLE public.audit_logs
    ADD COLUMN IF NOT EXISTS usuario_id      UUID,
    ADD COLUMN IF NOT EXISTS payload_before  JSONB NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS payload_after   JSONB NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS ip_address      VARCHAR(45);

CREATE INDEX IF NOT EXISTS idx_audit_usuario_id ON public.audit_logs(usuario_id);
CREATE INDEX IF NOT EXISTS idx_audit_entidad    ON public.audit_logs(entidad);

-- ── Vista v_activos_kpis (recrear con nuevo esquema) ────────────────────

DROP VIEW IF EXISTS public.v_activos_kpis;
CREATE VIEW public.v_activos_kpis AS
SELECT
    tenant_id,
    COUNT(*)                                            AS total_activos,
    COUNT(*) FILTER (WHERE estado = 'en_mantenimiento') AS en_mantenimiento,
    COUNT(*) FILTER (WHERE estado = 'dado_de_baja')     AS dados_de_baja,
    COALESCE(SUM(valor_adquisicion) FILTER (WHERE deleted_at IS NULL AND estado != 'dado_de_baja'), 0)
                                                        AS valor_total_cartera,
    COALESCE(SUM(
        CASE
          WHEN fecha_compra IS NOT NULL AND COALESCE(vida_util_meses, vida_util_años * 12, 60) > 0
          THEN LEAST(
            ((valor_adquisicion - valor_residual) / COALESCE(vida_util_meses, vida_util_años * 12, 60))
            * LEAST(
                (EXTRACT(YEAR FROM AGE(CURRENT_DATE, fecha_compra)) * 12
                 + EXTRACT(MONTH FROM AGE(CURRENT_DATE, fecha_compra))),
                COALESCE(vida_util_meses, vida_util_años * 12, 60)
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
