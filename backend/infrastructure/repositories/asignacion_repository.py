"""PostgreSQL implementation of AsignacionRepositoryPort."""
from __future__ import annotations
from datetime import date
from typing import List, Optional, Tuple
from uuid import UUID

import asyncpg
from domain.entities import Asignacion
from domain.ports import AsignacionRepositoryPort


def _row_to_asignacion(row: asyncpg.Record) -> Asignacion:
    return Asignacion(
        id=row["id"],
        tenant_id=row["tenant_id"],
        activo_id=row["activo_id"],
        responsable_nombre=row["responsable_nombre"],
        sucursal_id=row["sucursal_id"],
        fecha_inicio=row["fecha_inicio"],
        vigente=row["vigente"],
        responsable_codigo=row.get("responsable_codigo"),
        fecha_fin=row.get("fecha_fin"),
        created_at=row["created_at"],
    )


class PostgreSQLAsignacionRepository(AsignacionRepositoryPort):
    def __init__(self, pool: asyncpg.Pool) -> None:
        self._pool = pool

    async def get_vigente_by_activo(self, activo_id: UUID, tenant_id: UUID) -> Optional[Asignacion]:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM public.asignaciones WHERE activo_id=$1 AND tenant_id=$2 AND vigente=TRUE",
                activo_id, tenant_id,
            )
            return _row_to_asignacion(row) if row else None

    async def list_by_activo(self, activo_id: UUID, tenant_id: UUID) -> List[Asignacion]:
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT * FROM public.asignaciones WHERE activo_id=$1 AND tenant_id=$2 ORDER BY created_at DESC",
                activo_id, tenant_id,
            )
            return [_row_to_asignacion(r) for r in rows]

    async def list(
        self,
        tenant_id: UUID,
        *,
        activo_id: Optional[UUID] = None,
        sucursal_id: Optional[UUID] = None,
        solo_vigentes: bool = False,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[Asignacion], int]:
        conditions = ["tenant_id=$1"]
        params: list = [tenant_id]
        n = 2

        if activo_id:
            conditions.append(f"activo_id=${n}"); params.append(activo_id); n += 1
        if sucursal_id:
            conditions.append(f"sucursal_id=${n}"); params.append(sucursal_id); n += 1
        if solo_vigentes:
            conditions.append("vigente=TRUE")

        where = " AND ".join(conditions)
        offset = (page - 1) * page_size

        async with self._pool.acquire() as conn:
            total = await conn.fetchval(
                f"SELECT COUNT(*) FROM public.asignaciones WHERE {where}", *params
            )
            rows = await conn.fetch(
                f"SELECT * FROM public.asignaciones WHERE {where} ORDER BY created_at DESC LIMIT ${n} OFFSET ${n+1}",
                *params, page_size, offset,
            )
        return [_row_to_asignacion(r) for r in rows], total

    async def create(self, asig: Asignacion) -> Asignacion:
        async with self._pool.acquire() as conn:
            await conn.execute(
                """INSERT INTO public.asignaciones
                   (id, tenant_id, activo_id, responsable_nombre, responsable_codigo,
                    sucursal_id, fecha_inicio, fecha_fin, vigente, created_at)
                   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)""",
                asig.id, asig.tenant_id, asig.activo_id,
                asig.responsable_nombre, asig.responsable_codigo,
                asig.sucursal_id, asig.fecha_inicio, asig.fecha_fin,
                asig.vigente, asig.created_at,
            )
        return asig

    async def dar_de_baja(
        self, id: UUID, tenant_id: UUID, fecha_fin: Optional[date] = None
    ) -> Asignacion:
        fb = fecha_fin or date.today()
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                """UPDATE public.asignaciones SET vigente=FALSE, fecha_fin=$3
                   WHERE id=$1 AND tenant_id=$2 RETURNING *""",
                id, tenant_id, fb,
            )
        return _row_to_asignacion(row)
