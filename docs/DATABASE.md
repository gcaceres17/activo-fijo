# DATABASE.md — Esquema de Base de Datos: Activo Fijo CLT v2.0

> Actualizado post-reunión Banco Continental, 12 de mayo de 2026.
> Motor preferido: PostgreSQL 15. Alternativo: Oracle (a confirmar con TI banco).

## Tablas principales

### `tenants`
```sql
CREATE TABLE tenants (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre      VARCHAR(200) NOT NULL,
    activo      BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### `usuarios`
```sql
CREATE TABLE usuarios (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id        UUID NOT NULL REFERENCES tenants(id),
    email            VARCHAR(255) NOT NULL,
    password_hash    TEXT,                         -- NULL si usa AD
    nombre_completo  VARCHAR(200) NOT NULL,
    rol              VARCHAR(30) NOT NULL
                     CHECK (rol IN ('sysadmin_clt','admin_banco','operador','auditor','relevador')),
    ad_subject       VARCHAR(255),                 -- Para integración AD
    activo           BOOLEAN DEFAULT TRUE,
    deleted_at       TIMESTAMPTZ,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (tenant_id, email)
);
```

### `tenant_config` (feature flags y configuración por tenant)
```sql
CREATE TABLE tenant_config (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id    UUID NOT NULL REFERENCES tenants(id),
    clave        VARCHAR(100) NOT NULL,       -- Ej: 'ff_centro_costo', 'codigo_separador'
    valor        TEXT NOT NULL,
    updated_at   TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (tenant_id, clave)
);
```

### `grupos`
```sql
CREATE TABLE grupos (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id),
    codigo      VARCHAR(20) NOT NULL,
    nombre      VARCHAR(100) NOT NULL,
    deleted_at  TIMESTAMPTZ,
    UNIQUE (tenant_id, codigo)
);
```

### `clases`
```sql
CREATE TABLE clases (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id            UUID NOT NULL REFERENCES tenants(id),
    grupo_id             UUID NOT NULL REFERENCES grupos(id),
    codigo               VARCHAR(20) NOT NULL,
    nombre               VARCHAR(100) NOT NULL,
    tasa_depreciacion    DECIMAL(5,4),             -- Predeterminada; puede sobrescribirse por activo
    deleted_at           TIMESTAMPTZ,
    UNIQUE (tenant_id, grupo_id, codigo)
);
```

### `sucursales`
```sql
CREATE TABLE sucursales (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id),
    codigo      VARCHAR(20) NOT NULL,
    nombre      VARCHAR(100) NOT NULL,
    parent_id   UUID REFERENCES sucursales(id),  -- Jerarquía hasta 3 niveles
    nivel       INT NOT NULL DEFAULT 1 CHECK (nivel BETWEEN 1 AND 3),
    deleted_at  TIMESTAMPTZ,
    UNIQUE (tenant_id, codigo)
);
```

### `rubros_contables`
```sql
CREATE TABLE rubros_contables (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id     UUID NOT NULL REFERENCES tenants(id),
    codigo        VARCHAR(50) NOT NULL,
    nombre        VARCHAR(200) NOT NULL,
    origen        VARCHAR(20) NOT NULL CHECK (origen IN ('manual','finansys')),
    finansys_id   VARCHAR(100),
    activo        BOOLEAN DEFAULT TRUE,
    deleted_at    TIMESTAMPTZ,
    UNIQUE (tenant_id, codigo)
);
```

### `activos` (entidad raíz)
```sql
CREATE TABLE activos (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id            UUID NOT NULL REFERENCES tenants(id),
    codigo               VARCHAR(100) NOT NULL,         -- Código compuesto. INMUTABLE.
    nombre               VARCHAR(200) NOT NULL,
    grupo_id             UUID NOT NULL REFERENCES grupos(id),
    clase_id             UUID NOT NULL REFERENCES clases(id),
    rubro_contable_id    UUID REFERENCES rubros_contables(id),
    sucursal_id          UUID REFERENCES sucursales(id),
    marca                VARCHAR(100),
    modelo               VARCHAR(100),
    numero_serie         VARCHAR(100),
    fecha_compra         DATE,
    valor_adquisicion    DECIMAL(15,2) NOT NULL CHECK (valor_adquisicion > 0),
    vida_util_meses      INT NOT NULL CHECK (vida_util_meses >= 12),
    valor_residual       DECIMAL(15,2) DEFAULT 0,
    foto_url             TEXT,
    qr_url               TEXT,
    centro_costo_id      UUID,                          -- Feature flag: inactivo al arranque
    estado               VARCHAR(30) DEFAULT 'activo'
                         CHECK (estado IN ('activo','en_mantenimiento','dado_de_baja')),
    deleted_at           TIMESTAMPTZ,
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (tenant_id, codigo)
);
```

### `asignaciones`
```sql
CREATE TABLE asignaciones (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id            UUID NOT NULL REFERENCES tenants(id),
    activo_id            UUID NOT NULL REFERENCES activos(id),
    responsable_nombre   VARCHAR(200) NOT NULL,
    responsable_codigo   VARCHAR(50),
    sucursal_id          UUID REFERENCES sucursales(id),
    vigente              BOOLEAN DEFAULT TRUE,
    fecha_inicio         DATE NOT NULL,
    fecha_fin            DATE,
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    -- Solo una asignación vigente por activo
    UNIQUE (activo_id, vigente) DEFERRABLE INITIALLY DEFERRED
);
```

### `jornadas`
```sql
CREATE TABLE jornadas (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    nombre          VARCHAR(200) NOT NULL,
    sucursal_ids    UUID[] NOT NULL,
    relevador_ids   UUID[],
    estado          VARCHAR(30) DEFAULT 'pendiente'
                    CHECK (estado IN ('pendiente','en_progreso','cerrada')),
    fecha_inicio    DATE,
    fecha_cierre    DATE,
    created_by      UUID REFERENCES usuarios(id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### `items_jornada`
```sql
CREATE TABLE items_jornada (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    jornada_id      UUID NOT NULL REFERENCES jornadas(id),
    activo_id       UUID NOT NULL REFERENCES activos(id),
    estado          VARCHAR(30) DEFAULT 'pendiente'
                    CHECK (estado IN ('pendiente','encontrado','no_encontrado','con_incidencia')),
    foto_url        TEXT,
    escaneado_by    UUID REFERENCES usuarios(id),
    escaneado_at    TIMESTAMPTZ,
    UNIQUE (jornada_id, activo_id)
);
```

### `incidencias`
```sql
CREATE TABLE incidencias (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id        UUID NOT NULL REFERENCES tenants(id),
    activo_id        UUID NOT NULL REFERENCES activos(id),
    jornada_id       UUID REFERENCES jornadas(id),
    tipo             VARCHAR(100) NOT NULL,
    descripcion      TEXT,
    foto_url         TEXT,
    estado           VARCHAR(30) DEFAULT 'abierta'
                     CHECK (estado IN ('abierta','en_gestion','resuelta','cerrada')),
    responsable_id   UUID REFERENCES usuarios(id),
    created_by       UUID REFERENCES usuarios(id),
    created_at       TIMESTAMPTZ DEFAULT NOW()
);
```

### `transferencias`
```sql
CREATE TABLE transferencias (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id               UUID NOT NULL REFERENCES tenants(id),
    activo_id               UUID NOT NULL REFERENCES activos(id),
    sucursal_origen_id      UUID REFERENCES sucursales(id),
    sucursal_destino_id     UUID REFERENCES sucursales(id),
    responsable_origen      VARCHAR(200) NOT NULL,
    responsable_destino     VARCHAR(200) NOT NULL,
    motivo                  TEXT,
    estado                  VARCHAR(30) DEFAULT 'pendiente_aprobacion'
                            CHECK (estado IN ('pendiente_aprobacion','aprobada','rechazada')),
    aprobado_by             UUID REFERENCES usuarios(id),
    aprobado_at             TIMESTAMPTZ,
    created_by              UUID REFERENCES usuarios(id),
    created_at              TIMESTAMPTZ DEFAULT NOW()
);
```

### `dispositivos`
```sql
CREATE TABLE dispositivos (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id        UUID NOT NULL REFERENCES tenants(id),
    nombre           VARCHAR(100) NOT NULL,
    tipo             VARCHAR(50) NOT NULL CHECK (tipo IN ('impresora_etiquetas','movil_relevador')),
    modelo           VARCHAR(100),                      -- Ej: "Brother P950NW"
    ip_address       VARCHAR(45),
    estado_conexion  VARCHAR(20) DEFAULT 'desconocido'
                     CHECK (estado_conexion IN ('online','offline','desconocido')),
    ultimo_ping      TIMESTAMPTZ,
    config           JSONB DEFAULT '{}',
    deleted_at       TIMESTAMPTZ,
    created_at       TIMESTAMPTZ DEFAULT NOW()
);
```

### `audit_logs` (append-only — NUNCA modificar)
```sql
CREATE TABLE audit_logs (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id        UUID NOT NULL REFERENCES tenants(id),
    usuario_id       UUID REFERENCES usuarios(id),
    accion           VARCHAR(100) NOT NULL,           -- Ej: "activo.crear"
    entidad          VARCHAR(100) NOT NULL,
    entidad_id       UUID,
    payload_before   JSONB,
    payload_after    JSONB,
    ip_address       VARCHAR(45),
    created_at       TIMESTAMPTZ DEFAULT NOW()
    -- Sin updated_at ni deleted_at — es append-only
);
```

### `depreciacion_historial`
```sql
CREATE TABLE depreciacion_historial (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id),
    activo_id           UUID NOT NULL REFERENCES activos(id),
    periodo             DATE NOT NULL,                -- Primer día del mes del cálculo
    dep_mensual         DECIMAL(15,2) NOT NULL,
    dep_acumulada       DECIMAL(15,2) NOT NULL,
    valor_libro         DECIMAL(15,2) NOT NULL,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (activo_id, periodo)
);
```

---

## Vista de KPIs (para Dashboard)

```sql
CREATE OR REPLACE VIEW v_activos_kpis AS
SELECT
    a.tenant_id,
    COUNT(*) FILTER (WHERE a.deleted_at IS NULL AND a.estado = 'activo') AS total_activos,
    COUNT(*) FILTER (WHERE a.deleted_at IS NOT NULL OR a.estado = 'dado_de_baja') AS dados_de_baja,
    SUM(a.valor_adquisicion) FILTER (WHERE a.deleted_at IS NULL) AS valor_total_adquisicion,
    COUNT(DISTINCT a.sucursal_id) AS sucursales_con_activos
FROM activos a
GROUP BY a.tenant_id;
```

---

## Datos de seed iniciales (Banco Continental)

```sql
-- Tenant
INSERT INTO tenants (id, nombre) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Banco Continental S.A.');

-- Sysadmin CLT
INSERT INTO usuarios (tenant_id, email, nombre_completo, rol) VALUES
  ('00000000-0000-0000-0000-000000000001',
   'giovanni.caceres@clt.com.py', 'Giovanni Cáceres', 'sysadmin_clt');

-- Feature flags iniciales
INSERT INTO tenant_config (tenant_id, clave, valor) VALUES
  ('00000000-0000-0000-0000-000000000001', 'ff_centro_costo', 'false'),
  ('00000000-0000-0000-0000-000000000001', 'ff_transferencia_requiere_aprobacion', 'true'),
  ('00000000-0000-0000-0000-000000000001', 'codigo_separador', '-'),
  ('00000000-0000-0000-0000-000000000001', 'alerta_dias_sin_auditar', '180');
```
