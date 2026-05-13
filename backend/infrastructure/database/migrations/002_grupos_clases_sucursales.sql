-- ============================================================
-- Migration 002: Grupos, Clases, Sucursales, Rubros Contables
-- Post-reunión Banco Continental, 12 de mayo de 2026
-- ============================================================
-- ESTRATEGIA:
--   1. Crear nuevas tablas: grupos, clases, sucursales, rubros_contables, tenant_config
--   2. Crear tablas nuevas: jornadas, items_jornada, incidencias, transferencias
--   3. Alterar tablas existentes: activos, asignaciones, usuarios, dispositivos, audit_logs
--   4. Migrar datos existentes (tenant CLT S.A.) hacia nuevo modelo
--   5. Insertar seed de Banco Continental (tenant 001)
--   6. NO eliminar tabla categorias (backup hasta validación completa)
-- ============================================================

BEGIN;

-- ── 1. NUEVAS TABLAS ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.tenant_config (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    clave       VARCHAR(100) NOT NULL,
    valor       TEXT NOT NULL,
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (tenant_id, clave)
);

CREATE TABLE IF NOT EXISTS public.grupos (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    codigo      VARCHAR(20) NOT NULL,
    nombre      VARCHAR(100) NOT NULL,
    deleted_at  TIMESTAMPTZ,
    UNIQUE (tenant_id, codigo)
);
CREATE INDEX IF NOT EXISTS idx_grupos_tenant ON public.grupos(tenant_id);

CREATE TABLE IF NOT EXISTS public.clases (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id            UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    grupo_id             UUID NOT NULL REFERENCES public.grupos(id),
    codigo               VARCHAR(20) NOT NULL,
    nombre               VARCHAR(100) NOT NULL,
    tasa_depreciacion    DECIMAL(5,4),
    deleted_at           TIMESTAMPTZ,
    UNIQUE (tenant_id, grupo_id, codigo)
);
CREATE INDEX IF NOT EXISTS idx_clases_tenant ON public.clases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_clases_grupo  ON public.clases(grupo_id);

CREATE TABLE IF NOT EXISTS public.sucursales (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    codigo      VARCHAR(20) NOT NULL,
    nombre      VARCHAR(100) NOT NULL,
    parent_id   UUID REFERENCES public.sucursales(id),
    nivel       INT NOT NULL DEFAULT 1 CHECK (nivel BETWEEN 1 AND 3),
    deleted_at  TIMESTAMPTZ,
    UNIQUE (tenant_id, codigo)
);
CREATE INDEX IF NOT EXISTS idx_sucursales_tenant ON public.sucursales(tenant_id);

CREATE TABLE IF NOT EXISTS public.rubros_contables (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id     UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    codigo        VARCHAR(50) NOT NULL,
    nombre        VARCHAR(200) NOT NULL,
    origen        VARCHAR(20) NOT NULL DEFAULT 'manual' CHECK (origen IN ('manual','finansys')),
    finansys_id   VARCHAR(100),
    activo        BOOLEAN DEFAULT TRUE,
    deleted_at    TIMESTAMPTZ,
    UNIQUE (tenant_id, codigo)
);
CREATE INDEX IF NOT EXISTS idx_rubros_tenant ON public.rubros_contables(tenant_id);

-- ── 2. NUEVAS TABLAS TRANSACCIONALES ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.jornadas (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    nombre          VARCHAR(200) NOT NULL,
    sucursal_ids    UUID[] NOT NULL DEFAULT '{}',
    relevador_ids   UUID[] DEFAULT '{}',
    estado          VARCHAR(30) NOT NULL DEFAULT 'pendiente'
                    CHECK (estado IN ('pendiente','en_progreso','cerrada')),
    fecha_inicio    DATE,
    fecha_cierre    DATE,
    created_by      UUID REFERENCES public.usuarios(id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_jornadas_tenant ON public.jornadas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_jornadas_estado ON public.jornadas(estado);

CREATE TABLE IF NOT EXISTS public.items_jornada (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    jornada_id      UUID NOT NULL REFERENCES public.jornadas(id) ON DELETE CASCADE,
    activo_id       UUID NOT NULL REFERENCES public.activos(id),
    estado          VARCHAR(30) NOT NULL DEFAULT 'pendiente'
                    CHECK (estado IN ('pendiente','encontrado','no_encontrado','con_incidencia')),
    foto_url        TEXT,
    escaneado_by    UUID REFERENCES public.usuarios(id),
    escaneado_at    TIMESTAMPTZ,
    UNIQUE (jornada_id, activo_id)
);
CREATE INDEX IF NOT EXISTS idx_items_jornada    ON public.items_jornada(jornada_id);
CREATE INDEX IF NOT EXISTS idx_items_activo     ON public.items_jornada(activo_id);

CREATE TABLE IF NOT EXISTS public.incidencias (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id        UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    activo_id        UUID NOT NULL REFERENCES public.activos(id),
    jornada_id       UUID REFERENCES public.jornadas(id),
    tipo             VARCHAR(100) NOT NULL,
    descripcion      TEXT,
    foto_url         TEXT,
    estado           VARCHAR(30) NOT NULL DEFAULT 'abierta'
                     CHECK (estado IN ('abierta','en_gestion','resuelta','cerrada')),
    responsable_id   UUID REFERENCES public.usuarios(id),
    created_by       UUID REFERENCES public.usuarios(id),
    created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_incidencias_tenant ON public.incidencias(tenant_id);
CREATE INDEX IF NOT EXISTS idx_incidencias_activo ON public.incidencias(activo_id);

CREATE TABLE IF NOT EXISTS public.transferencias (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id               UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    activo_id               UUID NOT NULL REFERENCES public.activos(id),
    sucursal_origen_id      UUID REFERENCES public.sucursales(id),
    sucursal_destino_id     UUID REFERENCES public.sucursales(id),
    responsable_origen      VARCHAR(200) NOT NULL,
    responsable_destino     VARCHAR(200) NOT NULL,
    motivo                  TEXT,
    estado                  VARCHAR(30) NOT NULL DEFAULT 'pendiente_aprobacion'
                            CHECK (estado IN ('pendiente_aprobacion','aprobada','rechazada')),
    aprobado_by             UUID REFERENCES public.usuarios(id),
    aprobado_at             TIMESTAMPTZ,
    created_by              UUID REFERENCES public.usuarios(id),
    created_at              TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_transferencias_tenant ON public.transferencias(tenant_id);
CREATE INDEX IF NOT EXISTS idx_transferencias_activo ON public.transferencias(activo_id);

CREATE TABLE IF NOT EXISTS public.depreciacion_historial (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    activo_id       UUID NOT NULL REFERENCES public.activos(id),
    periodo         DATE NOT NULL,
    dep_mensual     DECIMAL(15,2) NOT NULL,
    dep_acumulada   DECIMAL(15,2) NOT NULL,
    valor_libro     DECIMAL(15,2) NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (activo_id, periodo)
);
CREATE INDEX IF NOT EXISTS idx_dep_hist_activo ON public.depreciacion_historial(activo_id);
CREATE INDEX IF NOT EXISTS idx_dep_hist_periodo ON public.depreciacion_historial(periodo);

-- ── 3. ALTERAR TABLAS EXISTENTES ──────────────────────────────────────────

-- 3a. activos: agregar columnas nuevas (nullable para no romper datos existentes)
ALTER TABLE public.activos
    ADD COLUMN IF NOT EXISTS grupo_id          UUID REFERENCES public.grupos(id),
    ADD COLUMN IF NOT EXISTS clase_id          UUID REFERENCES public.clases(id),
    ADD COLUMN IF NOT EXISTS rubro_contable_id UUID REFERENCES public.rubros_contables(id),
    ADD COLUMN IF NOT EXISTS sucursal_id       UUID REFERENCES public.sucursales(id),
    ADD COLUMN IF NOT EXISTS vida_util_meses   INT CHECK (vida_util_meses >= 12),
    ADD COLUMN IF NOT EXISTS qr_url            TEXT;

-- 3b. asignaciones: agregar campos nuevos del modelo v2
ALTER TABLE public.asignaciones
    ADD COLUMN IF NOT EXISTS responsable_nombre VARCHAR(200),
    ADD COLUMN IF NOT EXISTS responsable_codigo VARCHAR(50),
    ADD COLUMN IF NOT EXISTS vigente            BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS sucursal_id        UUID REFERENCES public.sucursales(id);

-- 3c. usuarios: actualizar CHECK de rol para incluir nuevos roles
ALTER TABLE public.usuarios
    DROP CONSTRAINT IF EXISTS usuarios_rol_check;
ALTER TABLE public.usuarios
    ADD CONSTRAINT usuarios_rol_check
    CHECK (rol IN ('sysadmin_clt','admin_banco','operador','auditor','relevador','admin'));

-- 3d. dispositivos: actualizar para modelo v2 (Brother P950NW)
ALTER TABLE public.dispositivos
    ADD COLUMN IF NOT EXISTS modelo           VARCHAR(100),
    ADD COLUMN IF NOT EXISTS estado_conexion  VARCHAR(20) DEFAULT 'desconocido'
        CHECK (estado_conexion IN ('online','offline','desconocido')),
    ADD COLUMN IF NOT EXISTS ultimo_ping      TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS config           JSONB DEFAULT '{}';

-- 3e. audit_logs: agregar campos payload antes/después
ALTER TABLE public.audit_logs
    ADD COLUMN IF NOT EXISTS usuario_id     UUID REFERENCES public.usuarios(id),
    ADD COLUMN IF NOT EXISTS payload_before JSONB,
    ADD COLUMN IF NOT EXISTS payload_after  JSONB,
    ADD COLUMN IF NOT EXISTS ip_address     VARCHAR(45);

-- ── 4. MIGRACIÓN DE DATOS: CLT S.A. (tenant existente) ───────────────────

DO $$
DECLARE
    v_tenant_id UUID := '11111111-1111-1111-1111-111111111111';
    v_sucursal_id UUID;
    r RECORD;
    v_grupo_id UUID;
    v_clase_id UUID;
BEGIN
    -- Crear sucursal por defecto para activos existentes
    INSERT INTO public.sucursales (id, tenant_id, codigo, nombre, nivel)
    VALUES (uuid_generate_v4(), v_tenant_id, 'CM', 'Sede Central', 1)
    ON CONFLICT (tenant_id, codigo) DO NOTHING;

    SELECT id INTO v_sucursal_id FROM public.sucursales
    WHERE tenant_id = v_tenant_id AND codigo = 'CM';

    -- Migrar cada categoría → grupo + clase por defecto
    FOR r IN SELECT id, nombre, vida_util_default_años FROM public.categorias
             WHERE tenant_id = v_tenant_id AND deleted_at IS NULL
    LOOP
        -- Crear grupo desde la categoría
        INSERT INTO public.grupos (id, tenant_id, codigo, nombre)
        VALUES (
            uuid_generate_v4(),
            v_tenant_id,
            LEFT(UPPER(REGEXP_REPLACE(r.nombre, '[^a-zA-Z]', '', 'g')), 5),
            r.nombre
        )
        ON CONFLICT (tenant_id, codigo) DO UPDATE SET nombre = EXCLUDED.nombre
        RETURNING id INTO v_grupo_id;

        IF v_grupo_id IS NULL THEN
            SELECT id INTO v_grupo_id FROM public.grupos
            WHERE tenant_id = v_tenant_id
              AND codigo = LEFT(UPPER(REGEXP_REPLACE(r.nombre, '[^a-zA-Z]', '', 'g')), 5);
        END IF;

        -- Crear clase genérica para ese grupo
        INSERT INTO public.clases (id, tenant_id, grupo_id, codigo, nombre)
        VALUES (uuid_generate_v4(), v_tenant_id, v_grupo_id, 'GEN', 'General')
        ON CONFLICT (tenant_id, grupo_id, codigo) DO NOTHING
        RETURNING id INTO v_clase_id;

        IF v_clase_id IS NULL THEN
            SELECT id INTO v_clase_id FROM public.clases
            WHERE tenant_id = v_tenant_id AND grupo_id = v_grupo_id AND codigo = 'GEN';
        END IF;

        -- Poblar activos con los nuevos IDs
        UPDATE public.activos
        SET
            grupo_id        = v_grupo_id,
            clase_id        = v_clase_id,
            sucursal_id     = v_sucursal_id,
            vida_util_meses = vida_util_años * 12
        WHERE tenant_id = v_tenant_id
          AND categoria_id = r.id
          AND deleted_at IS NULL;
    END LOOP;

    -- Poblar responsable_nombre en asignaciones desde empleado_nombre
    UPDATE public.asignaciones
    SET
        responsable_nombre = empleado_nombre,
        responsable_codigo = empleado_cedula,
        vigente            = (estado = 'vigente')
    WHERE tenant_id = v_tenant_id
      AND responsable_nombre IS NULL;

    RAISE NOTICE 'Migración CLT S.A. completada.';
END;
$$;

-- ── 5. SEED: BANCO CONTINENTAL (tenant nuevo) ────────────────────────────

INSERT INTO public.tenants (id, nombre, activo)
VALUES ('00000000-0000-0000-0000-000000000001', 'Banco Continental S.A.E.C.A.', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Feature flags
INSERT INTO public.tenant_config (tenant_id, clave, valor) VALUES
('00000000-0000-0000-0000-000000000001', 'ff_centro_costo',                       'false'),
('00000000-0000-0000-0000-000000000001', 'ff_transferencia_requiere_aprobacion',   'true'),
('00000000-0000-0000-0000-000000000001', 'codigo_separador',                       '-'),
('00000000-0000-0000-0000-000000000001', 'alerta_dias_sin_auditar',                '180')
ON CONFLICT (tenant_id, clave) DO NOTHING;

-- Usuario admin Banco Continental
INSERT INTO public.usuarios (id, tenant_id, email, password_hash, nombre_completo, rol)
VALUES (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'admin@continental.com.py',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LpOd7R7Ib3bQyA5Ue',  -- Admin1234
    'Administrador Continental',
    'admin_banco'
) ON CONFLICT DO NOTHING;

-- 16 Grupos (Banco Continental)
INSERT INTO public.grupos (id, tenant_id, codigo, nombre) VALUES
('g0000000-0001-0001-0001-000000000001', '00000000-0000-0000-0000-000000000001', 'EQI', 'Equipos de Informática'),
('g0000000-0001-0001-0001-000000000002', '00000000-0000-0000-0000-000000000001', 'MUE', 'Muebles y Enseres'),
('g0000000-0001-0001-0001-000000000003', '00000000-0000-0000-0000-000000000001', 'VEH', 'Vehículos'),
('g0000000-0001-0001-0001-000000000004', '00000000-0000-0000-0000-000000000001', 'INM', 'Inmuebles'),
('g0000000-0001-0001-0001-000000000005', '00000000-0000-0000-0000-000000000001', 'EQO', 'Equipos de Oficina'),
('g0000000-0001-0001-0001-000000000006', '00000000-0000-0000-0000-000000000001', 'EQC', 'Equipos de Comunicación'),
('g0000000-0001-0001-0001-000000000007', '00000000-0000-0000-0000-000000000001', 'SEG', 'Equipos de Seguridad y Vigilancia'),
('g0000000-0001-0001-0001-000000000008', '00000000-0000-0000-0000-000000000001', 'EQA', 'Equipos Audiovisuales'),
('g0000000-0001-0001-0001-000000000009', '00000000-0000-0000-0000-000000000001', 'EQE', 'Equipos Eléctricos y Climatización'),
('g0000000-0001-0001-0001-000000000010', '00000000-0000-0000-0000-000000000001', 'MAQ', 'Maquinaria y Equipos Industriales'),
('g0000000-0001-0001-0001-000000000011', '00000000-0000-0000-0000-000000000001', 'INS', 'Instalaciones'),
('g0000000-0001-0001-0001-000000000012', '00000000-0000-0000-0000-000000000001', 'HER', 'Herramientas y Útiles'),
('g0000000-0001-0001-0001-000000000013', '00000000-0000-0000-0000-000000000001', 'SFT', 'Software y Licencias'),
('g0000000-0001-0001-0001-000000000014', '00000000-0000-0000-0000-000000000001', 'EQM', 'Equipos Médicos y Laboratorio'),
('g0000000-0001-0001-0001-000000000015', '00000000-0000-0000-0000-000000000001', 'OBR', 'Obras en Construcción'),
('g0000000-0001-0001-0001-000000000016', '00000000-0000-0000-0000-000000000001', 'OTR', 'Otros Activos')
ON CONFLICT (tenant_id, codigo) DO NOTHING;

-- Clases representativas (Banco Continental)
INSERT INTO public.clases (id, tenant_id, grupo_id, codigo, nombre, tasa_depreciacion) VALUES
-- EQI - Equipos de Informática
('c0000000-0001-0001-0001-000000000001','00000000-0000-0000-0000-000000000001','g0000000-0001-0001-0001-000000000001','LAP','Laptops',                    0.3333),
('c0000000-0001-0001-0001-000000000002','00000000-0000-0000-0000-000000000001','g0000000-0001-0001-0001-000000000001','DSK','Desktops y All-in-One',        0.3333),
('c0000000-0001-0001-0001-000000000003','00000000-0000-0000-0000-000000000001','g0000000-0001-0001-0001-000000000001','SRV','Servidores',                   0.3333),
('c0000000-0001-0001-0001-000000000004','00000000-0000-0000-0000-000000000001','g0000000-0001-0001-0001-000000000001','MON','Monitores',                    0.3333),
('c0000000-0001-0001-0001-000000000005','00000000-0000-0000-0000-000000000001','g0000000-0001-0001-0001-000000000001','IMP','Impresoras y Scanners',        0.3333),
-- MUE - Muebles y Enseres
('c0000000-0001-0001-0001-000000000010','00000000-0000-0000-0000-000000000001','g0000000-0001-0001-0001-000000000002','ESC','Escritorios',                  0.1000),
('c0000000-0001-0001-0001-000000000011','00000000-0000-0000-0000-000000000001','g0000000-0001-0001-0001-000000000002','SIL','Sillas y Sillones',            0.1000),
('c0000000-0001-0001-0001-000000000012','00000000-0000-0000-0000-000000000001','g0000000-0001-0001-0001-000000000002','CAJ','Cajoneras',                    0.1000),
('c0000000-0001-0001-0001-000000000013','00000000-0000-0000-0000-000000000001','g0000000-0001-0001-0001-000000000002','EST','Estantes y Estanterías',       0.1000),
('c0000000-0001-0001-0001-000000000014','00000000-0000-0000-0000-000000000001','g0000000-0001-0001-0001-000000000002','ARC','Archiveros y Archivadores',    0.1000),
-- VEH - Vehículos
('c0000000-0001-0001-0001-000000000020','00000000-0000-0000-0000-000000000001','g0000000-0001-0001-0001-000000000003','AUT','Automóviles',                  0.2000),
('c0000000-0001-0001-0001-000000000021','00000000-0000-0000-0000-000000000001','g0000000-0001-0001-0001-000000000003','CAM','Camionetas y Pick-up',         0.2000),
('c0000000-0001-0001-0001-000000000022','00000000-0000-0000-0000-000000000001','g0000000-0001-0001-0001-000000000003','MOT','Motocicletas',                 0.2000),
-- INM - Inmuebles
('c0000000-0001-0001-0001-000000000030','00000000-0000-0000-0000-000000000001','g0000000-0001-0001-0001-000000000004','EDI','Edificios Propios',            0.0250),
('c0000000-0001-0001-0001-000000000031','00000000-0000-0000-0000-000000000001','g0000000-0001-0001-0001-000000000004','TER','Terrenos',                    0.0000),
-- EQC - Comunicación
('c0000000-0001-0001-0001-000000000040','00000000-0000-0000-0000-000000000001','g0000000-0001-0001-0001-000000000006','SWI','Switches y Routers',           0.2000),
('c0000000-0001-0001-0001-000000000041','00000000-0000-0000-0000-000000000001','g0000000-0001-0001-0001-000000000006','TEL','Teléfonos IP',                 0.2000),
('c0000000-0001-0001-0001-000000000042','00000000-0000-0000-0000-000000000001','g0000000-0001-0001-0001-000000000006','WAP','Access Points WiFi',           0.2000),
-- SEG - Seguridad
('c0000000-0001-0001-0001-000000000050','00000000-0000-0000-0000-000000000001','g0000000-0001-0001-0001-000000000007','CAM','Cámaras CCTV',                 0.2000),
('c0000000-0001-0001-0001-000000000051','00000000-0000-0000-0000-000000000001','g0000000-0001-0001-0001-000000000007','CAJ','Cajas Fuertes y Bóvedas',      0.1000),
-- SFT - Software
('c0000000-0001-0001-0001-000000000060','00000000-0000-0000-0000-000000000001','g0000000-0001-0001-0001-000000000013','LIC','Licencias de Software',        0.3333),
('c0000000-0001-0001-0001-000000000061','00000000-0000-0000-0000-000000000001','g0000000-0001-0001-0001-000000000013','ERP','Sistemas ERP/Core Bancario',   0.3333)
ON CONFLICT (tenant_id, grupo_id, codigo) DO NOTHING;

-- Sucursales (Banco Continental)
INSERT INTO public.sucursales (id, tenant_id, codigo, nombre, nivel) VALUES
('s0000000-0001-0001-0001-000000000001','00000000-0000-0000-0000-000000000001','CM',  'Casa Matriz',             1),
('s0000000-0001-0001-0001-000000000002','00000000-0000-0000-0000-000000000001','SL',  'San Lorenzo',             1),
('s0000000-0001-0001-0001-000000000003','00000000-0000-0000-0000-000000000001','CDE', 'Ciudad del Este Centro',  1),
('s0000000-0001-0001-0001-000000000004','00000000-0000-0000-0000-000000000001','ENC', 'Encarnación',             1),
('s0000000-0001-0001-0001-000000000005','00000000-0000-0000-0000-000000000001','LUQ', 'Luque',                   1),
('s0000000-0001-0001-0001-000000000006','00000000-0000-0000-0000-000000000001','ART', 'Artigas',                 1),
('s0000000-0001-0001-0001-000000000007','00000000-0000-0000-0000-000000000001','FDM', 'Fernando de la Mora',     1),
('s0000000-0001-0001-0001-000000000008','00000000-0000-0000-0000-000000000001','CDE2','Ciudad del Este Norte',   1),
('s0000000-0001-0001-0001-000000000009','00000000-0000-0000-0000-000000000001','CAP', 'Capiatá',                 1),
('s0000000-0001-0001-0001-000000000010','00000000-0000-0000-0000-000000000001','LAM', 'Lambaré',                 1)
ON CONFLICT (tenant_id, codigo) DO NOTHING;

-- Rubros Contables (Banco Continental — plan de cuentas simplificado POC)
INSERT INTO public.rubros_contables (id, tenant_id, codigo, nombre, origen) VALUES
('r0000000-0001-0001-0001-000000000001','00000000-0000-0000-0000-000000000001','162.01.01','Equipos de Informática',        'manual'),
('r0000000-0001-0001-0001-000000000002','00000000-0000-0000-0000-000000000001','162.01.02','Software y Licencias',          'manual'),
('r0000000-0001-0001-0001-000000000003','00000000-0000-0000-0000-000000000001','162.02.01','Muebles y Enseres',             'manual'),
('r0000000-0001-0001-0001-000000000004','00000000-0000-0000-0000-000000000001','162.02.02','Equipos de Oficina',            'manual'),
('r0000000-0001-0001-0001-000000000005','00000000-0000-0000-0000-000000000001','162.03.01','Vehículos',                    'manual'),
('r0000000-0001-0001-0001-000000000006','00000000-0000-0000-0000-000000000001','162.04.01','Inmuebles - Edificios',        'manual'),
('r0000000-0001-0001-0001-000000000007','00000000-0000-0000-0000-000000000001','162.04.02','Inmuebles - Terrenos',         'manual'),
('r0000000-0001-0001-0001-000000000008','00000000-0000-0000-0000-000000000001','162.05.01','Equipos de Comunicación',       'manual'),
('r0000000-0001-0001-0001-000000000009','00000000-0000-0000-0000-000000000001','162.06.01','Equipos de Seguridad',          'manual')
ON CONFLICT (tenant_id, codigo) DO NOTHING;

-- Activos de ejemplo (Banco Continental — 12 activos para el demo del lunes)
-- Primero crear la secuencia
INSERT INTO public.activos_sequence (tenant_id, last_value)
VALUES ('00000000-0000-0000-0000-000000000001', 0)
ON CONFLICT DO NOTHING;

INSERT INTO public.activos (
    id, tenant_id, codigo, nombre,
    grupo_id, clase_id, rubro_contable_id, sucursal_id,
    marca, modelo, numero_serie, fecha_compra,
    valor_adquisicion, vida_util_meses, valor_residual, estado,
    categoria_id
) VALUES
(
    'a0000000-0001-0001-0001-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'ACT-0001', 'Laptop Dell Latitude 5540',
    'g0000000-0001-0001-0001-000000000001',
    'c0000000-0001-0001-0001-000000000001',
    'r0000000-0001-0001-0001-000000000001',
    's0000000-0001-0001-0001-000000000001',
    'Dell', 'Latitude 5540', 'DL5540-BC-001', '2024-01-15',
    7500000, 36, 0, 'activo',
    (SELECT id FROM public.categorias WHERE tenant_id = '11111111-1111-1111-1111-111111111111' AND nombre = 'Equipos de Cómputo' LIMIT 1)
),
(
    'a0000000-0001-0001-0001-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'ACT-0002', 'Monitor LG UltraWide 34"',
    'g0000000-0001-0001-0001-000000000001',
    'c0000000-0001-0001-0001-000000000004',
    'r0000000-0001-0001-0001-000000000001',
    's0000000-0001-0001-0001-000000000001',
    'LG', '34WN780-B', 'LG34-BC-002', '2024-01-15',
    2800000, 36, 0, 'activo',
    (SELECT id FROM public.categorias WHERE tenant_id = '11111111-1111-1111-1111-111111111111' AND nombre = 'Equipos de Cómputo' LIMIT 1)
),
(
    'a0000000-0001-0001-0001-000000000003',
    '00000000-0000-0000-0000-000000000001',
    'ACT-0003', 'Toyota Hilux 4x4 SRV',
    'g0000000-0001-0001-0001-000000000003',
    'c0000000-0001-0001-0001-000000000021',
    'r0000000-0001-0001-0001-000000000005',
    's0000000-0001-0001-0001-000000000001',
    'Toyota', 'Hilux SRV 4x4', 'TOY-HIL-BC-001', '2023-06-01',
    185000000, 60, 0, 'activo',
    (SELECT id FROM public.categorias WHERE tenant_id = '11111111-1111-1111-1111-111111111111' AND nombre = 'Vehículos' LIMIT 1)
),
(
    'a0000000-0001-0001-0001-000000000004',
    '00000000-0000-0000-0000-000000000001',
    'ACT-0004', 'Servidor HP ProLiant DL380 Gen10',
    'g0000000-0001-0001-0001-000000000001',
    'c0000000-0001-0001-0001-000000000003',
    'r0000000-0001-0001-0001-000000000001',
    's0000000-0001-0001-0001-000000000001',
    'HP', 'ProLiant DL380 Gen10', 'HP-DL380-BC-001', '2022-08-20',
    45000000, 36, 0, 'en_mantenimiento',
    (SELECT id FROM public.categorias WHERE tenant_id = '11111111-1111-1111-1111-111111111111' AND nombre = 'Equipos de Cómputo' LIMIT 1)
),
(
    'a0000000-0001-0001-0001-000000000005',
    '00000000-0000-0000-0000-000000000001',
    'ACT-0005', 'Escritorio Ejecutivo Steelcase',
    'g0000000-0001-0001-0001-000000000002',
    'c0000000-0001-0001-0001-000000000010',
    'r0000000-0001-0001-0001-000000000003',
    's0000000-0001-0001-0001-000000000001',
    'Steelcase', 'Series 5', 'SC-DESK-BC-001', '2023-01-10',
    4500000, 120, 0, 'activo',
    (SELECT id FROM public.categorias WHERE tenant_id = '11111111-1111-1111-1111-111111111111' AND nombre = 'Mobiliario y Enseres' LIMIT 1)
),
(
    'a0000000-0001-0001-0001-000000000006',
    '00000000-0000-0000-0000-000000000001',
    'ACT-0006', 'Silla Ergonómica Herman Miller Aeron',
    'g0000000-0001-0001-0001-000000000002',
    'c0000000-0001-0001-0001-000000000011',
    'r0000000-0001-0001-0001-000000000003',
    's0000000-0001-0001-0001-000000000001',
    'Herman Miller', 'Aeron B', 'HM-AERON-BC-001', '2023-01-10',
    6800000, 120, 0, 'activo',
    (SELECT id FROM public.categorias WHERE tenant_id = '11111111-1111-1111-1111-111111111111' AND nombre = 'Mobiliario y Enseres' LIMIT 1)
),
(
    'a0000000-0001-0001-0001-000000000007',
    '00000000-0000-0000-0000-000000000001',
    'ACT-0007', 'Switch Cisco Catalyst 9200',
    'g0000000-0001-0001-0001-000000000006',
    'c0000000-0001-0001-0001-000000000040',
    'r0000000-0001-0001-0001-000000000008',
    's0000000-0001-0001-0001-000000000001',
    'Cisco', 'Catalyst 9200-24P', 'CSC-9200-BC-001', '2023-03-15',
    18000000, 60, 0, 'activo',
    (SELECT id FROM public.categorias WHERE tenant_id = '11111111-1111-1111-1111-111111111111' AND nombre = 'Equipos de Comunicación' LIMIT 1)
),
(
    'a0000000-0001-0001-0001-000000000008',
    '00000000-0000-0000-0000-000000000001',
    'ACT-0008', 'Laptop Lenovo ThinkPad X1 Carbon',
    'g0000000-0001-0001-0001-000000000001',
    'c0000000-0001-0001-0001-000000000001',
    'r0000000-0001-0001-0001-000000000001',
    's0000000-0001-0001-0001-000000000002',
    'Lenovo', 'ThinkPad X1 Carbon Gen 11', 'LNV-X1-BC-001', '2024-02-01',
    9800000, 36, 0, 'activo',
    (SELECT id FROM public.categorias WHERE tenant_id = '11111111-1111-1111-1111-111111111111' AND nombre = 'Equipos de Cómputo' LIMIT 1)
),
(
    'a0000000-0001-0001-0001-000000000009',
    '00000000-0000-0000-0000-000000000001',
    'ACT-0009', 'Cámara CCTV Hikvision DS-2CD2143G2',
    'g0000000-0001-0001-0001-000000000007',
    'c0000000-0001-0001-0001-000000000050',
    'r0000000-0001-0001-0001-000000000009',
    's0000000-0001-0001-0001-000000000001',
    'Hikvision', 'DS-2CD2143G2-I', 'HKV-CAM-BC-001', '2023-09-01',
    1850000, 60, 0, 'activo',
    (SELECT id FROM public.categorias WHERE tenant_id = '11111111-1111-1111-1111-111111111111' AND nombre = 'Equipos de Comunicación' LIMIT 1)
),
(
    'a0000000-0001-0001-0001-000000000010',
    '00000000-0000-0000-0000-000000000001',
    'ACT-0010', 'UPS APC Smart-UPS 3000VA',
    'g0000000-0001-0001-0001-000000000009',
    (SELECT id FROM public.clases WHERE tenant_id = '00000000-0000-0000-0000-000000000001' AND codigo = 'GEN' LIMIT 1),
    NULL,
    's0000000-0001-0001-0001-000000000001',
    'APC', 'Smart-UPS 3000VA', 'APC-BC-001', '2022-11-10',
    9500000, 60, 0, 'activo',
    (SELECT id FROM public.categorias WHERE tenant_id = '11111111-1111-1111-1111-111111111111' AND nombre = 'Equipos de Cómputo' LIMIT 1)
),
(
    'a0000000-0001-0001-0001-000000000011',
    '00000000-0000-0000-0000-000000000001',
    'ACT-0011', 'Cajonera Metálica 3 Gavetas',
    'g0000000-0001-0001-0001-000000000002',
    'c0000000-0001-0001-0001-000000000012',
    'r0000000-0001-0001-0001-000000000003',
    's0000000-0001-0001-0001-000000000003',
    'Artmetal', 'CM-3G-7050', 'AM-CAJ-BC-001', '2022-05-15',
    850000, 120, 0, 'activo',
    (SELECT id FROM public.categorias WHERE tenant_id = '11111111-1111-1111-1111-111111111111' AND nombre = 'Mobiliario y Enseres' LIMIT 1)
),
(
    'a0000000-0001-0001-0001-000000000012',
    '00000000-0000-0000-0000-000000000001',
    'ACT-0012', 'Estante Metálico Desmontable',
    'g0000000-0001-0001-0001-000000000002',
    'c0000000-0001-0001-0001-000000000013',
    'r0000000-0001-0001-0001-000000000003',
    's0000000-0001-0001-0001-000000000003',
    'Artmetal', 'EST-5N-1800', 'AM-EST-BC-001', '2022-05-15',
    650000, 120, 0, 'activo',
    (SELECT id FROM public.categorias WHERE tenant_id = '11111111-1111-1111-1111-111111111111' AND nombre = 'Mobiliario y Enseres' LIMIT 1)
)
ON CONFLICT (tenant_id, codigo) DO NOTHING;

-- Actualizar secuencia
UPDATE public.activos_sequence SET last_value = 12
WHERE tenant_id = '00000000-0000-0000-0000-000000000001';

-- Asignaciones para activos del demo
INSERT INTO public.asignaciones (
    id, tenant_id, activo_id,
    empleado_nombre, empleado_cedula,
    responsable_nombre, responsable_codigo,
    area, vigente, fecha_asignacion, estado
) VALUES
(
    'asg0000-0001-0001-0001-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'a0000000-0001-0001-0001-000000000001',
    'Juan López', '5.123.456',
    'Juan López', '5.123.456',
    'Tecnología', TRUE, '2024-01-20', 'vigente'
),
(
    'asg0000-0001-0001-0001-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'a0000000-0001-0001-0001-000000000003',
    'Roberto Silva', '4.987.654',
    'Roberto Silva', '4.987.654',
    'Logística', TRUE, '2023-06-05', 'vigente'
),
(
    'asg0000-0001-0001-0001-000000000003',
    '00000000-0000-0000-0000-000000000001',
    'a0000000-0001-0001-0001-000000000005',
    'María González', '6.234.567',
    'María González', '6.234.567',
    'Gerencia', TRUE, '2023-01-15', 'vigente'
)
ON CONFLICT DO NOTHING;

-- ── 6. ACTUALIZAR VISTA KPIs ──────────────────────────────────────────────

CREATE OR REPLACE VIEW public.v_activos_kpis AS
SELECT
    a.tenant_id,
    COUNT(*) FILTER (WHERE a.deleted_at IS NULL AND a.estado = 'activo')             AS total_activos,
    COUNT(*) FILTER (WHERE a.deleted_at IS NULL AND a.estado = 'en_mantenimiento')   AS en_mantenimiento,
    COUNT(*) FILTER (WHERE a.deleted_at IS NOT NULL OR a.estado = 'dado_de_baja')    AS dados_de_baja,
    COALESCE(SUM(a.valor_adquisicion) FILTER (WHERE a.deleted_at IS NULL), 0)        AS valor_total_adquisicion,
    COALESCE(SUM(
        CASE
            WHEN a.fecha_compra IS NULL OR COALESCE(a.vida_util_meses, a.vida_util_años * 12, 0) = 0 THEN 0
            ELSE LEAST(
                ((a.valor_adquisicion - a.valor_residual) / COALESCE(a.vida_util_meses, a.vida_util_años * 12))
                * LEAST(
                    EXTRACT(YEAR FROM AGE(CURRENT_DATE, a.fecha_compra)) * 12 +
                    EXTRACT(MONTH FROM AGE(CURRENT_DATE, a.fecha_compra)),
                    COALESCE(a.vida_util_meses, a.vida_util_años * 12)
                )::INTEGER,
                a.valor_adquisicion - a.valor_residual
            )
        END
    ) FILTER (WHERE a.deleted_at IS NULL), 0)                                        AS depreciacion_acumulada_total,
    COUNT(DISTINCT a.sucursal_id) FILTER (WHERE a.deleted_at IS NULL)                AS sucursales_con_activos
FROM public.activos a
GROUP BY a.tenant_id;

COMMIT;
