"""PostgreSQL implementation of ClaseRepositoryPort."""
from __future__ import annotations
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

import asyncpg
from domain.entities import Clase
from domain.ports import ClaseRepositoryPort


def _row_to_clase(row: asyncpg.Record) -> Clase:
    return Clase(
        id=row["id"],
        tenant_id=row["tenant_id"],
        grupo_id=row["grupo_id"],
        codigo=row["codigo"],
        nombre=row["nombre"],
        tasa_depreciacion=Decimal(str(row["tasa_depreciacion"])) if row.get("tasa_depreciacion") else None,
        deleted_at=row.get("deleted_at"),
    )


class PostgreSQLClaseRepository(ClaseRepositoryPort):
    def __init__(self, pool: asyncpg.Pool) -> None:
        self._pool = pool

    async def list(self, tenant_id: UUID, *, grupo_id: Optional[UUID] = None) -> List[Clase]:
        if grupo_id:
            sql = "SELECT * FROM public.clases WHERE tenant_id=$1 AND grupo_id=$2 AND deleted_at IS NULL ORDER BY codigo"
            args = (tenant_id, grupo_id)
        else:
            sql = "SELECT * FROM public.clases WHERE tenant_id=$1 AND deleted_at IS NULL ORDER BY codigo"
            args = (tenant_id,)
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(sql, *args)
            return [_row_to_clase(r) for r in rows]

    async def get_by_id(self, id: UUID, tenant_id: UUID) -> Optional[Clase]:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM public.clases WHERE id=$1 AND tenant_id=$2 AND deleted_at IS NULL",
                id, tenant_id,
            )
            return _row_to_clase(row) if row else None

    async def get_by_codigo(self, codigo: str, tenant_id: UUID) -> Optional[Clase]:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM public.clases WHERE codigo=$1 AND tenant_id=$2 AND deleted_at IS NULL",
                codigo, tenant_id,
            )
            return _row_to_clase(row) if row else None

    async def create(self, clase: Clase) -> Clase:
        async with self._pool.acquire() as conn:
            await conn.execute(
                """INSERT INTO public.clases (id, tenant_id, grupo_id, codigo, nombre, tasa_depreciacion)
                   VALUES ($1,$2,$3,$4,$5,$6)""",
                clase.id, clase.tenant_id, clase.grupo_id, clase.codigo, clase.nombre,
                float(clase.tasa_depreciacion) if clase.tasa_depreciacion is not None else None,
            )
        return clase

    async def update(self, clase: Clase) -> Clase:
        async with self._pool.acquire() as conn:
            await conn.execute(
                """UPDATE public.clases SET grupo_id=$3, codigo=$4, nombre=$5, tasa_depreciacion=$6
                   WHERE id=$1 AND tenant_id=$2""",
                clase.id, clase.tenant_id, clase.grupo_id, clase.codigo, clase.nombre,
                float(clase.tasa_depreciacion) if clase.tasa_depreciacion is not None else None,
            )
        return clase

    async def soft_delete(self, id: UUID, tenant_id: UUID) -> None:
        async with self._pool.acquire() as conn:
            await conn.execute(
                "UPDATE public.clases SET deleted_at=NOW() WHERE id=$1 AND tenant_id=$2",
                id, tenant_id,
            )
