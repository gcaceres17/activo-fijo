from __future__ import annotations
from typing import List, Optional
from uuid import UUID
import asyncpg
from domain.entities import Categoria
from domain.ports import CategoriaRepositoryPort


def _row(r: asyncpg.Record) -> Categoria:
    return Categoria(id=r["id"], tenant_id=r["tenant_id"], nombre=r["nombre"],
                     icono=r["icono"], color_hex=r["color_hex"],
                     vida_util_default_años=r["vida_util_default_años"],
                     created_at=r["created_at"], updated_at=r["updated_at"],
                     deleted_at=r.get("deleted_at"))


class PostgreSQLCategoriaRepository(CategoriaRepositoryPort):
    def __init__(self, pool: asyncpg.Pool) -> None:
        self._pool = pool

    async def list(self, tenant_id: UUID) -> List[Categoria]:
        async with self._pool.acquire() as conn:
            # Incluye conteo de activos
            rows = await conn.fetch(
                """SELECT c.*,
                   COUNT(a.id) FILTER (WHERE a.deleted_at IS NULL) AS total_activos,
                   COUNT(a.id) FILTER (WHERE a.deleted_at IS NULL AND a.estado='activo') AS activos_activos,
                   COUNT(a.id) FILTER (WHERE a.deleted_at IS NULL AND a.estado='dado_de_baja') AS activos_baja
                   FROM public.categorias c
                   LEFT JOIN public.activos a ON a.categoria_id = c.id AND a.tenant_id = c.tenant_id
                   WHERE c.tenant_id=$1 AND c.deleted_at IS NULL
                   GROUP BY c.id ORDER BY c.nombre""",
                tenant_id)
        return [_row(r) for r in rows]

    async def get_by_id(self, id: UUID, tenant_id: UUID) -> Optional[Categoria]:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM public.categorias WHERE id=$1 AND tenant_id=$2 AND deleted_at IS NULL",
                id, tenant_id)
        return _row(row) if row else None

    async def create(self, cat: Categoria) -> Categoria:
        async with self._pool.acquire() as conn:
            await conn.execute(
                """INSERT INTO public.categorias (id,tenant_id,nombre,icono,color_hex,vida_util_default_años,created_at,updated_at)
                   VALUES ($1,$2,$3,$4,$5,$6,$7,$8)""",
                cat.id, cat.tenant_id, cat.nombre, cat.icono, cat.color_hex,
                cat.vida_util_default_años, cat.created_at, cat.updated_at)
        return cat

    async def update(self, cat: Categoria) -> Categoria:
        async with self._pool.acquire() as conn:
            await conn.execute(
                """UPDATE public.categorias SET nombre=$3,icono=$4,color_hex=$5,
                   vida_util_default_años=$6,updated_at=NOW()
                   WHERE id=$1 AND tenant_id=$2""",
                cat.id, cat.tenant_id, cat.nombre, cat.icono, cat.color_hex, cat.vida_util_default_años)
        return cat
