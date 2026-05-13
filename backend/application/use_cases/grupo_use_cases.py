"""Use Cases para Grupos y Clases — taxonomía de activos."""
from __future__ import annotations

import uuid
from typing import List
from uuid import UUID

from domain.entities import Clase, Grupo
from domain.exceptions import ConflictError, NotFoundError, ValidationError
from domain.ports import (
    AuditLogRepositoryPort,
    ClaseRepositoryPort,
    GrupoRepositoryPort,
)


class GrupoUseCases:
    def __init__(
        self,
        grupo_repo: GrupoRepositoryPort,
        clase_repo: ClaseRepositoryPort,
        audit_repo: AuditLogRepositoryPort,
    ) -> None:
        self._grupos = grupo_repo
        self._clases = clase_repo
        self._audit = audit_repo

    async def listar_grupos(self, tenant_id: UUID) -> List[Grupo]:
        return await self._grupos.list(tenant_id)

    async def obtener_grupo(self, id: UUID, tenant_id: UUID) -> Grupo:
        grupo = await self._grupos.get_by_id(id, tenant_id)
        if not grupo:
            raise NotFoundError("Grupo", str(id))
        return grupo

    async def crear_grupo(
        self,
        tenant_id: UUID,
        usuario_id: UUID,
        codigo: str,
        nombre: str,
    ) -> Grupo:
        if await self._grupos.get_by_codigo(codigo, tenant_id):
            raise ConflictError(f"Ya existe un grupo con código '{codigo}'")

        grupo = Grupo(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            codigo=codigo.upper().strip(),
            nombre=nombre.strip(),
        )
        return await self._grupos.create(grupo)

    async def actualizar_grupo(
        self,
        id: UUID,
        tenant_id: UUID,
        usuario_id: UUID,
        codigo: str,
        nombre: str,
    ) -> Grupo:
        grupo = await self.obtener_grupo(id, tenant_id)

        existing = await self._grupos.get_by_codigo(codigo, tenant_id)
        if existing and existing.id != id:
            raise ConflictError(f"Ya existe otro grupo con código '{codigo}'")

        grupo.codigo = codigo.upper().strip()
        grupo.nombre = nombre.strip()
        return await self._grupos.update(grupo)

    async def eliminar_grupo(self, id: UUID, tenant_id: UUID, usuario_id: UUID) -> None:
        await self.obtener_grupo(id, tenant_id)
        clases = await self._clases.list(tenant_id, grupo_id=id)
        if clases:
            raise ConflictError(
                f"El grupo tiene {len(clases)} clase(s) asociada(s). Elimine las clases primero."
            )
        await self._grupos.soft_delete(id, tenant_id)

    # ── Clases ───────────────────────────────────────────────────────────────

    async def listar_clases(
        self, tenant_id: UUID, *, grupo_id: UUID | None = None
    ) -> List[Clase]:
        return await self._clases.list(tenant_id, grupo_id=grupo_id)

    async def obtener_clase(self, id: UUID, tenant_id: UUID) -> Clase:
        clase = await self._clases.get_by_id(id, tenant_id)
        if not clase:
            raise NotFoundError("Clase", str(id))
        return clase

    async def crear_clase(
        self,
        tenant_id: UUID,
        usuario_id: UUID,
        grupo_id: UUID,
        codigo: str,
        nombre: str,
        tasa_depreciacion=None,
    ) -> Clase:
        await self.obtener_grupo(grupo_id, tenant_id)

        if await self._clases.get_by_codigo(codigo, tenant_id):
            raise ConflictError(f"Ya existe una clase con código '{codigo}'")

        clase = Clase(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            grupo_id=grupo_id,
            codigo=codigo.upper().strip(),
            nombre=nombre.strip(),
            tasa_depreciacion=tasa_depreciacion,
        )
        return await self._clases.create(clase)

    async def actualizar_clase(
        self,
        id: UUID,
        tenant_id: UUID,
        usuario_id: UUID,
        codigo: str,
        nombre: str,
        tasa_depreciacion=None,
    ) -> Clase:
        clase = await self.obtener_clase(id, tenant_id)

        existing = await self._clases.get_by_codigo(codigo, tenant_id)
        if existing and existing.id != id:
            raise ConflictError(f"Ya existe otra clase con código '{codigo}'")

        clase.codigo = codigo.upper().strip()
        clase.nombre = nombre.strip()
        clase.tasa_depreciacion = tasa_depreciacion
        return await self._clases.update(clase)

    async def eliminar_clase(self, id: UUID, tenant_id: UUID, usuario_id: UUID) -> None:
        await self.obtener_clase(id, tenant_id)
        await self._clases.soft_delete(id, tenant_id)
