from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, Literal, Optional
from uuid import UUID


AccionAudit = Literal[
    "ALTA_ACTIVO", "MODIFICACION_ACTIVO", "BAJA_ACTIVO",
    "ASIGNACION", "BAJA_ASIGNACION", "TRANSFERENCIA",
    "ALTA_MANTENIMIENTO", "CIERRE_MANTENIMIENTO",
    "ALTA_GRUPO", "MODIFICACION_GRUPO",
    "ALTA_CLASE", "MODIFICACION_CLASE",
    "ALTA_SUCURSAL", "MODIFICACION_SUCURSAL",
    "ALTA_RUBRO", "MODIFICACION_RUBRO",
    "ALTA_DISPOSITIVO", "MODIFICACION_DISPOSITIVO",
    "INICIO_JORNADA", "CIERRE_JORNADA",
    "LOGIN", "LOGOUT", "EXPORTACION",
]


@dataclass(frozen=True)
class AuditLog:
    """Registro inmutable de toda acción realizada en el sistema (append-only)."""
    id: UUID
    tenant_id: UUID
    usuario_id: UUID
    accion: AccionAudit
    entidad: str
    entidad_id: UUID
    payload_before: Dict[str, Any] = field(default_factory=dict)
    payload_after: Dict[str, Any] = field(default_factory=dict)
    ip_address: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
