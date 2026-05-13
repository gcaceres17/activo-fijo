"""PostgreSQL implementation of SucursalRepositoryPort."""
from __future__ import annotations
from typing import List, Optional
from uuid import UUID

import asyncpg
from domain.entities import Sucursal
from domain.ports import SucursalRepositoryPort


def _row_to_sucursal(row: asyncpg.Record) -> Sucursal:
    return Sucursal(
        id=row["id"],
        tenant_id=row["tenant_id"],
        codigo=row["codigo"],
        nombre=row["nombre"],
        nivel=row["nivel"],
        parent_id=row.get("parent_id"),
        deleted_at=row.get("deleted_at"),
    )


class PostgreSQLSucursalRepository(SucursalRepositoryPort):
    def __init__(self, pool: asyncpg.Pool) -> None:
        self._pool = pool

    async def list(self, tenant_id: UUID) -> List[Sucursal]:
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT * FROM public.sucursales WHERE tenant_id=$1 AND deleted_at IS NULL ORDER BY nivel, codigo",
                tenant_id,
            )
            return [_row_to_sucursal(r) for r in rows]

    async def get_by_id(self, id: UUID, tenant_id: UUID) -> Optional[Sucursal]:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM public.sucursales WHERE id=$1 AND tenant_id=$2 AND deleted_at IS NULL",
                id, tenant_id,
            )
            return _row_to_sucursal(row) if row else None

    async def create(self, sucursal: Sucursal) -> Sucursal:
        async with self._pool.acquire() as conn:
            await conn.execute(
                """INSERT INTO public.sucursales (id, tenant_id, codigo, nombre, nivel, parent_id)
                   VALUES ($1,$2,$3,$4,$5,$6)""",
                sucursal.id, sucursal.tenant_id, sucursal.codigo, sucursal.nombre,
                sucursal.nivel, sucursal.parent_id,
            )
        return sucursal

    async def update(self, sucursal: Sucursal) -> Sucursal:
        async with self._pool.acquire() as conn:
            await conn.execute(
                """UPDATE public.sucursales SET codigo=$3, nombre=$4, nivel=$5, parent_id=$6
                   WHERE id=$1 AND tenant_id=$2""",
                sucursal.id, sucursal.tenant_id, sucursal.codigo, sucursal.nombre,
                sucursal.nivel, sucursal.parent_id,
            )
        return sucursal

    async def soft_delete(self, id: UUID, tenant_id: UUID) -> None:
        async with self._pool.acquire() as conn:
            await conn.execute(
                "UPDATE public.sucursales SET deleted_at=NOW() WHERE id=$1 AND tenant_id=$2",
                id, tenant_id,
            )
