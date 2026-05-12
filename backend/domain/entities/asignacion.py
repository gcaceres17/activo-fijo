from __future__ import annotations
from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Literal, Optional
from uuid import UUID


EstadoAsignacion = Literal["vigente", "baja"]


@dataclass
class Asignacion:
    """
    Asignación formal de un activo a un empleado o área.
    
    Invariantes:
        - Solo una asignación vigente por activo (enforced en DB y application)
        - fecha_baja >= fecha_asignacion si fecha_baja presente
        - Solo se puede asignar activos en estado 'activo' o 'reservado'
    """
    id: UUID
    tenant_id: UUID
    activo_id: UUID
    empleado_nombre: str
    area: str
    fecha_asignacion: date = field(default_factory=date.today)
    estado: EstadoAsignacion = "vigente"
    empleado_cedula: Optional[str] = None
    centro_costo_id: Optional[UUID] = None
    fecha_baja: Optional[date] = None
    observaciones: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)

    def __post_init__(self) -> None:
        if self.fecha_baja and self.fecha_baja < self.fecha_asignacion:
            raise ValueError("fecha_baja no puede ser anterior a fecha_asignacion")

    def dar_de_baja(self, fecha_baja: Optional[date] = None) -> None:
        if self.estado == "baja":
            raise ValueError("La asignación ya está dada de baja")
        self.estado = "baja"
        self.fecha_baja = fecha_baja or date.today()
        self.updated_at = datetime.utcnow()
