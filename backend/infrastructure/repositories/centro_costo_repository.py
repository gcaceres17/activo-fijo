from __future__ import annotations
from typing import List, Optional
from uuid import UUID
import asyncpg
from domain.entities import CentroCosto
from domain.ports import CentroCostoRepositoryPort


def _row(r: asyncpg.Record) -> CentroCosto:
    return CentroCosto(id=r["id"], tenant_id=r["tenant_id"], codigo=r["codigo"],
                       nombre=r["nombre"], created_at=r["created_at"], updated_at=r["updated_at"])


class PostgreSQLCentroCostoRepository(CentroCostoRepositoryPort):
    def __init__(self, pool: asyncpg.Pool) -> None:
        self._pool = pool

    async def list(self, tenant_id: UUID) -> List[CentroCosto]:
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT * FROM public.centros_costo WHERE tenant_id=$1 AND deleted_at IS NULL ORDER BY codigo",
                tenant_id)
        return [_row(r) for r in rows]

    async def get_by_id(self, id: UUID, tenant_id: UUID) -> Optional[CentroCosto]:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM public.centros_costo WHERE id=$1 AND tenant_id=$2 AND deleted_at IS NULL",
                id, tenant_id)
        return _row(row) if row else None

    async def create(self, cc: CentroCosto) -> CentroCosto:
        async with self._pool.acquire() as conn:
            await conn.execute(
                "INSERT INTO public.centros_costo (id,tenant_id,codigo,nombre,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6)",
                cc.id, cc.tenant_id, cc.codigo, cc.nombre, cc.created_at, cc.updated_at)
        return cc

    async def update(self, cc: CentroCosto) -> CentroCosto:
        async with self._pool.acquire() as conn:
            await conn.execute(
                "UPDATE public.centros_costo SET codigo=$3,nombre=$4,updated_at=NOW() WHERE id=$1 AND tenant_id=$2",
                cc.id, cc.tenant_id, cc.codigo, cc.nombre)
        return cc
