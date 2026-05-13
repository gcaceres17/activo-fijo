from __future__ import annotations
from dataclasses import dataclass
from datetime import datetime
from typing import Optional
from uuid import UUID


@dataclass
class Sucursal:
    """Dimensión geográfica/organizacional (Casa Matriz, San Lorenzo, etc.).

    Invariantes:
        - codigo único por tenant_id
        - nivel entre 1 y 3 (RN-D5)
        - parent_id solo permitido si nivel > 1
    """
    id: UUID
    tenant_id: UUID
    codigo: str
    nombre: str
    nivel: int = 1
    parent_id: Optional[UUID] = None
    deleted_at: Optional[datetime] = None

    def __post_init__(self) -> None:
        if not self.codigo or not self.codigo.strip():
            raise ValueError("codigo es requerido")
        if not self.nombre or not self.nombre.strip():
            raise ValueError("nombre es requerido")
        if self.nivel not in (1, 2, 3):
            raise ValueError("nivel debe ser 1, 2 o 3")
        if self.nivel == 1 and self.parent_id is not None:
            raise ValueError("una sucursal de nivel 1 no puede tener parent_id")
        if self.nivel > 1 and self.parent_id is None:
            raise ValueError(f"una sucursal de nivel {self.nivel} requiere parent_id")
