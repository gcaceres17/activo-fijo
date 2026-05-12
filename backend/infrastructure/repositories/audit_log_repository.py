"""PostgreSQL implementation of AuditLogRepositoryPort (append-only)."""
from __future__ import annotations
from typing import List, Optional, Tuple
from uuid import UUID

import asyncpg
from domain.entities import AuditLog
from domain.ports import AuditLogRepositoryPort


def _row_to_log(row: asyncpg.Record) -> AuditLog:
    return AuditLog(
        id=row["id"], tenant_id=row["tenant_id"], fecha_hora=row["fecha_hora"],
        usuario_email=row["usuario_email"], accion=row["accion"],
        detalle=row["detalle"], entidad=row["entidad"],
        entidad_id=row["entidad_id"], ip_origen=row["ip_origen"],
        created_at=row["created_at"],
    )


class PostgreSQLAuditLogRepository(AuditLogRepositoryPort):
    def __init__(self, pool: asyncpg.Pool) -> None:
        self._pool = pool

    async def append(self, log: AuditLog) -> None:
        async with self._pool.acquire() as conn:
            await conn.execute(
                """INSERT INTO public.audit_logs
                   (id,tenant_id,fecha_hora,usuario_email,accion,entidad,entidad_id,detalle,ip_origen,created_at)
                   VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)""",
                log.id, log.tenant_id, log.fecha_hora, log.usuario_email,
                log.accion, log.entidad, log.entidad_id, log.detalle, log.ip_origen, log.created_at,
            )

    async def list(self, tenant_id: UUID, *, usuario_email=None, accion=None, page=1, page_size=50) -> Tuple[List[AuditLog], int]:
        conditions = ["tenant_id=$1"]
        params: list = [tenant_id]
        n = 2
        if usuario_email:
            conditions.append(f"usuario_email ILIKE ${n}"); params.append(f"%{usuario_email}%"); n += 1
        if accion:
            conditions.append(f"accion=${n}"); params.append(accion); n += 1
        where = " AND ".join(conditions)
        offset = (page - 1) * page_size
        async with self._pool.acquire() as conn:
            count = await conn.fetchval(f"SELECT COUNT(*) FROM public.audit_logs WHERE {where}", *params)
            rows = await conn.fetch(
                f"SELECT * FROM public.audit_logs WHERE {where} ORDER BY fecha_hora DESC LIMIT ${n} OFFSET ${n+1}",
                *params, page_size, offset
            )
        return [_row_to_log(r) for r in rows], count
