"""Implementación PostgreSQL del ActivoRepositoryPort."""
from __future__ import annotations

from decimal import Decimal
from typing import List, Optional, Tuple
from uuid import UUID

import asyncpg

from domain.entities import Activo
from domain.ports import ActivoRepositoryPort


def _row_to_activo(row: asyncpg.Record) -> Activo:
    return Activo(
        id=row["id"],
        tenant_id=row["tenant_id"],
        codigo=row["codigo"],
        nombre=row["nombre"],
        grupo_id=row["grupo_id"],
        clase_id=row["clase_id"],
        sucursal_id=row["sucursal_id"],
        valor_adquisicion=Decimal(str(row["valor_adquisicion"])),
        rubro_contable_id=row.get("rubro_contable_id"),
        marca=row.get("marca"),
        modelo=row.get("modelo"),
        numero_serie=row.get("numero_serie"),
        fecha_compra=row.get("fecha_compra"),
        vida_util_meses=row["vida_util_meses"],
        valor_residual=Decimal(str(row["valor_residual"])),
        foto_url=row.get("foto_url"),
        qr_url=row.get("qr_url"),
        estado=row["estado"],
        deleted_at=row.get("deleted_at"),
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


class PostgreSQLActivoRepository(ActivoRepositoryPort):
    def __init__(self, pool: asyncpg.Pool) -> None:
        self._pool = pool

    async def get_by_id(self, id: UUID, tenant_id: UUID) -> Optional[Activo]:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM public.activos WHERE id=$1 AND tenant_id=$2 AND deleted_at IS NULL",
                id, tenant_id,
            )
            return _row_to_activo(row) if row else None

    async def get_by_codigo(self, codigo: str, tenant_id: UUID) -> Optional[Activo]:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM public.activos WHERE codigo=$1 AND tenant_id=$2 AND deleted_at IS NULL",
                codigo, tenant_id,
            )
            return _row_to_activo(row) if row else None

    async def get_by_serie(self, numero_serie: str, tenant_id: UUID) -> Optional[Activo]:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM public.activos WHERE numero_serie=$1 AND tenant_id=$2 AND deleted_at IS NULL",
                numero_serie, tenant_id,
            )
            return _row_to_activo(row) if row else None

    async def list(
        self,
        tenant_id: UUID,
        *,
        grupo_id: Optional[UUID] = None,
        clase_id: Optional[UUID] = None,
        sucursal_id: Optional[UUID] = None,
        estado: Optional[str] = None,
        q: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[Activo], int]:
        conditions = ["tenant_id=$1", "deleted_at IS NULL"]
        params: list = [tenant_id]
        n = 2

        if grupo_id:
            conditions.append(f"grupo_id=${n}"); params.append(grupo_id); n += 1
        if clase_id:
            conditions.append(f"clase_id=${n}"); params.append(clase_id); n += 1
        if sucursal_id:
            conditions.append(f"sucursal_id=${n}"); params.append(sucursal_id); n += 1
        if estado:
            conditions.append(f"estado=${n}"); params.append(estado); n += 1
        if q:
            conditions.append(
                f"(nombre ILIKE ${n} OR codigo ILIKE ${n} OR numero_serie ILIKE ${n})"
            )
            params.append(f"%{q}%"); n += 1

        where = " AND ".join(conditions)
        offset = (page - 1) * page_size

        async with self._pool.acquire() as conn:
            total = await conn.fetchval(
                f"SELECT COUNT(*) FROM public.activos WHERE {where}", *params
            )
            rows = await conn.fetch(
                f"SELECT * FROM public.activos WHERE {where} ORDER BY created_at DESC LIMIT ${n} OFFSET ${n+1}",
                *params, page_size, offset,
            )

        return [_row_to_activo(r) for r in rows], total

    async def create(self, activo: Activo) -> Activo:
        async with self._pool.acquire() as conn:
            await conn.execute(
                """INSERT INTO public.activos (
                    id, tenant_id, codigo, nombre, grupo_id, clase_id, sucursal_id,
                    rubro_contable_id, marca, modelo, numero_serie, fecha_compra,
                    valor_adquisicion, vida_util_meses, valor_residual,
                    foto_url, qr_url, estado, created_at, updated_at
                ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)""",
                activo.id, activo.tenant_id, activo.codigo, activo.nombre,
                activo.grupo_id, activo.clase_id, activo.sucursal_id,
                activo.rubro_contable_id, activo.marca, activo.modelo,
                activo.numero_serie, activo.fecha_compra,
                float(activo.valor_adquisicion), activo.vida_util_meses,
                float(activo.valor_residual), activo.foto_url, activo.qr_url,
                activo.estado, activo.created_at, activo.updated_at,
            )
        return activo

    async def update(self, activo: Activo) -> Activo:
        async with self._pool.acquire() as conn:
            await conn.execute(
                """UPDATE public.activos SET
                    nombre=$3, grupo_id=$4, clase_id=$5, sucursal_id=$6,
                    rubro_contable_id=$7, marca=$8, modelo=$9, numero_serie=$10,
                    fecha_compra=$11, valor_adquisicion=$12, vida_util_meses=$13,
                    valor_residual=$14, foto_url=$15, qr_url=$16,
                    estado=$17, deleted_at=$18, updated_at=$19
                WHERE id=$1 AND tenant_id=$2""",
                activo.id, activo.tenant_id, activo.nombre,
                activo.grupo_id, activo.clase_id, activo.sucursal_id,
                activo.rubro_contable_id, activo.marca, activo.modelo,
                activo.numero_serie, activo.fecha_compra,
                float(activo.valor_adquisicion), activo.vida_util_meses,
                float(activo.valor_residual), activo.foto_url, activo.qr_url,
                activo.estado, activo.deleted_at, activo.updated_at,
            )
        return activo

    async def soft_delete(self, id: UUID, tenant_id: UUID) -> None:
        async with self._pool.acquire() as conn:
            await conn.execute(
                "UPDATE public.activos SET deleted_at=NOW(), updated_at=NOW() WHERE id=$1 AND tenant_id=$2",
                id, tenant_id,
            )

    async def get_kpis(self, tenant_id: UUID) -> dict:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM public.v_activos_kpis WHERE tenant_id=$1", tenant_id
            )
            if not row:
                return {
                    "total_activos": 0, "en_mantenimiento": 0, "dados_de_baja": 0,
                    "valor_total_cartera": 0, "depreciacion_acumulada_total": 0,
                    "valor_libro_total": 0, "por_grupo": [],
                }

            grupo_rows = await conn.fetch(
                """SELECT g.id, g.nombre, COUNT(a.id) AS total,
                          COALESCE(SUM(a.valor_adquisicion), 0) AS valor
                   FROM public.grupos g
                   LEFT JOIN public.activos a
                     ON a.grupo_id = g.id AND a.tenant_id=$1 AND a.deleted_at IS NULL
                   WHERE g.tenant_id=$1 AND g.deleted_at IS NULL
                   GROUP BY g.id, g.nombre ORDER BY total DESC""",
                tenant_id,
            )

            return {
                "total_activos": row["total_activos"],
                "en_mantenimiento": row["en_mantenimiento"],
                "dados_de_baja": row["dados_de_baja"],
                "valor_total_cartera": float(row["valor_total_cartera"]),
                "depreciacion_acumulada_total": float(row["depreciacion_acumulada_total"]),
                "valor_libro_total": float(row["valor_total_cartera"]) - float(row["depreciacion_acumulada_total"]),
                "por_grupo": [
                    {
                        "grupo_id": str(r["id"]),
                        "nombre": r["nombre"],
                        "total": r["total"],
                        "valor": float(r["valor"]),
                    }
                    for r in grupo_rows
                ],
            }

    async def next_codigo(self, tenant_id: UUID) -> str:
        async with self._pool.acquire() as conn:
            return await conn.fetchval("SELECT public.next_activo_codigo($1)", tenant_id)
