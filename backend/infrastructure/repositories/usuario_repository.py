from __future__ import annotations
from typing import Optional
from uuid import UUID
import asyncpg
from domain.entities import Usuario
from domain.ports import UsuarioRepositoryPort


def _row(r: asyncpg.Record) -> Usuario:
    return Usuario(id=r["id"], tenant_id=r["tenant_id"], email=r["email"],
                   nombre_completo=r["nombre_completo"], rol=r["rol"],
                   activo=r["activo"], ultimo_login=r.get("ultimo_login"),
                   created_at=r["created_at"], updated_at=r["updated_at"])


class PostgreSQLUsuarioRepository(UsuarioRepositoryPort):
    def __init__(self, pool: asyncpg.Pool) -> None:
        self._pool = pool

    async def get_by_email(self, email: str, tenant_id: UUID) -> Optional[Usuario]:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM public.usuarios WHERE email=$1 AND tenant_id=$2 AND activo=TRUE",
                email, tenant_id)
        return _row(row) if row else None

    async def get_by_id(self, id: UUID) -> Optional[Usuario]:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow("SELECT * FROM public.usuarios WHERE id=$1", id)
        return _row(row) if row else None

    async def create(self, usuario: Usuario, password_hash: str) -> Usuario:
        async with self._pool.acquire() as conn:
            await conn.execute(
                """INSERT INTO public.usuarios (id,tenant_id,email,password_hash,nombre_completo,rol,activo,created_at,updated_at)
                   VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)""",
                usuario.id, usuario.tenant_id, usuario.email, password_hash,
                usuario.nombre_completo, usuario.rol, usuario.activo,
                usuario.created_at, usuario.updated_at)
        return usuario

    async def list(self, tenant_id: UUID):
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(
                """SELECT * FROM public.usuarios
                   WHERE tenant_id=$1 AND deleted_at IS NULL
                   ORDER BY nombre_completo""",
                tenant_id)
        return [_row(r) for r in rows]

    async def update(self, usuario: Usuario) -> Usuario:
        async with self._pool.acquire() as conn:
            await conn.execute(
                """UPDATE public.usuarios
                   SET nombre_completo=$3, rol=$4, activo=$5, updated_at=NOW()
                   WHERE id=$1 AND tenant_id=$2""",
                usuario.id, usuario.tenant_id,
                usuario.nombre_completo, usuario.rol, usuario.activo,
            )
        return usuario

    async def update_ultimo_login(self, id: UUID) -> None:
        async with self._pool.acquire() as conn:
            await conn.execute("UPDATE public.usuarios SET ultimo_login=NOW() WHERE id=$1", id)

    async def soft_delete(self, id: UUID, tenant_id: UUID) -> None:
        async with self._pool.acquire() as conn:
            await conn.execute(
                "UPDATE public.usuarios SET deleted_at=NOW(), activo=FALSE WHERE id=$1 AND tenant_id=$2",
                id, tenant_id,
            )
