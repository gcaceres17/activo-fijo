from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, Literal, Optional
from uuid import UUID


TipoDispositivo = Literal["impresora_etiquetas", "movil_relevador"]
EstadoConexion = Literal["online", "offline", "desconocido"]


@dataclass
class Dispositivo:
    """Periférico para jornadas de inventario (impresoras Zebra, lectores Honeywell)."""
    id: UUID
    tenant_id: UUID
    nombre: str
    tipo: TipoDispositivo
    modelo: str
    ip_address: Optional[str] = None
    estado_conexion: EstadoConexion = "desconocido"
    ultimo_ping: Optional[datetime] = None
    config: Dict[str, Any] = field(default_factory=dict)
    deleted_at: Optional[datetime] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)

    def registrar_ping(self) -> None:
        self.estado_conexion = "online"
        self.ultimo_ping = datetime.utcnow()
        self.updated_at = datetime.utcnow()

    def marcar_offline(self) -> None:
        self.estado_conexion = "offline"
        self.updated_at = datetime.utcnow()
