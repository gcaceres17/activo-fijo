"""PostgreSQL implementation of RubroContableRepositoryPort."""
from __future__ import annotations
from typing import List, Optional
from uuid import UUID

import asyncpg
from domain.entities import RubroContable
from domain.ports import RubroContableRepositoryPort


def _row_to_rubro(row: asyncpg.Record) -> RubroContable:
    return RubroContable(
        id=row["id"],
        tenant_id=row["tenant_id"],
        codigo=row["codigo"],
        nombre=row["nombre"],
        origen=row["origen"],
        finansys_id=row.get("finansys_id"),
        activo=row["activo"],
        deleted_at=row.get("deleted_at"),
    )


class PostgreSQLRubroContableRepository(RubroContableRepositoryPort):
    def __init__(self, pool: asyncpg.Pool) -> None:
        self._pool = pool

    async def list(self, tenant_id: UUID, *, solo_activos: bool = True) -> List[RubroContable]:
        sql = "SELECT * FROM public.rubros_contables WHERE tenant_id=$1 AND deleted_at IS NULL"
        if solo_activos:
            sql += " AND activo=TRUE"
        sql += " ORDER BY codigo"
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(sql, tenant_id)
            return [_row_to_rubro(r) for r in rows]

    async def get_by_id(self, id: UUID, tenant_id: UUID) -> Optional[RubroContable]:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM public.rubros_contables WHERE id=$1 AND tenant_id=$2 AND deleted_at IS NULL",
                id, tenant_id,
            )
            return _row_to_rubro(row) if row else None

    async def get_by_codigo(self, codigo: str, tenant_id: UUID) -> Optional[RubroContable]:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM public.rubros_contables WHERE codigo=$1 AND tenant_id=$2 AND deleted_at IS NULL",
                codigo, tenant_id,
            )
            return _row_to_rubro(row) if row else None

    async def create(self, rubro: RubroContable) -> RubroContable:
        async with self._pool.acquire() as conn:
            await conn.execute(
                """INSERT INTO public.rubros_contables
                   (id, tenant_id, codigo, nombre, origen, finansys_id, activo)
                   VALUES ($1,$2,$3,$4,$5,$6,$7)""",
                rubro.id, rubro.tenant_id, rubro.codigo, rubro.nombre,
                rubro.origen, rubro.finansys_id, rubro.activo,
            )
        return rubro

    async def update(self, rubro: RubroContable) -> RubroContable:
        async with self._pool.acquire() as conn:
            await conn.execute(
                """UPDATE public.rubros_contables
                   SET codigo=$3, nombre=$4, origen=$5, finansys_id=$6, activo=$7
                   WHERE id=$1 AND tenant_id=$2""",
                rubro.id, rubro.tenant_id, rubro.codigo, rubro.nombre,
                rubro.origen, rubro.finansys_id, rubro.activo,
            )
        return rubro

    async def soft_delete(self, id: UUID, tenant_id: UUID) -> None:
        async with self._pool.acquire() as conn:
            await conn.execute(
                "UPDATE public.rubros_contables SET deleted_at=NOW() WHERE id=$1 AND tenant_id=$2",
                id, tenant_id,
            )
