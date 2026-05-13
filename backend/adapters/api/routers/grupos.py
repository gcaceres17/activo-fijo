"""Router FastAPI para Grupos y Clases (taxonomía)."""
from __future__ import annotations

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from decimal import Decimal

from adapters.api.dependencies import get_current_user, get_grupo_uc
from domain.exceptions import ConflictError, NotFoundError

router = APIRouter(prefix="/v1/taxonomia", tags=["Taxonomía"])


# ── Schemas inline ─────────────────────────────────────────────────────────

class GrupoCreate(BaseModel):
    codigo: str = Field(..., min_length=2, max_length=10)
    nombre: str = Field(..., min_length=1, max_length=100)


class GrupoResponse(BaseModel):
    id: UUID
    codigo: str
    nombre: str


class ClaseCreate(BaseModel):
    codigo: str = Field(..., min_length=2, max_length=20)
    nombre: str = Field(..., min_length=1, max_length=100)
    tasa_depreciacion: Optional[Decimal] = Field(None, ge=Decimal("0"), le=Decimal("1"))


class ClaseResponse(BaseModel):
    id: UUID
    grupo_id: UUID
    codigo: str
    nombre: str
    tasa_depreciacion: Optional[Decimal]


# ── Grupos ──────────────────────────────────────────────────────────────────

@router.get("/grupos", response_model=List[GrupoResponse])
async def list_grupos(
    current_user=Depends(get_current_user),
    uc=Depends(get_grupo_uc),
):
    return await uc.listar_grupos(current_user.tenant_id)


@router.post("/grupos", response_model=GrupoResponse, status_code=status.HTTP_201_CREATED)
async def create_grupo(
    body: GrupoCreate,
    current_user=Depends(get_current_user),
    uc=Depends(get_grupo_uc),
):
    try:
        grupo = await uc.crear_grupo(current_user.tenant_id, current_user.id, body.codigo, body.nombre)
        return GrupoResponse(id=grupo.id, codigo=grupo.codigo, nombre=grupo.nombre)
    except ConflictError as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.put("/grupos/{id}", response_model=GrupoResponse)
async def update_grupo(
    id: UUID,
    body: GrupoCreate,
    current_user=Depends(get_current_user),
    uc=Depends(get_grupo_uc),
):
    try:
        grupo = await uc.actualizar_grupo(id, current_user.tenant_id, current_user.id, body.codigo, body.nombre)
        return GrupoResponse(id=grupo.id, codigo=grupo.codigo, nombre=grupo.nombre)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ConflictError as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.delete("/grupos/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_grupo(
    id: UUID,
    current_user=Depends(get_current_user),
    uc=Depends(get_grupo_uc),
):
    try:
        await uc.eliminar_grupo(id, current_user.tenant_id, current_user.id)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ConflictError as e:
        raise HTTPException(status_code=409, detail=str(e))


# ── Clases ──────────────────────────────────────────────────────────────────

@router.get("/grupos/{grupo_id}/clases", response_model=List[ClaseResponse])
async def list_clases(
    grupo_id: UUID,
    current_user=Depends(get_current_user),
    uc=Depends(get_grupo_uc),
):
    return [
        ClaseResponse(id=c.id, grupo_id=c.grupo_id, codigo=c.codigo,
                      nombre=c.nombre, tasa_depreciacion=c.tasa_depreciacion)
        for c in await uc.listar_clases(current_user.tenant_id, grupo_id=grupo_id)
    ]


@router.get("/clases", response_model=List[ClaseResponse])
async def list_all_clases(
    current_user=Depends(get_current_user),
    uc=Depends(get_grupo_uc),
):
    return [
        ClaseResponse(id=c.id, grupo_id=c.grupo_id, codigo=c.codigo,
                      nombre=c.nombre, tasa_depreciacion=c.tasa_depreciacion)
        for c in await uc.listar_clases(current_user.tenant_id)
    ]


@router.post("/grupos/{grupo_id}/clases", response_model=ClaseResponse, status_code=status.HTTP_201_CREATED)
async def create_clase(
    grupo_id: UUID,
    body: ClaseCreate,
    current_user=Depends(get_current_user),
    uc=Depends(get_grupo_uc),
):
    try:
        clase = await uc.crear_clase(
            current_user.tenant_id, current_user.id,
            grupo_id, body.codigo, body.nombre, body.tasa_depreciacion,
        )
        return ClaseResponse(id=clase.id, grupo_id=clase.grupo_id, codigo=clase.codigo,
                              nombre=clase.nombre, tasa_depreciacion=clase.tasa_depreciacion)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ConflictError as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.put("/clases/{id}", response_model=ClaseResponse)
async def update_clase(
    id: UUID,
    body: ClaseCreate,
    tasa_depreciacion: Optional[Decimal] = None,
    current_user=Depends(get_current_user),
    uc=Depends(get_grupo_uc),
):
    try:
        clase = await uc.actualizar_clase(
            id, current_user.tenant_id, current_user.id,
            body.codigo, body.nombre, tasa_depreciacion,
        )
        return ClaseResponse(id=clase.id, grupo_id=clase.grupo_id, codigo=clase.codigo,
                              nombre=clase.nombre, tasa_depreciacion=clase.tasa_depreciacion)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ConflictError as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.delete("/clases/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_clase(
    id: UUID,
    current_user=Depends(get_current_user),
    uc=Depends(get_grupo_uc),
):
    try:
        await uc.eliminar_clase(id, current_user.tenant_id, current_user.id)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
