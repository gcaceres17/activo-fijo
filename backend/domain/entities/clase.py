from __future__ import annotations
from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID


@dataclass
class Clase:
    """Subcategoría dentro de un Grupo (ej: Laptops dentro de Equipos de Informática).

    Invariantes:
        - grupo_id requerido: una Clase siempre tiene un Grupo padre (RN-D4)
        - codigo único por (tenant_id, grupo_id)
        - tasa_depreciacion entre 0 y 1 si está presente
    """
    id: UUID
    tenant_id: UUID
    grupo_id: UUID
    codigo: str
    nombre: str
    tasa_depreciacion: Optional[Decimal] = None
    deleted_at: Optional[datetime] = None

    def __post_init__(self) -> None:
        if not self.codigo or not self.codigo.strip():
            raise ValueError("codigo es requerido")
        if not self.nombre or not self.nombre.strip():
            raise ValueError("nombre es requerido")
        if self.tasa_depreciacion is not None:
            if self.tasa_depreciacion < Decimal("0") or self.tasa_depreciacion > Decimal("1"):
                raise ValueError("tasa_depreciacion debe estar entre 0 y 1")
