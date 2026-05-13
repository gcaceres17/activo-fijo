"""Router FastAPI para Sucursales."""
from __future__ import annotations

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from adapters.api.dependencies import get_current_user, get_sucursal_uc
from domain.exceptions import ConflictError, NotFoundError

router = APIRouter(prefix="/v1/sucursales", tags=["Sucursales"])


class SucursalCreate(BaseModel):
    codigo: str = Field(..., min_length=1, max_length=20)
    nombre: str = Field(..., min_length=1, max_length=100)
    nivel: int = Field(1, ge=1, le=3)
    parent_id: Optional[UUID] = None


class SucursalResponse(BaseModel):
    id: UUID
    codigo: str
    nombre: str
    nivel: int
    parent_id: Optional[UUID]


@router.get("", response_model=List[SucursalResponse])
async def list_sucursales(
    current_user=Depends(get_current_user),
    uc=Depends(get_sucursal_uc),
):
    return [
        SucursalResponse(id=s.id, codigo=s.codigo, nombre=s.nombre,
                          nivel=s.nivel, parent_id=s.parent_id)
        for s in await uc.listar(current_user.tenant_id)
    ]


@router.post("", response_model=SucursalResponse, status_code=status.HTTP_201_CREATED)
async def create_sucursal(
    body: SucursalCreate,
    current_user=Depends(get_current_user),
    uc=Depends(get_sucursal_uc),
):
    try:
        s = await uc.crear(
            current_user.tenant_id, current_user.id,
            body.codigo, body.nombre, body.nivel, body.parent_id,
        )
        return SucursalResponse(id=s.id, codigo=s.codigo, nombre=s.nombre,
                                 nivel=s.nivel, parent_id=s.parent_id)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except (ConflictError, ValueError) as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.put("/{id}", response_model=SucursalResponse)
async def update_sucursal(
    id: UUID,
    body: SucursalCreate,
    current_user=Depends(get_current_user),
    uc=Depends(get_sucursal_uc),
):
    try:
        s = await uc.actualizar(
            id, current_user.tenant_id, current_user.id,
            body.codigo, body.nombre, body.nivel, body.parent_id,
        )
        return SucursalResponse(id=s.id, codigo=s.codigo, nombre=s.nombre,
                                 nivel=s.nivel, parent_id=s.parent_id)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except (ConflictError, ValueError) as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_sucursal(
    id: UUID,
    current_user=Depends(get_current_user),
    uc=Depends(get_sucursal_uc),
):
    try:
        await uc.eliminar(id, current_user.tenant_id, current_user.id)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
