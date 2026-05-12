# DATABASE.md — Esquema de Base de Datos: Activo Fijo CLT

## Motor: PostgreSQL 15
## Extensiones requeridas: uuid-ossp, pgcrypto

---

## Tabla: `public.tenants`

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.tenants (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre      VARCHAR(200) NOT NULL,
    ruc         VARCHAR(20) UNIQUE,
    activo      BOOLEAN DEFAULT TRUE NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TRIGGER tenants_updated_at
    BEFORE UPDATE ON public.tenants
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
```

---

## Tabla: `public.usuarios`

```sql
CREATE TABLE IF NOT EXISTS public.usuarios (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id        UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    email            VARCHAR(255) NOT NULL,
    password_hash    TEXT NOT NULL,
    nombre_completo  VARCHAR(200) NOT NULL,
    rol              VARCHAR(20) NOT NULL DEFAULT 'operador'
                     CHECK (rol IN ('admin','operador','auditor')),
    activo           BOOLEAN DEFAULT TRUE NOT NULL,
    ultimo_login     TIMESTAMPTZ,
    created_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE (tenant_id, email)
);

CREATE INDEX idx_usuarios_tenant ON public.usuarios(tenant_id);
CREATE INDEX idx_usuarios_email  ON public.usuarios(email);

CREATE TRIGGER usuarios_updated_at
    BEFORE UPDATE ON public.usuarios
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
```

---

## Tabla: `public.categorias`

```sql
CREATE TABLE IF NOT EXISTS public.categorias (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id             UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    nombre                VARCHAR(100) NOT NULL,
    icono                 VARCHAR(50) NOT NULL DEFAULT 'package',
    color_hex             VARCHAR(7) NOT NULL DEFAULT '#6874B5',
    vida_util_default_años INTEGER NOT NULL DEFAULT 5 CHECK (vida_util_default_años >= 1),
    created_at            TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at            TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at            TIMESTAMPTZ,
    UNIQUE (tenant_id, nombre)
);

CREATE INDEX idx_categorias_tenant ON public.categorias(tenant_id);

CREATE TRIGGER categorias_updated_at
    BEFORE UPDATE ON public.categorias
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
```

---

## Tabla: `public.centros_costo`

```sql
CREATE TABLE IF NOT EXISTS public.centros_costo (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    codigo      VARCHAR(20) NOT NULL,
    nombre      VARCHAR(150) NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at  TIMESTAMPTZ,
    UNIQUE (tenant_id, codigo)
);

CREATE INDEX idx_centros_costo_tenant ON public.centros_costo(tenant_id);

CREATE TRIGGER centros_costo_updated_at
    BEFORE UPDATE ON public.centros_costo
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
```

---

## Tabla: `public.activos`

```sql
CREATE TABLE IF NOT EXISTS public.activos (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id            UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    codigo               VARCHAR(20) NOT NULL,
    nombre               VARCHAR(300) NOT NULL,
    categoria_id         UUID NOT NULL REFERENCES public.categorias(id),
    marca                VARCHAR(100),
    modelo               VARCHAR(100),
    numero_serie         VARCHAR(150),
    fecha_compra         DATE,
    valor_adquisicion    NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (valor_adquisicion >= 0),
    vida_util_años       INTEGER NOT NULL DEFAULT 5 CHECK (vida_util_años >= 1),
    valor_residual       NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (valor_residual >= 0),
    estado               VARCHAR(20) NOT NULL DEFAULT 'activo'
                         CHECK (estado IN ('activo','en_mantenimiento','dado_de_baja','reservado')),
    area                 VARCHAR(100),
    centro_costo_id      UUID REFERENCES public.centros_costo(id),
    responsable          VARCHAR(200),
    ubicacion            VARCHAR(200),
    foto_url             TEXT,
    documentos           JSONB NOT NULL DEFAULT '[]',
    created_at           TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at           TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at           TIMESTAMPTZ,
    UNIQUE (tenant_id, codigo),
    -- INV-1.3: valor_residual <= valor_adquisicion
    CONSTRAINT activos_residual_check CHECK (valor_residual <= valor_adquisicion)
);

CREATE INDEX idx_activos_tenant           ON public.activos(tenant_id);
CREATE INDEX idx_activos_categoria        ON public.activos(categoria_id);
CREATE INDEX idx_activos_centro_costo     ON public.activos(centro_costo_id);
CREATE INDEX idx_activos_estado           ON public.activos(estado);
CREATE INDEX idx_activos_area             ON public.activos(area);
CREATE INDEX idx_activos_deleted          ON public.activos(deleted_at) WHERE deleted_at IS NULL;
-- Búsqueda full-text en nombre y código
CREATE INDEX idx_activos_search ON public.activos
    USING gin(to_tsvector('spanish', coalesce(nombre,'') || ' ' || coalesce(codigo,'')));

CREATE TRIGGER activos_updated_at
    BEFORE UPDATE ON public.activos
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Secuencia para código automático por tenant
CREATE TABLE IF NOT EXISTS public.activos_sequence (
    tenant_id   UUID PRIMARY KEY REFERENCES public.tenants(id),
    last_value  INTEGER NOT NULL DEFAULT 0
);

-- Función para obtener el próximo código
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
```

---

## Tabla: `public.asignaciones`

```sql
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
    -- INV-4.2: fecha_baja >= fecha_asignacion
    CONSTRAINT asig_fechas_check CHECK (fecha_baja IS NULL OR fecha_baja >= fecha_asignacion)
);

-- INV-4.1: Solo una asignación vigente por activo
CREATE UNIQUE INDEX idx_asig_vigente_unique
    ON public.asignaciones(activo_id)
    WHERE estado = 'vigente';

CREATE INDEX idx_asignaciones_tenant  ON public.asignaciones(tenant_id);
CREATE INDEX idx_asignaciones_activo  ON public.asignaciones(activo_id);
CREATE INDEX idx_asignaciones_estado  ON public.asignaciones(estado);

CREATE TRIGGER asignaciones_updated_at
    BEFORE UPDATE ON public.asignaciones
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
```

---

## Tabla: `public.mantenimientos`

```sql
CREATE TABLE IF NOT EXISTS public.mantenimientos (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id            UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    activo_id            UUID NOT NULL REFERENCES public.activos(id) ON DELETE CASCADE,
    tipo                 VARCHAR(20) NOT NULL
                         CHECK (tipo IN ('preventivo','correctivo','predictivo')),
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

CREATE INDEX idx_mnt_tenant  ON public.mantenimientos(tenant_id);
CREATE INDEX idx_mnt_activo  ON public.mantenimientos(activo_id);
CREATE INDEX idx_mnt_estado  ON public.mantenimientos(estado);

CREATE TRIGGER mantenimientos_updated_at
    BEFORE UPDATE ON public.mantenimientos
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
```

---

## Tabla: `public.audit_logs`

```sql
-- Tabla append-only (INV-6.1: nunca se modifica ni elimina)
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
    -- Sin updated_at ni deleted_at: append-only
);

CREATE INDEX idx_audit_tenant     ON public.audit_logs(tenant_id);
CREATE INDEX idx_audit_fecha      ON public.audit_logs(fecha_hora DESC);
CREATE INDEX idx_audit_usuario    ON public.audit_logs(usuario_email);
CREATE INDEX idx_audit_accion     ON public.audit_logs(accion);
CREATE INDEX idx_audit_entidad_id ON public.audit_logs(entidad_id) WHERE entidad_id IS NOT NULL;
```

---

## Tabla: `public.dispositivos`

```sql
CREATE TABLE IF NOT EXISTS public.dispositivos (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id        UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    nombre           VARCHAR(100) NOT NULL,
    tipo             VARCHAR(20) NOT NULL
                     CHECK (tipo IN ('impresora','lector_qr','lector_barcode')),
    protocolo        VARCHAR(20) NOT NULL
                     CHECK (protocolo IN ('usb','tcp_ip','bluetooth','usb_hid')),
    driver           VARCHAR(200),
    ip_address       VARCHAR(45),
    estado           VARCHAR(20) NOT NULL DEFAULT 'desconectado'
                     CHECK (estado IN ('conectado','desconectado','emparejado')),
    ultima_conexion  TIMESTAMPTZ,
    created_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_dispositivos_tenant ON public.dispositivos(tenant_id);

CREATE TRIGGER dispositivos_updated_at
    BEFORE UPDATE ON public.dispositivos
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
```

---

## Función de utilidad: handle_updated_at

```sql
-- Crear PRIMERO (es referenciada por todos los triggers)
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## Vista: KPIs Dashboard

```sql
CREATE OR REPLACE VIEW public.v_activos_kpis AS
SELECT
    tenant_id,
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND estado = 'activo')           AS total_activos,
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND estado = 'en_mantenimiento') AS en_mantenimiento,
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND estado = 'dado_de_baja')     AS dados_de_baja,
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND estado = 'reservado')        AS reservados,
    COALESCE(SUM(valor_adquisicion) FILTER (WHERE deleted_at IS NULL), 0)      AS valor_total_cartera,
    COALESCE(SUM(
        CASE
            WHEN fecha_compra IS NULL OR vida_util_años = 0 THEN 0
            ELSE LEAST(
                ((valor_adquisicion - valor_residual) / vida_util_años)
                * LEAST(EXTRACT(YEAR FROM AGE(CURRENT_DATE, fecha_compra))::INTEGER, vida_util_años),
                valor_adquisicion - valor_residual
            )
        END
    ) FILTER (WHERE deleted_at IS NULL), 0) AS depreciacion_acumulada_total
FROM public.activos
GROUP BY tenant_id;
```
