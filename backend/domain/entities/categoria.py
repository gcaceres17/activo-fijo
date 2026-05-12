from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional
from uuid import UUID


@dataclass
class Categoria:
    """Clasificación de activos fijos (equipos, muebles, vehículos, etc.)"""
    id: UUID
    tenant_id: UUID
    nombre: str
    icono: str = "package"
    color_hex: str = "#6874B5"
    vida_util_default_años: int = 5
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    deleted_at: Optional[datetime] = None

    def __post_init__(self) -> None:
        if not self.nombre or not self.nombre.strip():
            raise ValueError("nombre es requerido")
        if self.vida_util_default_años < 1:
            raise ValueError("vida_util_default_años debe ser >= 1")
        if not self.color_hex.startswith("#") or len(self.color_hex) != 7:
            raise ValueError("color_hex debe tener formato #RRGGBB")
