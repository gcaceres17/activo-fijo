"""Use Cases para Sucursales."""
from __future__ import annotations

import uuid
from typing import List, Optional
from uuid import UUID

from domain.entities import Sucursal
from domain.exceptions import ConflictError, NotFoundError
from domain.ports import AuditLogRepositoryPort, SucursalRepositoryPort


class SucursalUseCases:
    def __init__(
        self,
        sucursal_repo: SucursalRepositoryPort,
        audit_repo: AuditLogRepositoryPort,
    ) -> None:
        self._sucursales = sucursal_repo
        self._audit = audit_repo

    async def listar(self, tenant_id: UUID) -> List[Sucursal]:
        return await self._sucursales.list(tenant_id)

    async def obtener(self, id: UUID, tenant_id: UUID) -> Sucursal:
        sucursal = await self._sucursales.get_by_id(id, tenant_id)
        if not sucursal:
            raise NotFoundError("Sucursal", str(id))
        return sucursal

    async def crear(
        self,
        tenant_id: UUID,
        usuario_id: UUID,
        codigo: str,
        nombre: str,
        nivel: int = 1,
        parent_id: Optional[UUID] = None,
    ) -> Sucursal:
        if nivel > 1 and parent_id:
            parent = await self._sucursales.get_by_id(parent_id, tenant_id)
            if not parent:
                raise NotFoundError("Sucursal padre", str(parent_id))

        sucursal = Sucursal(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            codigo=codigo.upper().strip(),
            nombre=nombre.strip(),
            nivel=nivel,
            parent_id=parent_id,
        )
        return await self._sucursales.create(sucursal)

    async def actualizar(
        self,
        id: UUID,
        tenant_id: UUID,
        usuario_id: UUID,
        codigo: str,
        nombre: str,
        nivel: int,
        parent_id: Optional[UUID] = None,
    ) -> Sucursal:
        sucursal = await self.obtener(id, tenant_id)

        if nivel > 1 and parent_id:
            parent = await self._sucursales.get_by_id(parent_id, tenant_id)
            if not parent:
                raise NotFoundError("Sucursal padre", str(parent_id))
            if parent_id == id:
                raise ConflictError("Una sucursal no puede ser su propio padre")

        sucursal.codigo = codigo.upper().strip()
        sucursal.nombre = nombre.strip()
        sucursal.nivel = nivel
        sucursal.parent_id = parent_id
        return await self._sucursales.update(sucursal)

    async def eliminar(self, id: UUID, tenant_id: UUID, usuario_id: UUID) -> None:
        await self.obtener(id, tenant_id)
        await self._sucursales.soft_delete(id, tenant_id)
