from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime
from typing import Literal, Optional
from uuid import UUID


RolUsuario = Literal["sysadmin_clt", "admin_banco", "operador", "auditor", "relevador", "admin"]


@dataclass
class Usuario:
    """Usuario del sistema con rol RBAC y acceso a un tenant específico."""
    id: UUID
    tenant_id: UUID
    email: str
    nombre_completo: str
    rol: RolUsuario = "operador"
    activo: bool = True
    ad_subject: Optional[str] = None
    ultimo_login: Optional[datetime] = None
    deleted_at: Optional[datetime] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)

    def puede_escribir(self) -> bool:
        return self.activo and self.rol in ("sysadmin_clt", "admin_banco", "operador", "admin")

    def puede_administrar(self) -> bool:
        return self.activo and self.rol in ("sysadmin_clt", "admin_banco", "admin")

    def puede_auditar(self) -> bool:
        return self.activo and self.rol in ("sysadmin_clt", "admin_banco", "auditor", "admin")

    def es_relevador(self) -> bool:
        return self.activo and self.rol == "relevador"

    def es_sysadmin(self) -> bool:
        return self.activo and self.rol == "sysadmin_clt"
