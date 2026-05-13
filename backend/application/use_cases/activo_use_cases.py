"""Use Cases para Activos — capa de aplicación."""
from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import List, Optional, Tuple
from uuid import UUID

from domain.entities import Activo, AuditLog
from domain.exceptions import ConflictError, NotFoundError, ValidationError
from domain.ports import (
    ActivoRepositoryPort,
    GrupoRepositoryPort,
    ClaseRepositoryPort,
    SucursalRepositoryPort,
    AuditLogRepositoryPort,
    QRServicePort,
    StoragePort,
)


class ActivoUseCases:
    def __init__(
        self,
        activo_repo: ActivoRepositoryPort,
        grupo_repo: GrupoRepositoryPort,
        clase_repo: ClaseRepositoryPort,
        sucursal_repo: SucursalRepositoryPort,
        audit_repo: AuditLogRepositoryPort,
        qr_service: QRServicePort,
        storage: StoragePort,
    ) -> None:
        self._activos = activo_repo
        self._grupos = grupo_repo
        self._clases = clase_repo
        self._sucursales = sucursal_repo
        self._audit = audit_repo
        self._qr = qr_service
        self._storage = storage

    async def registrar(
        self,
        tenant_id: UUID,
        usuario_id: UUID,
        nombre: str,
        grupo_id: UUID,
        clase_id: UUID,
        sucursal_id: UUID,
        valor_adquisicion: Decimal,
        vida_util_meses: int = 60,
        valor_residual: Decimal = Decimal("0"),
        **kwargs,
    ) -> Activo:
        if not await self._grupos.get_by_id(grupo_id, tenant_id):
            raise NotFoundError("Grupo", str(grupo_id))
        if not await self._clases.get_by_id(clase_id, tenant_id):
            raise NotFoundError("Clase", str(clase_id))
        if not await self._sucursales.get_by_id(sucursal_id, tenant_id):
            raise NotFoundError("Sucursal", str(sucursal_id))

        numero_serie = kwargs.get("numero_serie")
        if numero_serie and await self._activos.get_by_serie(numero_serie, tenant_id):
            raise ConflictError(f"Ya existe un activo con número de serie '{numero_serie}'")

        codigo = await self._activos.next_codigo(tenant_id)

        activo = Activo(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            codigo=codigo,
            nombre=nombre,
            grupo_id=grupo_id,
            clase_id=clase_id,
            sucursal_id=sucursal_id,
            valor_adquisicion=valor_adquisicion,
            vida_util_meses=vida_util_meses,
            valor_residual=valor_residual,
            **kwargs,
        )

        activo = await self._activos.create(activo)

        await self._audit.append(AuditLog(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            usuario_id=usuario_id,
            accion="ALTA_ACTIVO",
            entidad="Activo",
            entidad_id=activo.id,
            payload_after={"codigo": activo.codigo, "nombre": activo.nombre},
        ))

        return activo

    async def listar(
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
        if page < 1:
            raise ValidationError("page debe ser >= 1")
        if page_size > 100:
            raise ValidationError("page_size no puede superar 100")
        return await self._activos.list(
            tenant_id,
            grupo_id=grupo_id,
            clase_id=clase_id,
            sucursal_id=sucursal_id,
            estado=estado,
            q=q,
            page=page,
            page_size=page_size,
        )

    async def obtener(self, id: UUID, tenant_id: UUID) -> Activo:
        activo = await self._activos.get_by_id(id, tenant_id)
        if not activo:
            raise NotFoundError("Activo", str(id))
        return activo

    async def actualizar(
        self,
        id: UUID,
        tenant_id: UUID,
        usuario_id: UUID,
        **campos,
    ) -> Activo:
        activo = await self.obtener(id, tenant_id)
        if activo.estado == "dado_de_baja":
            raise ConflictError("No se puede modificar un activo dado de baja")

        before = {"nombre": activo.nombre, "estado": activo.estado}
        for campo, valor in campos.items():
            if hasattr(activo, campo) and valor is not None:
                object.__setattr__(activo, campo, valor)
        object.__setattr__(activo, "updated_at", datetime.utcnow())
        activo._validate()

        activo = await self._activos.update(activo)

        await self._audit.append(AuditLog(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            usuario_id=usuario_id,
            accion="MODIFICACION_ACTIVO",
            entidad="Activo",
            entidad_id=activo.id,
            payload_before=before,
            payload_after={k: str(v) for k, v in campos.items() if v is not None},
        ))

        return activo

    async def dar_de_baja(
        self,
        id: UUID,
        tenant_id: UUID,
        usuario_id: UUID,
        asignacion_repo,
    ) -> Activo:
        activo = await self.obtener(id, tenant_id)

        asig_vigente = await asignacion_repo.get_vigente_by_activo(id, tenant_id)
        if asig_vigente:
            raise ConflictError(
                f"El activo tiene una asignación vigente a '{asig_vigente.responsable_nombre}'. "
                "Debe dar de baja la asignación primero."
            )

        activo.dar_de_baja()
        activo = await self._activos.update(activo)

        await self._audit.append(AuditLog(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            usuario_id=usuario_id,
            accion="BAJA_ACTIVO",
            entidad="Activo",
            entidad_id=activo.id,
            payload_before={"estado": "activo"},
            payload_after={"estado": "dado_de_baja"},
        ))

        return activo

    async def generar_qr_png(self, id: UUID, tenant_id: UUID) -> bytes:
        activo = await self.obtener(id, tenant_id)
        return await self._qr.generate_png(activo.id, activo.codigo)

    async def generar_qr_zpl(self, id: UUID, tenant_id: UUID) -> str:
        activo = await self.obtener(id, tenant_id)
        return await self._qr.generate_zpl(activo.id, activo.codigo, activo.nombre)

    async def calcular_depreciacion(
        self,
        tenant_id: UUID,
        *,
        grupo_id: Optional[UUID] = None,
        sucursal_id: Optional[UUID] = None,
    ) -> dict:
        activos, _ = await self._activos.list(
            tenant_id,
            grupo_id=grupo_id,
            sucursal_id=sucursal_id,
            estado="activo",
            page=1,
            page_size=1000,
        )

        items = []
        total_valor_adq = Decimal("0")
        total_dep_acum = Decimal("0")
        total_valor_libro = Decimal("0")

        for activo in activos:
            total_valor_adq += activo.valor_adquisicion
            total_dep_acum += activo.depreciacion_acumulada
            total_valor_libro += activo.valor_libro_actual

            items.append({
                "id": str(activo.id),
                "codigo": activo.codigo,
                "nombre": activo.nombre,
                "fecha_compra": activo.fecha_compra.isoformat() if activo.fecha_compra else None,
                "valor_adquisicion": float(activo.valor_adquisicion),
                "vida_util_meses": activo.vida_util_meses,
                "meses_en_uso": activo.meses_en_uso,
                "depreciacion_mensual": float(activo.depreciacion_mensual),
                "depreciacion_acumulada": float(activo.depreciacion_acumulada),
                "valor_libro_actual": float(activo.valor_libro_actual),
                "porcentaje_depreciado": float(activo.porcentaje_depreciado),
                "tabla_anual": [
                    {k: float(v) if isinstance(v, Decimal) else v for k, v in fila.items()}
                    for fila in activo.tabla_depreciacion_anual()
                ],
            })

        return {
            "items": items,
            "totales": {
                "valor_adquisicion": float(total_valor_adq),
                "depreciacion_acumulada": float(total_dep_acum),
                "valor_libro": float(total_valor_libro),
            }
        }

    async def obtener_kpis(self, tenant_id: UUID) -> dict:
        return await self._activos.get_kpis(tenant_id)

    async def subir_foto(
        self,
        id: UUID,
        tenant_id: UUID,
        usuario_id: UUID,
        filename: str,
        content: bytes,
        content_type: str,
    ) -> str:
        activo = await self.obtener(id, tenant_id)

        allowed = {"image/jpeg", "image/png", "image/webp"}
        if content_type not in allowed:
            raise ValidationError(f"Tipo de archivo no permitido: {content_type}")
        if len(content) > 10 * 1024 * 1024:
            raise ValidationError("El archivo no puede superar 10MB")

        foto_url = await self._storage.upload(tenant_id, filename, content, content_type)
        object.__setattr__(activo, "foto_url", foto_url)
        object.__setattr__(activo, "updated_at", datetime.utcnow())
        await self._activos.update(activo)

        return foto_url
