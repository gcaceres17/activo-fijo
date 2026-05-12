from __future__ import annotations
from datetime import datetime
from typing import List, Optional
from uuid import UUID
import asyncpg
from domain.entities import Dispositivo
from domain.ports import DispositivoRepositoryPort

def _row(r: asyncpg.Record) -> Dispositivo:
    return Dispositivo(id=r["id"], tenant_id=r["tenant_id"], nombre=r["nombre"],
                       tipo=r["tipo"], protocolo=r["protocolo"], driver=r["driver"],
                       ip_address=r["ip_address"], estado=r["estado"],
                       ultima_conexion=r.get("ultima_conexion"),
                       created_at=r["created_at"], updated_at=r["updated_at"])

class PostgreSQLDispositivoRepository(DispositivoRepositoryPort):
    def __init__(self, pool: asyncpg.Pool) -> None:
        self._pool = pool

    async def list(self, tenant_id: UUID) -> List[Dispositivo]:
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT * FROM public.dispositivos WHERE tenant_id=$1 ORDER BY nombre", tenant_id)
        return [_row(r) for r in rows]

    async def get_by_id(self, id: UUID, tenant_id: UUID) -> Optional[Dispositivo]:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM public.dispositivos WHERE id=$1 AND tenant_id=$2", id, tenant_id)
        return _row(row) if row else None

    async def create(self, d: Dispositivo) -> Dispositivo:
        async with self._pool.acquire() as conn:
            await conn.execute(
                """INSERT INTO public.dispositivos
                   (id,tenant_id,nombre,tipo,protocolo,driver,ip_address,estado,created_at,updated_at)
                   VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)""",
                d.id, d.tenant_id, d.nombre, d.tipo, d.protocolo, d.driver,
                d.ip_address, d.estado, d.created_at, d.updated_at)
        return d

    async def update(self, d: Dispositivo) -> Dispositivo:
        async with self._pool.acquire() as conn:
            await conn.execute(
                """UPDATE public.dispositivos SET nombre=$3,tipo=$4,protocolo=$5,driver=$6,
                   ip_address=$7,estado=$8,ultima_conexion=$9,updated_at=NOW()
                   WHERE id=$1 AND tenant_id=$2""",
                d.id, d.tenant_id, d.nombre, d.tipo, d.protocolo, d.driver,
                d.ip_address, d.estado, d.ultima_conexion)
        return d
