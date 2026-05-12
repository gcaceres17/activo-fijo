"""Implementación PostgreSQL del ActivoRepositoryPort."""
from __future__ import annotations

from datetime import datetime
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
        categoria_id=row["categoria_id"],
        valor_adquisicion=Decimal(str(row["valor_adquisicion"])),
        marca=row["marca"],
        modelo=row["modelo"],
        numero_serie=row["numero_serie"],
        fecha_compra=row["fecha_compra"],
        vida_util_años=row["vida_util_años"],
        valor_residual=Decimal(str(row["valor_residual"])),
        estado=row["estado"],
        area=row["area"],
        centro_costo_id=row["centro_costo_id"],
        responsable=row["responsable"],
        ubicacion=row["ubicacion"],
        foto_url=row["foto_url"],
        documentos=list(row["documentos"]) if row["documentos"] else [],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
        deleted_at=row.get("deleted_at"),
    )


class PostgreSQLActivoRepository(ActivoRepositoryPort):
    """
    Implementación concreta del ActivoRepositoryPort usando asyncpg + PostgreSQL.
    
    Principio OCP: agregar soporte para otro motor de BD solo requiere crear
    otra clase que implemente ActivoRepositoryPort.
    """

    def __init__(self, pool: asyncpg.Pool) -> None:
        self._pool = pool

    async def get_by_id(self, id: UUID, tenant_id: UUID) -> Optional[Activo]:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM public.activos WHERE id = $1 AND tenant_id = $2",
                id, tenant_id
            )
            return _row_to_activo(row) if row else None

    async def get_by_codigo(self, codigo: str, tenant_id: UUID) -> Optional[Activo]:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM public.activos WHERE codigo = $1 AND tenant_id = $2",
                codigo, tenant_id
            )
            return _row_to_activo(row) if row else None

    async def get_by_serie(self, numero_serie: str, tenant_id: UUID) -> Optional[Activo]:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                """SELECT * FROM public.activos
                   WHERE numero_serie = $1 AND tenant_id = $2 AND deleted_at IS NULL""",
                numero_serie, tenant_id
            )
            return _row_to_activo(row) if row else None

    async def list(
        self,
        tenant_id: UUID,
        *,
        categoria_id: Optional[UUID] = None,
        estado: Optional[str] = None,
        centro_costo_id: Optional[UUID] = None,
        area: Optional[str] = None,
        q: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[Activo], int]:
        conditions = ["tenant_id = $1", "deleted_at IS NULL"]
        params: list = [tenant_id]
        n = 2

        if categoria_id:
            conditions.append(f"categoria_id = ${n}")
            params.append(categoria_id)
            n += 1
        if estado:
            conditions.append(f"estado = ${n}")
            params.append(estado)
            n += 1
        if centro_costo_id:
            conditions.append(f"centro_costo_id = ${n}")
            params.append(centro_costo_id)
            n += 1
        if area:
            conditions.append(f"area = ${n}")
            params.append(area)
            n += 1
        if q:
            conditions.append(
                f"(to_tsvector('spanish', coalesce(nombre,'') || ' ' || coalesce(codigo,'')) "
                f"@@ plainto_tsquery('spanish', ${n}) OR nombre ILIKE ${n+1})"
            )
            params.extend([q, f"%{q}%"])
            n += 2

        where = " AND ".join(conditions)
        offset = (page - 1) * page_size

        async with self._pool.acquire() as conn:
            count_row = await conn.fetchrow(
                f"SELECT COUNT(*) FROM public.activos WHERE {where}", *params
            )
            total = count_row["count"]

            rows = await conn.fetch(
                f"""SELECT * FROM public.activos WHERE {where}
                    ORDER BY created_at DESC
                    LIMIT ${n} OFFSET ${n+1}""",
                *params, page_size, offset
            )

        return [_row_to_activo(r) for r in rows], total

    async def create(self, activo: Activo) -> Activo:
        async with self._pool.acquire() as conn:
            await conn.execute(
                """INSERT INTO public.activos (
                    id, tenant_id, codigo, nombre, categoria_id, marca, modelo,
                    numero_serie, fecha_compra, valor_adquisicion, vida_util_años,
                    valor_residual, estado, area, centro_costo_id, responsable,
                    ubicacion, foto_url, documentos, created_at, updated_at
                ) VALUES (
                    $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21
                )""",
                activo.id, activo.tenant_id, activo.codigo, activo.nombre,
                activo.categoria_id, activo.marca, activo.modelo, activo.numero_serie,
                activo.fecha_compra, float(activo.valor_adquisicion), activo.vida_util_años,
                float(activo.valor_residual), activo.estado, activo.area,
                activo.centro_costo_id, activo.responsable, activo.ubicacion,
                activo.foto_url, activo.documentos, activo.created_at, activo.updated_at,
            )
        return activo

    async def update(self, activo: Activo) -> Activo:
        async with self._pool.acquire() as conn:
            await conn.execute(
                """UPDATE public.activos SET
                    nombre=$3, marca=$4, modelo=$5, numero_serie=$6, fecha_compra=$7,
                    valor_adquisicion=$8, vida_util_años=$9, valor_residual=$10,
                    estado=$11, area=$12, centro_costo_id=$13, responsable=$14,
                    ubicacion=$15, foto_url=$16, documentos=$17, updated_at=$18,
                    deleted_at=$19
                WHERE id=$1 AND tenant_id=$2""",
                activo.id, activo.tenant_id, activo.nombre, activo.marca, activo.modelo,
                activo.numero_serie, activo.fecha_compra, float(activo.valor_adquisicion),
                activo.vida_util_años, float(activo.valor_residual), activo.estado,
                activo.area, activo.centro_costo_id, activo.responsable, activo.ubicacion,
                activo.foto_url, activo.documentos, activo.updated_at, activo.deleted_at,
            )
        return activo

    async def soft_delete(self, id: UUID, tenant_id: UUID) -> None:
        async with self._pool.acquire() as conn:
            await conn.execute(
                """UPDATE public.activos SET deleted_at=NOW(), updated_at=NOW()
                   WHERE id=$1 AND tenant_id=$2""",
                id, tenant_id
            )

    async def get_kpis(self, tenant_id: UUID) -> dict:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM public.v_activos_kpis WHERE tenant_id=$1", tenant_id
            )
            if not row:
                return {
                    "total_activos": 0, "en_mantenimiento": 0, "dados_de_baja": 0,
                    "reservados": 0, "valor_total_cartera": 0,
                    "depreciacion_acumulada_total": 0, "por_categoria": []
                }

            # Por categoría
            cat_rows = await conn.fetch(
                """SELECT c.id, c.nombre, c.color_hex, c.icono,
                          COUNT(a.id) FILTER (WHERE a.deleted_at IS NULL) AS total,
                          COALESCE(SUM(a.valor_adquisicion) FILTER (WHERE a.deleted_at IS NULL), 0) AS valor
                   FROM public.categorias c
                   LEFT JOIN public.activos a ON a.categoria_id = c.id AND a.tenant_id = $1
                   WHERE c.tenant_id = $1 AND c.deleted_at IS NULL
                   GROUP BY c.id, c.nombre, c.color_hex, c.icono
                   ORDER BY total DESC""",
                tenant_id
            )

            valor_libro = float(row["valor_total_cartera"]) - float(row["depreciacion_acumulada_total"])

            return {
                "total_activos": row["total_activos"],
                "en_mantenimiento": row["en_mantenimiento"],
                "dados_de_baja": row["dados_de_baja"],
                "reservados": row["reservados"],
                "valor_total_cartera": float(row["valor_total_cartera"]),
                "depreciacion_acumulada_total": float(row["depreciacion_acumulada_total"]),
                "valor_libro_total": valor_libro,
                "por_categoria": [
                    {
                        "categoria_id": str(r["id"]),
                        "nombre": r["nombre"],
                        "color_hex": r["color_hex"],
                        "icono": r["icono"],
                        "total": r["total"],
                        "valor": float(r["valor"]),
                    }
                    for r in cat_rows
                ],
            }

    async def next_codigo(self, tenant_id: UUID) -> str:
        async with self._pool.acquire() as conn:
            result = await conn.fetchval(
                "SELECT public.next_activo_codigo($1)", tenant_id
            )
            return result
