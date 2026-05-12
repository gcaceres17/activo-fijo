import uuid as _uuid
from datetime import datetime
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from adapters.api.dependencies import get_current_user
from infrastructure.database.connection import get_pool
from domain.entities import Dispositivo

router = APIRouter(prefix="/v1/dispositivos", tags=["Dispositivos"])

class DispositivoCreate(BaseModel):
    nombre: str
    tipo: str = Field(..., pattern="^(impresora|lector_qr|lector_barcode)$")
    protocolo: str = Field(..., pattern="^(usb|tcp_ip|bluetooth|usb_hid)$")
    driver: str = None
    ip_address: str = None

def _to_dict(d):
    return {"id": str(d.id), "nombre": d.nombre, "tipo": d.tipo, "protocolo": d.protocolo,
            "driver": d.driver, "ip_address": d.ip_address, "estado": d.estado,
            "ultima_conexion": d.ultima_conexion.isoformat() if d.ultima_conexion else None}

async def _get_repo():
    from infrastructure.repositories.dispositivo_repository import PostgreSQLDispositivoRepository
    pool = await get_pool()
    return PostgreSQLDispositivoRepository(pool)

@router.get("")
async def list_dispositivos(current_user=Depends(get_current_user)):
    repo = await _get_repo()
    items = await repo.list(current_user.tenant_id)
    return [_to_dict(d) for d in items]

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_dispositivo(body: DispositivoCreate, current_user=Depends(get_current_user)):
    repo = await _get_repo()
    now = datetime.utcnow()
    d = Dispositivo(id=_uuid.uuid4(), tenant_id=current_user.tenant_id, nombre=body.nombre,
                    tipo=body.tipo, protocolo=body.protocolo, driver=body.driver,
                    ip_address=body.ip_address, created_at=now, updated_at=now)
    d = await repo.create(d)
    return _to_dict(d)
