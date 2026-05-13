"""PostgreSQL implementation of AuditLogRepositoryPort (append-only)."""
from __future__ import annotations
import json
from typing import List, Optional, Tuple
from uuid import UUID

import asyncpg
from domain.entities import AuditLog
from domain.ports import AuditLogRepositoryPort


def _row_to_log(row: asyncpg.Record) -> AuditLog:
    return AuditLog(
        id=row["id"],
        tenant_id=row["tenant_id"],
        usuario_id=row["usuario_id"],
        accion=row["accion"],
        entidad=row["entidad"],
        entidad_id=row["entidad_id"],
        payload_before=dict(row["payload_before"]) if row.get("payload_before") else {},
        payload_after=dict(row["payload_after"]) if row.get("payload_after") else {},
        ip_address=row.get("ip_address"),
        created_at=row["created_at"],
    )


class PostgreSQLAuditLogRepository(AuditLogRepositoryPort):
    def __init__(self, pool: asyncpg.Pool) -> None:
        self._pool = pool

    async def append(self, log: AuditLog) -> None:
        async with self._pool.acquire() as conn:
            await conn.execute(
                """INSERT INTO public.audit_logs
                   (id, tenant_id, usuario_id, accion, entidad, entidad_id,
                    payload_before, payload_after, ip_address, created_at)
                   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)""",
                log.id, log.tenant_id, log.usuario_id,
                log.accion, log.entidad, log.entidad_id,
                json.dumps(log.payload_before), json.dumps(log.payload_after),
                log.ip_address, log.created_at,
            )

    async def list(
        self,
        tenant_id: UUID,
        *,
        usuario_id: Optional[UUID] = None,
        accion: Optional[str] = None,
        entidad: Optional[str] = None,
        page: int = 1,
        page_size: int = 50,
    ) -> Tuple[List[AuditLog], int]:
        conditions = ["tenant_id=$1"]
        params: list = [tenant_id]
        n = 2

        if usuario_id:
            conditions.append(f"usuario_id=${n}"); params.append(usuario_id); n += 1
        if accion:
            conditions.append(f"accion=${n}"); params.append(accion); n += 1
        if entidad:
            conditions.append(f"entidad=${n}"); params.append(entidad); n += 1

        where = " AND ".join(conditions)
        offset = (page - 1) * page_size

        async with self._pool.acquire() as conn:
            total = await conn.fetchval(
                f"SELECT COUNT(*) FROM public.audit_logs WHERE {where}", *params
            )
            rows = await conn.fetch(
                f"SELECT * FROM public.audit_logs WHERE {where} ORDER BY created_at DESC LIMIT ${n} OFFSET ${n+1}",
                *params, page_size, offset,
            )
        return [_row_to_log(r) for r in rows], total
