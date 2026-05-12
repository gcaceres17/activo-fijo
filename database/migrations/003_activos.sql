-- ============================================================
-- Migration 003: Tabla activos + secuencia de códigos
-- ============================================================

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
    CONSTRAINT activos_residual_check CHECK (valor_residual <= valor_adquisicion)
);

CREATE INDEX idx_activos_tenant       ON public.activos(tenant_id);
CREATE INDEX idx_activos_categoria    ON public.activos(categoria_id);
CREATE INDEX idx_activos_centro_costo ON public.activos(centro_costo_id);
CREATE INDEX idx_activos_estado       ON public.activos(estado);
CREATE INDEX idx_activos_area         ON public.activos(area);
CREATE INDEX idx_activos_deleted      ON public.activos(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_activos_search       ON public.activos
    USING gin(to_tsvector('spanish', coalesce(nombre,'') || ' ' || coalesce(codigo,'')));

CREATE TRIGGER activos_updated_at BEFORE UPDATE ON public.activos
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Secuencia para código automático por tenant
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
