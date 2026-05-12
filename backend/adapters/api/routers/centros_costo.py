import uuid as _uuid
from datetime import datetime
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from adapters.api.dependencies import get_current_user
from infrastructure.repositories import PostgreSQLCentroCostoRepository
from infrastructure.database.connection import get_pool
from domain.entities import CentroCosto

router = APIRouter(prefix="/v1/centros-costo", tags=["Centros de Costo"])

class CCCreate(BaseModel):
    codigo: str = Field(..., min_length=1, max_length=20)
    nombre: str = Field(..., min_length=1, max_length=150)

def _to_dict(cc): return {"id": str(cc.id), "codigo": cc.codigo, "nombre": cc.nombre}

@router.get("")
async def list_centros(current_user=Depends(get_current_user)):
    pool = await get_pool()
    ccs = await PostgreSQLCentroCostoRepository(pool).list(current_user.tenant_id)
    return [_to_dict(cc) for cc in ccs]

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_centro(body: CCCreate, current_user=Depends(get_current_user)):
    pool = await get_pool()
    now = datetime.utcnow()
    cc = CentroCosto(id=_uuid.uuid4(), tenant_id=current_user.tenant_id,
                     codigo=body.codigo, nombre=body.nombre, created_at=now, updated_at=now)
    cc = await PostgreSQLCentroCostoRepository(pool).create(cc)
    return _to_dict(cc)
