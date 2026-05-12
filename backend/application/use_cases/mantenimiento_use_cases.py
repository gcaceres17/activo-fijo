"""Use Cases para Mantenimientos."""
from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional, Tuple
from uuid import UUID

from domain.entities import Mantenimiento, AuditLog
from domain.exceptions import ConflictError, NotFoundError
from domain.ports import (
    ActivoRepositoryPort, MantenimientoRepositoryPort, AuditLogRepositoryPort
)


class MantenimientoUseCases:

    def __init__(
        self,
        mnt_repo: MantenimientoRepositoryPort,
        activo_repo: ActivoRepositoryPort,
        audit_repo: AuditLogRepositoryPort,
    ) -> None:
        self._mantenimientos = mnt_repo
        self._activos = activo_repo
        self._audit = audit_repo

    # UC-09
    async def registrar(
        self,
        tenant_id: UUID,
        usuario_email: str,
        activo_id: UUID,
        tipo: str,
        descripcion: str,
        tecnico: str,
        fecha_inicio: date,
        **kwargs,
    ) -> Mantenimiento:
        activo = await self._activos.get_by_id(activo_id, tenant_id)
        if not activo:
            raise NotFoundError("Activo", str(activo_id))
        if activo.estado == "dado_de_baja":
            raise ConflictError("No se puede registrar mantenimiento de un activo dado de baja")

        mnt = Mantenimiento(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            activo_id=activo_id,
            tipo=tipo,
            descripcion=descripcion,
            tecnico=tecnico,
            fecha_inicio=fecha_inicio,
            **kwargs,
        )

        mnt = await self._mantenimientos.create(mnt)

        # Si es correctivo, cambiar estado del activo
        if tipo == "correctivo":
            activo.iniciar_mantenimiento()
            await self._activos.update(activo)

        await self._audit.append(AuditLog(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            fecha_hora=datetime.utcnow(),
            usuario_email=usuario_email,
            accion="ALTA_MANTENIMIENTO",
            entidad="Mantenimiento",
            entidad_id=mnt.id,
            detalle=f"Mantenimiento {tipo} registrado para {activo.codigo}: {descripcion}",
        ))

        return mnt

    # UC-10
    async def cerrar(
        self,
        id: UUID,
        tenant_id: UUID,
        usuario_email: str,
        fecha_fin: Optional[date] = None,
        costo_final: Optional[Decimal] = None,
    ) -> Mantenimiento:
        mnt = await self._mantenimientos.get_by_id(id, tenant_id)
        if not mnt:
            raise NotFoundError("Mantenimiento", str(id))

        mnt.completar(fecha_fin, costo_final)
        mnt = await self._mantenimientos.update(mnt)

        # Restaurar activo a 'activo' si estaba en mantenimiento
        activo = await self._activos.get_by_id(mnt.activo_id, tenant_id)
        if activo and activo.estado == "en_mantenimiento":
            activo.finalizar_mantenimiento()
            await self._activos.update(activo)

        await self._audit.append(AuditLog(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            fecha_hora=datetime.utcnow(),
            usuario_email=usuario_email,
            accion="CIERRE_MANTENIMIENTO",
            entidad="Mantenimiento",
            entidad_id=id,
            detalle=f"Mantenimiento cerrado. Costo final: {mnt.costo}",
        ))

        return mnt

    async def listar(
        self,
        tenant_id: UUID,
        *,
        estado: Optional[str] = None,
        activo_id: Optional[UUID] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[Mantenimiento], int]:
        return await self._mantenimientos.list(
            tenant_id, estado=estado, activo_id=activo_id,
            page=page, page_size=page_size
        )

    async def obtener(self, id: UUID, tenant_id: UUID) -> Mantenimiento:
        mnt = await self._mantenimientos.get_by_id(id, tenant_id)
        if not mnt:
            raise NotFoundError("Mantenimiento", str(id))
        return mnt
