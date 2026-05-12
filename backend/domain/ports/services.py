"""Ports para servicios externos (no repositorios de datos)."""
from __future__ import annotations

from abc import ABC, abstractmethod
from uuid import UUID


class QRServicePort(ABC):
    """Generación de códigos QR para activos."""

    @abstractmethod
    async def generate_png(self, activo_id: UUID, codigo: str) -> bytes:
        """Genera PNG del QR. Retorna bytes de la imagen."""
        ...

    @abstractmethod
    async def generate_zpl(
        self, activo_id: UUID, codigo: str, nombre: str
    ) -> str:
        """
        Genera comando ZPL para impresoras Zebra.
        El ZPL incluye el QR code + código + nombre del activo.
        """
        ...


class StoragePort(ABC):
    """Almacenamiento de archivos (fotos y documentos de activos)."""

    @abstractmethod
    async def upload(
        self,
        tenant_id: UUID,
        filename: str,
        content: bytes,
        content_type: str,
    ) -> str:
        """
        Sube el archivo y retorna la URL de acceso.
        Para POC: ruta local. Para producción: S3/MinIO URL.
        """
        ...

    @abstractmethod
    async def delete(self, url: str) -> None:
        """Elimina el archivo del storage."""
        ...
