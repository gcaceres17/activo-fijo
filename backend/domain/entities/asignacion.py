from __future__ import annotations
from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Optional
from uuid import UUID


@dataclass
class Asignacion:
    """Vinculación activo ↔ responsable/área. Solo una vigente por activo (RN-D1).

    Invariantes:
        - RN-D1: solo una asignación con vigente=True por activo (DB constraint)
        - fecha_fin >= fecha_inicio si fecha_fin presente
    """
    id: UUID
    tenant_id: UUID
    activo_id: UUID
    responsable_nombre: str
    sucursal_id: UUID
    fecha_inicio: date = field(default_factory=date.today)
    vigente: bool = True
    responsable_codigo: Optional[str] = None
    fecha_fin: Optional[date] = None
    created_at: datetime = field(default_factory=datetime.utcnow)

    def __post_init__(self) -> None:
        if not self.responsable_nombre or not self.responsable_nombre.strip():
            raise ValueError("responsable_nombre es requerido")
        if self.fecha_fin and self.fecha_fin < self.fecha_inicio:
            raise ValueError("fecha_fin no puede ser anterior a fecha_inicio")

    def dar_de_baja(self, fecha_fin: Optional[date] = None) -> None:
        if not self.vigente:
            raise ValueError("La asignación ya está dada de baja")
        self.vigente = False
        self.fecha_fin = fecha_fin or date.today()
