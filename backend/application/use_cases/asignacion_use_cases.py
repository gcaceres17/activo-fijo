"""Use Cases para Asignaciones."""
from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import List, Optional, Tuple
from uuid import UUID

from domain.entities import Asignacion, AuditLog
from domain.exceptions import ConflictError, NotFoundError
from domain.ports import (
    ActivoRepositoryPort, AsignacionRepositoryPort, AuditLogRepositoryPort
)


class AsignacionUseCases:

    def __init__(
        self,
        asignacion_repo: AsignacionRepositoryPort,
        activo_repo: ActivoRepositoryPort,
        audit_repo: AuditLogRepositoryPort,
    ) -> None:
        self._asignaciones = asignacion_repo
        self._activos = activo_repo
        self._audit = audit_repo

    # UC-07
    async def asignar(
        self,
        tenant_id: UUID,
        usuario_email: str,
        activo_id: UUID,
        empleado_nombre: str,
        area: str,
        fecha_asignacion: date,
        **kwargs,
    ) -> Asignacion:
        # Verificar activo existe y está en estado válido
        activo = await self._activos.get_by_id(activo_id, tenant_id)
        if not activo:
            raise NotFoundError("Activo", str(activo_id))
        if activo.estado not in ("activo", "reservado"):
            raise ConflictError(
                f"No se puede asignar un activo en estado '{activo.estado}'"
            )

        # Verificar que no tiene asignación vigente (INV-4.1)
        vigente = await self._asignaciones.get_vigente_by_activo(activo_id, tenant_id)
        if vigente:
            raise ConflictError(
                f"El activo ya está asignado a '{vigente.empleado_nombre}'. "
                "Debe dar de baja la asignación actual primero."
            )

        asignacion = Asignacion(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            activo_id=activo_id,
            empleado_nombre=empleado_nombre,
            area=area,
            fecha_asignacion=fecha_asignacion,
            **kwargs,
        )

        asignacion = await self._asignaciones.create(asignacion)

        await self._audit.append(AuditLog(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            fecha_hora=datetime.utcnow(),
            usuario_email=usuario_email,
            accion="ASIGNACION",
            entidad="Asignacion",
            entidad_id=asignacion.id,
            detalle=f"{activo.codigo} asignado a {empleado_nombre} — {area}",
        ))

        return asignacion

    # UC-08
    async def dar_de_baja(
        self,
        id: UUID,
        tenant_id: UUID,
        usuario_email: str,
        fecha_baja: Optional[date] = None,
    ) -> Asignacion:
        asignacion = await self._asignaciones.dar_de_baja(id, tenant_id, fecha_baja)

        await self._audit.append(AuditLog(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            fecha_hora=datetime.utcnow(),
            usuario_email=usuario_email,
            accion="BAJA_ASIGNACION",
            entidad="Asignacion",
            entidad_id=id,
            detalle=f"Baja de asignación de {asignacion.empleado_nombre}",
        ))

        return asignacion

    async def listar(
        self,
        tenant_id: UUID,
        *,
        estado: Optional[str] = None,
        activo_id: Optional[UUID] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[Asignacion], int]:
        return await self._asignaciones.list(
            tenant_id, estado=estado, activo_id=activo_id,
            page=page, page_size=page_size
        )

    async def listar_por_activo(
        self, activo_id: UUID, tenant_id: UUID
    ) -> List[Asignacion]:
        return await self._asignaciones.list_by_activo(activo_id, tenant_id)
