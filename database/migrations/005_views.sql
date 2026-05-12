-- ============================================================
-- Migration 005: Vistas para KPIs y reportes
-- ============================================================

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
                * LEAST(
                    EXTRACT(YEAR FROM AGE(CURRENT_DATE, fecha_compra))::INTEGER,
                    vida_util_años
                ),
                valor_adquisicion - valor_residual
            )
        END
    ) FILTER (WHERE deleted_at IS NULL), 0)                                    AS depreciacion_acumulada_total
FROM public.activos
GROUP BY tenant_id;
