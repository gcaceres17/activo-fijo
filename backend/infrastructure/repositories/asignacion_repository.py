"""PostgreSQL implementation of AsignacionRepositoryPort."""
from __future__ import annotations
from datetime import date, datetime
from typing import List, Optional, Tuple
from uuid import UUID

import asyncpg
from domain.entities import Asignacion
from domain.ports import AsignacionRepositoryPort


def _row_to_asignacion(row: asyncpg.Record) -> Asignacion:
    return Asignacion(
        id=row["id"], tenant_id=row["tenant_id"], activo_id=row["activo_id"],
        empleado_nombre=row["empleado_nombre"], area=row["area"],
        fecha_asignacion=row["fecha_asignacion"], estado=row["estado"],
        empleado_cedula=row["empleado_cedula"], centro_costo_id=row["centro_costo_id"],
        fecha_baja=row["fecha_baja"], observaciones=row["observaciones"],
        created_at=row["created_at"], updated_at=row["updated_at"],
    )


class PostgreSQLAsignacionRepository(AsignacionRepositoryPort):
    def __init__(self, pool: asyncpg.Pool) -> None:
        self._pool = pool

    async def get_vigente_by_activo(self, activo_id: UUID, tenant_id: UUID) -> Optional[Asignacion]:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM public.asignaciones WHERE activo_id=$1 AND tenant_id=$2 AND estado='vigente'",
                activo_id, tenant_id
            )
            return _row_to_asignacion(row) if row else None

    async def list_by_activo(self, activo_id: UUID, tenant_id: UUID) -> List[Asignacion]:
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT * FROM public.asignaciones WHERE activo_id=$1 AND tenant_id=$2 ORDER BY created_at DESC",
                activo_id, tenant_id
            )
            return [_row_to_asignacion(r) for r in rows]

    async def list(self, tenant_id: UUID, *, estado=None, activo_id=None, page=1, page_size=20) -> Tuple[List[Asignacion], int]:
        conditions = ["tenant_id=$1"]
        params: list = [tenant_id]
        n = 2
        if estado:
            conditions.append(f"estado=${n}"); params.append(estado); n += 1
        if activo_id:
            conditions.append(f"activo_id=${n}"); params.append(activo_id); n += 1
        where = " AND ".join(conditions)
        offset = (page - 1) * page_size
        async with self._pool.acquire() as conn:
            count = await conn.fetchval(f"SELECT COUNT(*) FROM public.asignaciones WHERE {where}", *params)
            rows = await conn.fetch(
                f"SELECT * FROM public.asignaciones WHERE {where} ORDER BY created_at DESC LIMIT ${n} OFFSET ${n+1}",
                *params, page_size, offset
            )
        return [_row_to_asignacion(r) for r in rows], count

    async def create(self, asig: Asignacion) -> Asignacion:
        async with self._pool.acquire() as conn:
            await conn.execute(
                """INSERT INTO public.asignaciones
                   (id,tenant_id,activo_id,empleado_nombre,empleado_cedula,area,centro_costo_id,
                    fecha_asignacion,fecha_baja,observaciones,estado,created_at,updated_at)
                   VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)""",
                asig.id, asig.tenant_id, asig.activo_id, asig.empleado_nombre,
                asig.empleado_cedula, asig.area, asig.centro_costo_id,
                asig.fecha_asignacion, asig.fecha_baja, asig.observaciones,
                asig.estado, asig.created_at, asig.updated_at,
            )
        return asig

    async def dar_de_baja(self, id: UUID, tenant_id: UUID, fecha_baja: Optional[date] = None) -> Asignacion:
        fb = fecha_baja or date.today()
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                """UPDATE public.asignaciones SET estado='baja', fecha_baja=$3, updated_at=NOW()
                   WHERE id=$1 AND tenant_id=$2 RETURNING *""",
                id, tenant_id, fb
            )
        return _row_to_asignacion(row)
