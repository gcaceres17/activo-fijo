from __future__ import annotations
from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal
from typing import Literal, Optional
from uuid import UUID


TipoMantenimiento = Literal["preventivo", "correctivo", "predictivo"]
EstadoMantenimiento = Literal["programado", "en_proceso", "completado", "cancelado"]


@dataclass
class Mantenimiento:
    """
    Registro de intervención de mantenimiento sobre un activo.
    
    Invariantes:
        - costo >= 0
        - Al pasar a 'completado', fecha_fin_real debe establecerse
        - Un activo dado_de_baja no puede tener mantenimientos nuevos
    """
    id: UUID
    tenant_id: UUID
    activo_id: UUID
    tipo: TipoMantenimiento
    descripcion: str
    tecnico: str
    fecha_inicio: date = field(default_factory=date.today)
    estado: EstadoMantenimiento = "programado"
    proveedor: Optional[str] = None
    fecha_estimada_fin: Optional[date] = None
    fecha_fin_real: Optional[date] = None
    costo: Decimal = Decimal("0")
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)

    def __post_init__(self) -> None:
        if self.costo < Decimal("0"):
            raise ValueError("costo debe ser >= 0")

    def iniciar(self) -> None:
        if self.estado != "programado":
            raise ValueError(f"No se puede iniciar desde estado '{self.estado}'")
        self.estado = "en_proceso"
        self.updated_at = datetime.utcnow()

    def completar(self, fecha_fin: Optional[date] = None, costo_final: Optional[Decimal] = None) -> None:
        if self.estado not in ("programado", "en_proceso"):
            raise ValueError(f"No se puede completar desde estado '{self.estado}'")
        self.estado = "completado"
        self.fecha_fin_real = fecha_fin or date.today()
        if costo_final is not None:
            if costo_final < Decimal("0"):
                raise ValueError("costo_final debe ser >= 0")
            self.costo = costo_final
        self.updated_at = datetime.utcnow()

    def cancelar(self) -> None:
        if self.estado == "completado":
            raise ValueError("No se puede cancelar un mantenimiento ya completado")
        self.estado = "cancelado"
        self.updated_at = datetime.utcnow()
