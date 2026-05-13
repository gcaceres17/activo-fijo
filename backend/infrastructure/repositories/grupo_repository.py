"""PostgreSQL implementation of GrupoRepositoryPort."""
from __future__ import annotations
from typing import List, Optional
from uuid import UUID

import asyncpg
from domain.entities import Grupo
from domain.ports import GrupoRepositoryPort


def _row_to_grupo(row: asyncpg.Record) -> Grupo:
    return Grupo(
        id=row["id"],
        tenant_id=row["tenant_id"],
        codigo=row["codigo"],
        nombre=row["nombre"],
        deleted_at=row.get("deleted_at"),
    )


class PostgreSQLGrupoRepository(GrupoRepositoryPort):
    def __init__(self, pool: asyncpg.Pool) -> None:
        self._pool = pool

    async def list(self, tenant_id: UUID) -> List[Grupo]:
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT * FROM public.grupos WHERE tenant_id=$1 AND deleted_at IS NULL ORDER BY codigo",
                tenant_id,
            )
            return [_row_to_grupo(r) for r in rows]

    async def get_by_id(self, id: UUID, tenant_id: UUID) -> Optional[Grupo]:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM public.grupos WHERE id=$1 AND tenant_id=$2 AND deleted_at IS NULL",
                id, tenant_id,
            )
            return _row_to_grupo(row) if row else None

    async def get_by_codigo(self, codigo: str, tenant_id: UUID) -> Optional[Grupo]:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM public.grupos WHERE codigo=$1 AND tenant_id=$2 AND deleted_at IS NULL",
                codigo, tenant_id,
            )
            return _row_to_grupo(row) if row else None

    async def create(self, grupo: Grupo) -> Grupo:
        async with self._pool.acquire() as conn:
            await conn.execute(
                "INSERT INTO public.grupos (id, tenant_id, codigo, nombre) VALUES ($1,$2,$3,$4)",
                grupo.id, grupo.tenant_id, grupo.codigo, grupo.nombre,
            )
        return grupo

    async def update(self, grupo: Grupo) -> Grupo:
        async with self._pool.acquire() as conn:
            await conn.execute(
                "UPDATE public.grupos SET codigo=$3, nombre=$4 WHERE id=$1 AND tenant_id=$2",
                grupo.id, grupo.tenant_id, grupo.codigo, grupo.nombre,
            )
        return grupo

    async def soft_delete(self, id: UUID, tenant_id: UUID) -> None:
        async with self._pool.acquire() as conn:
            await conn.execute(
                "UPDATE public.grupos SET deleted_at=NOW() WHERE id=$1 AND tenant_id=$2",
                id, tenant_id,
            )
