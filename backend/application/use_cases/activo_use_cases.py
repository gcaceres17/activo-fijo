"""
Use Cases para Activos — capa de aplicación.

Solo depende de domain/. No conoce FastAPI, PostgreSQL, ni asyncpg.
Orquesta las entidades del dominio a través de los ports.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import List, Optional, Tuple
from uuid import UUID

from domain.entities import Activo, AuditLog
from domain.exceptions import (
    BusinessRuleError, ConflictError, NotFoundError, ValidationError
)
from domain.ports import (
    ActivoRepositoryPort,
    AuditLogRepositoryPort,
    CategoriaRepositoryPort,
    CentroCostoRepositoryPort,
    QRServicePort,
    StoragePort,
)


class ActivoUseCases:
    """
    Agrupa todos los use cases relacionados con Activos.
    
    Principio SRP: cada método tiene una sola razón de cambio.
    Principio DIP: todas las dependencias son ports (abstracciones).
    """

    def __init__(
        self,
        activo_repo: ActivoRepositoryPort,
        categoria_repo: CategoriaRepositoryPort,
        centro_costo_repo: CentroCostoRepositoryPort,
        audit_repo: AuditLogRepositoryPort,
        qr_service: QRServicePort,
        storage: StoragePort,
    ) -> None:
        self._activos = activo_repo
        self._categorias = categoria_repo
        self._centros_costo = centro_costo_repo
        self._audit = audit_repo
        self._qr = qr_service
        self._storage = storage

    # ── UC-01: Registrar Activo ────────────────────────────────────────────

    async def registrar(
        self,
        tenant_id: UUID,
        usuario_email: str,
        nombre: str,
        categoria_id: UUID,
        valor_adquisicion: Decimal,
        vida_util_años: int = 5,
        valor_residual: Decimal = Decimal("0"),
        **kwargs,
    ) -> Activo:
        """UC-01: Registrar nuevo activo con generación automática de código."""

        # Validar categoría existe
        categoria = await self._categorias.get_by_id(categoria_id, tenant_id)
        if not categoria:
            raise NotFoundError("Categoria", str(categoria_id))

        # Validar centro de costo si se provee
        centro_costo_id = kwargs.get("centro_costo_id")
        if centro_costo_id:
            cc = await self._centros_costo.get_by_id(centro_costo_id, tenant_id)
            if not cc:
                raise NotFoundError("CentroCosto", str(centro_costo_id))

        # Verificar serie única en el tenant
        numero_serie = kwargs.get("numero_serie")
        if numero_serie:
            existente = await self._activos.get_by_serie(numero_serie, tenant_id)
            if existente:
                raise ConflictError(
                    f"Ya existe un activo con número de serie '{numero_serie}'"
                )

        # Generar código secuencial
        codigo = await self._activos.next_codigo(tenant_id)

        # Crear entidad de dominio (valida invariantes en __post_init__)
        activo = Activo(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            codigo=codigo,
            nombre=nombre,
            categoria_id=categoria_id,
            valor_adquisicion=valor_adquisicion,
            vida_util_años=vida_util_años,
            valor_residual=valor_residual,
            **{k: v for k, v in kwargs.items() if k != "numero_serie"},
            numero_serie=numero_serie,
        )

        # Persistir
        activo = await self._activos.create(activo)

        # Audit trail
        await self._audit.append(AuditLog(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            fecha_hora=datetime.utcnow(),
            usuario_email=usuario_email,
            accion="ALTA_ACTIVO",
            entidad="Activo",
            entidad_id=activo.id,
            detalle=f"Se registró el activo {activo.codigo}: {activo.nombre}",
        ))

        return activo

    # ── UC-02: Consultar Inventario ────────────────────────────────────────

    async def listar(
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
        """UC-02: Listar activos con filtros y paginación."""
        if page < 1:
            raise ValidationError("page debe ser >= 1")
        if page_size > 100:
            raise ValidationError("page_size no puede superar 100")

        return await self._activos.list(
            tenant_id,
            categoria_id=categoria_id,
            estado=estado,
            centro_costo_id=centro_costo_id,
            area=area,
            q=q,
            page=page,
            page_size=page_size,
        )

    # ── UC-03: Detalle de Activo ───────────────────────────────────────────

    async def obtener(self, id: UUID, tenant_id: UUID) -> Activo:
        """UC-03: Obtener activo por ID con todos sus datos."""
        activo = await self._activos.get_by_id(id, tenant_id)
        if not activo:
            raise NotFoundError("Activo", str(id))
        return activo

    # ── UC-04: Actualizar Activo ───────────────────────────────────────────

    async def actualizar(
        self,
        id: UUID,
        tenant_id: UUID,
        usuario_email: str,
        **campos,
    ) -> Activo:
        """UC-04: Actualizar campos de un activo existente."""
        activo = await self.obtener(id, tenant_id)

        if activo.estado == "dado_de_baja":
            raise ConflictError("No se puede modificar un activo dado de baja")

        # Aplicar cambios a la entidad
        for campo, valor in campos.items():
            if hasattr(activo, campo) and valor is not None:
                object.__setattr__(activo, campo, valor)
        activo.updated_at = datetime.utcnow()

        # Validar invariantes después de aplicar cambios
        activo._validate()

        activo = await self._activos.update(activo)

        await self._audit.append(AuditLog(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            fecha_hora=datetime.utcnow(),
            usuario_email=usuario_email,
            accion="MODIFICACION",
            entidad="Activo",
            entidad_id=activo.id,
            detalle=f"Modificado {activo.codigo}: campos {list(campos.keys())}",
        ))

        return activo

    # ── UC-05: Dar de Baja ─────────────────────────────────────────────────

    async def dar_de_baja(
        self,
        id: UUID,
        tenant_id: UUID,
        usuario_email: str,
        asignacion_repo,  # AsignacionRepositoryPort — evita import circular
    ) -> Activo:
        """UC-05: Dar de baja activo. Verifica que no tiene asignación vigente."""
        activo = await self.obtener(id, tenant_id)

        # Verificar asignación vigente
        asig_vigente = await asignacion_repo.get_vigente_by_activo(id, tenant_id)
        if asig_vigente:
            raise ConflictError(
                f"El activo tiene una asignación vigente a '{asig_vigente.empleado_nombre}'. "
                "Debe dar de baja la asignación antes de dar de baja el activo."
            )

        activo.dar_de_baja()
        activo = await self._activos.update(activo)

        await self._audit.append(AuditLog(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            fecha_hora=datetime.utcnow(),
            usuario_email=usuario_email,
            accion="BAJA_ACTIVO",
            entidad="Activo",
            entidad_id=activo.id,
            detalle=f"Activo {activo.codigo} dado de baja",
        ))

        return activo

    # ── UC-06: Generar QR ─────────────────────────────────────────────────

    async def generar_qr_png(self, id: UUID, tenant_id: UUID) -> bytes:
        """UC-06: Genera PNG del código QR del activo."""
        activo = await self.obtener(id, tenant_id)
        return await self._qr.generate_png(activo.id, activo.codigo)

    async def generar_qr_zpl(self, id: UUID, tenant_id: UUID) -> str:
        """UC-06b: Genera ZPL para impresoras Zebra."""
        activo = await self.obtener(id, tenant_id)
        return await self._qr.generate_zpl(activo.id, activo.codigo, activo.nombre)

    # ── UC-11: Calcular Depreciación ───────────────────────────────────────

    async def calcular_depreciacion(
        self,
        tenant_id: UUID,
        *,
        categoria_id: Optional[UUID] = None,
        area: Optional[str] = None,
    ) -> dict:
        """UC-11: Calcula tabla de depreciación para todos los activos del tenant."""
        activos, _ = await self._activos.list(
            tenant_id,
            categoria_id=categoria_id,
            area=area,
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
                "vida_util_años": activo.vida_util_años,
                "años_en_uso": activo.años_en_uso,
                "depreciacion_anual": float(activo.depreciacion_anual),
                "depreciacion_acumulada": float(activo.depreciacion_acumulada),
                "valor_libro_actual": float(activo.valor_libro_actual),
                "porcentaje_depreciado": float(activo.porcentaje_depreciado),
                "tabla_anual": [
                    {k: float(v) if isinstance(v, Decimal) else v for k, v in fila.items()}
                    for fila in activo.tabla_depreciacion()
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

    # ── UC-13: Dashboard KPIs ──────────────────────────────────────────────

    async def obtener_kpis(self, tenant_id: UUID) -> dict:
        """UC-13: KPIs del dashboard, consulta optimizada en PostgreSQL."""
        return await self._activos.get_kpis(tenant_id)

    # ── UC-14: Subir Foto ──────────────────────────────────────────────────

    async def subir_foto(
        self,
        id: UUID,
        tenant_id: UUID,
        usuario_email: str,
        filename: str,
        content: bytes,
        content_type: str,
    ) -> str:
        """UC-14: Sube foto del activo y actualiza la URL."""
        activo = await self.obtener(id, tenant_id)

        # Validar tipo de archivo
        allowed = {"image/jpeg", "image/png", "image/webp"}
        if content_type not in allowed:
            raise ValidationError(f"Tipo de archivo no permitido: {content_type}")

        # Validar tamaño (10MB)
        if len(content) > 10 * 1024 * 1024:
            raise ValidationError("El archivo no puede superar 10MB")

        # Subir al storage
        foto_url = await self._storage.upload(tenant_id, filename, content, content_type)

        # Actualizar activo
        activo.foto_url = foto_url
        activo.updated_at = datetime.utcnow()
        await self._activos.update(activo)

        return foto_url
