"""Entidad Activo — núcleo del dominio de Activo Fijo v2.0.
Sin dependencias externas (no importa FastAPI, PostgreSQL, ni infrastructure).
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal
from typing import List, Literal, Optional
from uuid import UUID


EstadoActivo = Literal["activo", "en_mantenimiento", "dado_de_baja"]


@dataclass
class Activo:
    """Bien tangible con vida útil > 1 año y sujeto a depreciación mensual (SLN).

    Invariantes:
        - valor_adquisicion > 0
        - vida_util_meses >= 12
        - valor_residual <= valor_adquisicion
        - codigo es inmutable una vez generado (RN-D2)
        - clase_id siempre tiene un grupo_id padre (RN-D4)
    """

    id: UUID
    tenant_id: UUID
    codigo: str          # Código compuesto auto-generado. INMUTABLE.
    nombre: str
    grupo_id: UUID
    clase_id: UUID
    sucursal_id: UUID
    valor_adquisicion: Decimal

    rubro_contable_id: Optional[UUID] = None
    marca: Optional[str] = None
    modelo: Optional[str] = None
    numero_serie: Optional[str] = None
    fecha_compra: Optional[date] = None
    vida_util_meses: int = 60
    valor_residual: Decimal = Decimal("0")
    foto_url: Optional[str] = None
    qr_url: Optional[str] = None
    centro_costo_id: Optional[UUID] = None   # Feature flag — ignorado al arranque
    estado: EstadoActivo = "activo"
    deleted_at: Optional[datetime] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)

    def __post_init__(self) -> None:
        self._validate()

    def _validate(self) -> None:
        if self.valor_adquisicion <= Decimal("0"):
            raise ValueError("valor_adquisicion debe ser > 0")
        if self.vida_util_meses < 12:
            raise ValueError("vida_util_meses debe ser >= 12")
        if self.valor_residual < Decimal("0"):
            raise ValueError("valor_residual debe ser >= 0")
        if self.valor_residual > self.valor_adquisicion:
            raise ValueError("valor_residual no puede ser mayor que valor_adquisicion")
        if not self.nombre or not self.nombre.strip():
            raise ValueError("nombre es requerido")

    # ── Depreciación mensual (SLN) ─────────────────────────────────────────

    @property
    def depreciacion_mensual(self) -> Decimal:
        """(valor_adq - valor_residual) / vida_util_meses"""
        if self.vida_util_meses == 0:
            return Decimal("0")
        return (self.valor_adquisicion - self.valor_residual) / Decimal(self.vida_util_meses)

    @property
    def meses_en_uso(self) -> int:
        if not self.fecha_compra:
            return 0
        hoy = date.today()
        return max(0, (hoy.year - self.fecha_compra.year) * 12 + (hoy.month - self.fecha_compra.month))

    @property
    def depreciacion_acumulada(self) -> Decimal:
        meses = min(self.meses_en_uso, self.vida_util_meses)
        acum = self.depreciacion_mensual * Decimal(str(meses))
        return min(acum, self.valor_adquisicion - self.valor_residual)

    @property
    def valor_libro_actual(self) -> Decimal:
        return max(self.valor_adquisicion - self.depreciacion_acumulada, self.valor_residual)

    @property
    def porcentaje_depreciado(self) -> Decimal:
        amortizable = self.valor_adquisicion - self.valor_residual
        if amortizable == Decimal("0"):
            return Decimal("100")
        return (self.depreciacion_acumulada / amortizable * Decimal("100")).quantize(Decimal("0.01"))

    @property
    def vida_util_años(self) -> int:
        return self.vida_util_meses // 12

    @property
    def esta_vigente(self) -> bool:
        return self.deleted_at is None and self.estado != "dado_de_baja"

    def tabla_depreciacion_anual(self) -> List[dict]:
        """Tabla resumida por año para la UI de depreciación."""
        if not self.fecha_compra:
            return []
        filas = []
        dep_mensual = self.depreciacion_mensual
        dep_acum = Decimal("0")
        max_dep = self.valor_adquisicion - self.valor_residual
        vida_años = self.vida_util_meses // 12 + (1 if self.vida_util_meses % 12 else 0)
        for n in range(1, vida_años + 1):
            meses_año = min(12, self.vida_util_meses - (n - 1) * 12)
            dep_año = dep_mensual * meses_año
            dep_acum = min(dep_acum + dep_año, max_dep)
            valor_libro = max(self.valor_adquisicion - dep_acum, self.valor_residual)
            filas.append({
                "año": self.fecha_compra.year + n,
                "depreciacion_anual": dep_año,
                "depreciacion_acumulada": dep_acum,
                "valor_libro": valor_libro,
            })
        return filas

    # ── Transiciones de estado ─────────────────────────────────────────────

    def iniciar_mantenimiento(self) -> None:
        if self.estado != "activo":
            raise ValueError(f"No se puede iniciar mantenimiento en estado '{self.estado}'")
        self.estado = "en_mantenimiento"
        self.updated_at = datetime.utcnow()

    def finalizar_mantenimiento(self) -> None:
        if self.estado != "en_mantenimiento":
            raise ValueError("El activo no está en mantenimiento")
        self.estado = "activo"
        self.updated_at = datetime.utcnow()

    def dar_de_baja(self) -> None:
        if self.estado == "dado_de_baja":
            raise ValueError("El activo ya está dado de baja")
        self.estado = "dado_de_baja"
        self.deleted_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()
