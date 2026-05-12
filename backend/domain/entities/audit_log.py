from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime
from typing import Literal, Optional
from uuid import UUID


AccionAudit = Literal[
    "ALTA_ACTIVO", "MODIFICACION", "BAJA_ACTIVO",
    "ASIGNACION", "BAJA_ASIGNACION",
    "ALTA_MANTENIMIENTO", "CIERRE_MANTENIMIENTO",
    "CONSULTA_REPORTE", "CONSULTA_DEPRECIACION",
    "LOGIN", "LOGOUT", "EXPORTACION",
    "ALTA_CATEGORIA", "MODIFICACION_CATEGORIA",
    "ALTA_DISPOSITIVO", "MODIFICACION_DISPOSITIVO"
]


@dataclass(frozen=True)   # Inmutable — INV-6.1
class AuditLog:
    """
    Registro inmutable de toda acción realizada en el sistema.
    
    Invariantes:
        - Los audit logs NUNCA se modifican ni eliminan (append-only)
        - Toda operación de escritura genera al menos un AuditLog
        - frozen=True garantiza inmutabilidad en tiempo de ejecución
    """
    id: UUID
    tenant_id: UUID
    fecha_hora: datetime
    usuario_email: str
    accion: AccionAudit
    detalle: str = ""
    entidad: Optional[str] = None
    entidad_id: Optional[UUID] = None
    ip_origen: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
