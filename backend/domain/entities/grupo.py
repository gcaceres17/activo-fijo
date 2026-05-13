from __future__ import annotations
from dataclasses import dataclass
from datetime import datetime
from typing import Optional
from uuid import UUID


@dataclass
class Grupo:
    """Primera categoría de clasificación de activos (ej: Muebles, Equipos de Informática).

    Invariantes:
        - codigo único por tenant_id
        - nombre requerido y no vacío
    """
    id: UUID
    tenant_id: UUID
    codigo: str
    nombre: str
    deleted_at: Optional[datetime] = None

    def __post_init__(self) -> None:
        if not self.codigo or not self.codigo.strip():
            raise ValueError("codigo es requerido")
        if not self.nombre or not self.nombre.strip():
            raise ValueError("nombre es requerido")
        if len(self.codigo) > 20:
            raise ValueError("codigo no puede superar 20 caracteres")
