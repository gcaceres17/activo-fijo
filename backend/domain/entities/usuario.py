from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime
from typing import Literal, Optional
from uuid import UUID


RolUsuario = Literal["admin", "operador", "auditor"]


@dataclass
class Usuario:
    """Usuario del sistema con rol y acceso a un tenant específico."""
    id: UUID
    tenant_id: UUID
    email: str
    nombre_completo: str
    rol: RolUsuario = "operador"
    activo: bool = True
    ultimo_login: Optional[datetime] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    # password_hash vive solo en infrastructure, nunca en el dominio

    def puede_escribir(self) -> bool:
        return self.activo and self.rol in ("admin", "operador")

    def puede_administrar(self) -> bool:
        return self.activo and self.rol == "admin"

    def puede_auditar(self) -> bool:
        return self.activo and self.rol in ("admin", "auditor")
