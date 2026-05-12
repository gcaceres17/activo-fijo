from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional
from uuid import UUID


@dataclass
class CentroCosto:
    """Unidad contable para agrupación de gastos de activos."""
    id: UUID
    tenant_id: UUID
    codigo: str                  # TEC-001, FIN-002
    nombre: str                  # Tecnología e Innovación
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    deleted_at: Optional[datetime] = None

    def __post_init__(self) -> None:
        if not self.codigo or not self.codigo.strip():
            raise ValueError("codigo es requerido")
        if not self.nombre or not self.nombre.strip():
            raise ValueError("nombre es requerido")
