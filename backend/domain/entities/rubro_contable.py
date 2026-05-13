from __future__ import annotations
from dataclasses import dataclass
from datetime import datetime
from typing import Literal, Optional
from uuid import UUID


@dataclass
class RubroContable:
    """Clasificación contable según plan de cuentas (fuente: manual o Finansys).

    Invariantes:
        - codigo único por tenant_id
        - un rubro de origen 'finansys' no puede eliminarse (RN-D10)
    """
    id: UUID
    tenant_id: UUID
    codigo: str
    nombre: str
    origen: Literal["manual", "finansys"] = "manual"
    finansys_id: Optional[str] = None
    activo: bool = True
    deleted_at: Optional[datetime] = None

    def __post_init__(self) -> None:
        if not self.codigo or not self.codigo.strip():
            raise ValueError("codigo es requerido")
        if not self.nombre or not self.nombre.strip():
            raise ValueError("nombre es requerido")
        if self.origen not in ("manual", "finansys"):
            raise ValueError("origen debe ser 'manual' o 'finansys'")

    def deshabilitar(self) -> None:
        self.activo = False

    def puede_eliminarse(self) -> bool:
        return self.origen == "manual"
