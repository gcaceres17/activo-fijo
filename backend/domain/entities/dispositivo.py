from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime
from typing import Literal, Optional
from uuid import UUID


TipoDispositivo = Literal["impresora", "lector_qr", "lector_barcode"]
ProtocoloDispositivo = Literal["usb", "tcp_ip", "bluetooth", "usb_hid"]
EstadoDispositivo = Literal["conectado", "desconectado", "emparejado"]


@dataclass
class Dispositivo:
    """Periférico para jornadas de inventario (impresoras Zebra, lectores Honeywell)."""
    id: UUID
    tenant_id: UUID
    nombre: str
    tipo: TipoDispositivo
    protocolo: ProtocoloDispositivo
    estado: EstadoDispositivo = "desconectado"
    driver: Optional[str] = None
    ip_address: Optional[str] = None
    ultima_conexion: Optional[datetime] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)

    def marcar_conectado(self) -> None:
        self.estado = "conectado"
        self.ultima_conexion = datetime.utcnow()
        self.updated_at = datetime.utcnow()

    def marcar_desconectado(self) -> None:
        self.estado = "desconectado"
        self.updated_at = datetime.utcnow()
