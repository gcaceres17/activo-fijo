"""Implementación concreta de QRServicePort usando la librería qrcode."""
from __future__ import annotations

import io
from uuid import UUID

from domain.ports.services import QRServicePort


class QRCodeService(QRServicePort):
    """
    Genera QR codes para activos.
    - PNG: para pantalla y descarga
    - ZPL: para impresoras Zebra en jornadas de inventario
    """

    async def generate_png(self, activo_id: UUID, codigo: str) -> bytes:
        try:
            import qrcode
            from qrcode.image.pure import PyPNGImage
        except ImportError:
            raise RuntimeError("Instalar: pip install qrcode[pil] Pillow")

        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=10,
            border=4,
        )
        # El QR contiene solo el ID del activo (UUID), no datos sensibles
        qr.add_data(str(activo_id))
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white")
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        return buf.getvalue()

    async def generate_zpl(
        self, activo_id: UUID, codigo: str, nombre: str
    ) -> str:
        """
        Genera ZPL para Zebra ZD421 / ZT230.
        Incluye: QR code + código del activo + nombre (truncado a 30 chars).
        """
        nombre_corto = nombre[:30] if len(nombre) > 30 else nombre
        zpl = f"""^XA
^FO50,30^BQN,2,5^FDMA,{activo_id}^FS
^FO200,30^A0N,28,28^FD{codigo}^FS
^FO200,70^A0N,20,20^FD{nombre_corto}^FS
^XZ"""
        return zpl


class LocalStorageAdapter:
    """
    Almacenamiento local de archivos para POC.
    Para producción: reemplazar con S3StorageAdapter.
    """

    def __init__(self, base_path: str = "./storage") -> None:
        self._base = base_path

    async def upload(
        self,
        tenant_id: UUID,
        filename: str,
        content: bytes,
        content_type: str,
    ) -> str:
        from pathlib import Path
        path = Path(self._base) / str(tenant_id) / filename
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)
        return f"/static/{tenant_id}/{filename}"

    async def delete(self, url: str) -> None:
        from pathlib import Path
        # Convertir URL a path local
        parts = url.lstrip("/static/").split("/", 1)
        if len(parts) == 2:
            path = Path(self._base) / parts[0] / parts[1]
            if path.exists():
                path.unlink()
