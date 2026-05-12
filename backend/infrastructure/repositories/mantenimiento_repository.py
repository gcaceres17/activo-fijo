"""PostgreSQL implementation of MantenimientoRepositoryPort."""
from __future__ import annotations
from decimal import Decimal
from typing import List, Optional, Tuple
from uuid import UUID

import asyncpg
from domain.entities import Mantenimiento
from domain.ports import MantenimientoRepositoryPort


def _row_to_mnt(row: asyncpg.Record) -> Mantenimiento:
    return Mantenimiento(
        id=row["id"], tenant_id=row["tenant_id"], activo_id=row["activo_id"],
        tipo=row["tipo"], descripcion=row["descripcion"], tecnico=row["tecnico"],
        fecha_inicio=row["fecha_inicio"], estado=row["estado"],
        proveedor=row["proveedor"], fecha_estimada_fin=row["fecha_estimada_fin"],
        fecha_fin_real=row["fecha_fin_real"], costo=Decimal(str(row["costo"])),
        created_at=row["created_at"], updated_at=row["updated_at"],
    )


class PostgreSQLMantenimientoRepository(MantenimientoRepositoryPort):
    def __init__(self, pool: asyncpg.Pool) -> None:
        self._pool = pool

    async def list_by_activo(self, activo_id: UUID, tenant_id: UUID) -> List[Mantenimiento]:
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT * FROM public.mantenimientos WHERE activo_id=$1 AND tenant_id=$2 ORDER BY fecha_inicio DESC",
                activo_id, tenant_id
            )
        return [_row_to_mnt(r) for r in rows]

    async def list(self, tenant_id: UUID, *, estado=None, activo_id=None, page=1, page_size=20) -> Tuple[List[Mantenimiento], int]:
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
            count = await conn.fetchval(f"SELECT COUNT(*) FROM public.mantenimientos WHERE {where}", *params)
            rows = await conn.fetch(
                f"SELECT * FROM public.mantenimientos WHERE {where} ORDER BY fecha_inicio DESC LIMIT ${n} OFFSET ${n+1}",
                *params, page_size, offset
            )
        return [_row_to_mnt(r) for r in rows], count

    async def get_by_id(self, id: UUID, tenant_id: UUID) -> Optional[Mantenimiento]:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM public.mantenimientos WHERE id=$1 AND tenant_id=$2", id, tenant_id
            )
        return _row_to_mnt(row) if row else None

    async def create(self, mnt: Mantenimiento) -> Mantenimiento:
        async with self._pool.acquire() as conn:
            await conn.execute(
                """INSERT INTO public.mantenimientos
                   (id,tenant_id,activo_id,tipo,descripcion,tecnico,proveedor,
                    fecha_inicio,fecha_estimada_fin,fecha_fin_real,costo,estado,created_at,updated_at)
                   VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)""",
                mnt.id, mnt.tenant_id, mnt.activo_id, mnt.tipo, mnt.descripcion,
                mnt.tecnico, mnt.proveedor, mnt.fecha_inicio, mnt.fecha_estimada_fin,
                mnt.fecha_fin_real, float(mnt.costo), mnt.estado, mnt.created_at, mnt.updated_at,
            )
        return mnt

    async def update(self, mnt: Mantenimiento) -> Mantenimiento:
        async with self._pool.acquire() as conn:
            await conn.execute(
                """UPDATE public.mantenimientos SET
                   descripcion=$3, tecnico=$4, proveedor=$5, fecha_inicio=$6,
                   fecha_estimada_fin=$7, fecha_fin_real=$8, costo=$9, estado=$10, updated_at=$11
                   WHERE id=$1 AND tenant_id=$2""",
                mnt.id, mnt.tenant_id, mnt.descripcion, mnt.tecnico, mnt.proveedor,
                mnt.fecha_inicio, mnt.fecha_estimada_fin, mnt.fecha_fin_real,
                float(mnt.costo), mnt.estado, mnt.updated_at,
            )
        return mnt
