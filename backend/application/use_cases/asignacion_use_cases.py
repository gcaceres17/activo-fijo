"""Use Cases para Asignaciones."""
from __future__ import annotations

import uuid
from datetime import date
from typing import List, Optional, Tuple
from uuid import UUID

from domain.entities import Asignacion, AuditLog
from domain.exceptions import ConflictError, NotFoundError
from domain.ports import (
    ActivoRepositoryPort, AsignacionRepositoryPort,
    AuditLogRepositoryPort, SucursalRepositoryPort,
)


class AsignacionUseCases:
    def __init__(
        self,
        asignacion_repo: AsignacionRepositoryPort,
        activo_repo: ActivoRepositoryPort,
        audit_repo: AuditLogRepositoryPort,
        sucursal_repo: Optional[SucursalRepositoryPort] = None,
    ) -> None:
        self._asignaciones = asignacion_repo
        self._activos = activo_repo
        self._audit = audit_repo
        self._sucursales = sucursal_repo

    async def asignar(
        self,
        tenant_id: UUID,
        usuario_id: UUID,
        activo_id: UUID,
        responsable_nombre: str,
        sucursal_id: UUID,
        fecha_inicio: date,
        responsable_codigo: Optional[str] = None,
    ) -> Asignacion:
        activo = await self._activos.get_by_id(activo_id, tenant_id)
        if not activo:
            raise NotFoundError("Activo", str(activo_id))
        if activo.estado != "activo":
            raise ConflictError(
                f"No se puede asignar un activo en estado '{activo.estado}'"
            )

        vigente = await self._asignaciones.get_vigente_by_activo(activo_id, tenant_id)
        if vigente:
            raise ConflictError(
                f"El activo ya está asignado a '{vigente.responsable_nombre}'. "
                "Debe dar de baja la asignación actual primero."
            )

        asignacion = Asignacion(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            activo_id=activo_id,
            responsable_nombre=responsable_nombre,
            sucursal_id=sucursal_id,
            fecha_inicio=fecha_inicio,
            responsable_codigo=responsable_codigo,
        )

        asignacion = await self._asignaciones.create(asignacion)

        await self._audit.append(AuditLog(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            usuario_id=usuario_id,
            accion="ASIGNACION",
            entidad="Asignacion",
            entidad_id=asignacion.id,
            payload_after={
                "activo_id": str(activo_id),
                "responsable_nombre": responsable_nombre,
                "sucursal_id": str(sucursal_id),
            },
        ))

        return asignacion

    async def dar_de_baja(
        self,
        id: UUID,
        tenant_id: UUID,
        usuario_id: UUID,
        fecha_fin: Optional[date] = None,
    ) -> Asignacion:
        asignacion = await self._asignaciones.dar_de_baja(id, tenant_id, fecha_fin)

        await self._audit.append(AuditLog(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            usuario_id=usuario_id,
            accion="BAJA_ASIGNACION",
            entidad="Asignacion",
            entidad_id=id,
            payload_after={"vigente": False},
        ))

        return asignacion

    async def listar(
        self,
        tenant_id: UUID,
        *,
        activo_id: Optional[UUID] = None,
        sucursal_id: Optional[UUID] = None,
        solo_vigentes: bool = False,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[Asignacion], int]:
        return await self._asignaciones.list(
            tenant_id,
            activo_id=activo_id,
            sucursal_id=sucursal_id,
            solo_vigentes=solo_vigentes,
            page=page,
            page_size=page_size,
        )

    async def listar_por_activo(
        self, activo_id: UUID, tenant_id: UUID
    ) -> List[Asignacion]:
        return await self._asignaciones.list_by_activo(activo_id, tenant_id)
