-- ============================================================
-- Migration 002: Tablas base (tenants, usuarios, categorias, centros_costo)
-- ============================================================

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
                     CHECK (rol IN ('admin','operador','auditor')),
    activo           BOOLEAN DEFAULT TRUE NOT NULL,
    ultimo_login     TIMESTAMPTZ,
    created_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE (tenant_id, email)
);
CREATE INDEX idx_usuarios_tenant ON public.usuarios(tenant_id);
CREATE INDEX idx_usuarios_email  ON public.usuarios(email);
CREATE TRIGGER usuarios_updated_at BEFORE UPDATE ON public.usuarios
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

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
CREATE TRIGGER categorias_updated_at BEFORE UPDATE ON public.categorias
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

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
CREATE TRIGGER centros_costo_updated_at BEFORE UPDATE ON public.centros_costo
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
