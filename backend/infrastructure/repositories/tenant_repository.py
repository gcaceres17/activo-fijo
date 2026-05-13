"""PostgreSQL implementations for TenantSettings and TenantFeatures."""
from __future__ import annotations
from decimal import Decimal
from typing import List
from uuid import UUID

import asyncpg
from domain.entities import TenantSettings, TenantFeature
from domain.ports import TenantSettingsRepositoryPort, TenantFeaturesRepositoryPort


class PostgreSQLTenantSettingsRepository(TenantSettingsRepositoryPort):
    def __init__(self, pool: asyncpg.Pool) -> None:
        self._pool = pool

    async def get(self, tenant_id: UUID) -> TenantSettings:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM public.tenant_settings WHERE tenant_id=$1", tenant_id
            )
        if row:
            return TenantSettings(
                tenant_id=row["tenant_id"],
                logo_url=row.get("logo_url"),
                moneda=row["moneda"],
                zona_horaria=row["zona_horaria"],
                ano_fiscal_inicio=row["ano_fiscal_inicio"],
                vida_util_default_meses=row["vida_util_default_meses"],
                valor_residual_pct=row["valor_residual_pct"],
                prefijo_activo=row["prefijo_activo"],
                updated_at=row["updated_at"],
            )
        # Devuelve defaults si no existe aún
        return TenantSettings(tenant_id=tenant_id)

    async def upsert(self, s: TenantSettings) -> TenantSettings:
        async with self._pool.acquire() as conn:
            await conn.execute(
                """INSERT INTO public.tenant_settings
                   (tenant_id, logo_url, moneda, zona_horaria, ano_fiscal_inicio,
                    vida_util_default_meses, valor_residual_pct, prefijo_activo)
                   VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
                   ON CONFLICT (tenant_id) DO UPDATE SET
                   logo_url=$2, moneda=$3, zona_horaria=$4,
                   ano_fiscal_inicio=$5, vida_util_default_meses=$6,
                   valor_residual_pct=$7, prefijo_activo=$8""",
                s.tenant_id, s.logo_url, s.moneda, s.zona_horaria,
                s.ano_fiscal_inicio, s.vida_util_default_meses,
                s.valor_residual_pct, s.prefijo_activo,
            )
        return s


class PostgreSQLTenantFeaturesRepository(TenantFeaturesRepositoryPort):
    def __init__(self, pool: asyncpg.Pool) -> None:
        self._pool = pool

    async def list(self, tenant_id: UUID) -> List[TenantFeature]:
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT * FROM public.tenant_features WHERE tenant_id=$1", tenant_id
            )
        return [TenantFeature(tenant_id=r["tenant_id"], feature=r["feature"], habilitado=r["habilitado"]) for r in rows]

    async def upsert(self, f: TenantFeature) -> TenantFeature:
        async with self._pool.acquire() as conn:
            await conn.execute(
                """INSERT INTO public.tenant_features (tenant_id, feature, habilitado)
                   VALUES ($1,$2,$3)
                   ON CONFLICT (tenant_id, feature) DO UPDATE SET habilitado=$3""",
                f.tenant_id, f.feature, f.habilitado,
            )
        return f
