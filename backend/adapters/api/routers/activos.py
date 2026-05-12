"""Router FastAPI para Activos — adaptador de entrada."""
from __future__ import annotations

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from fastapi.responses import Response

from adapters.api.schemas.activo_schemas import ActivoCreate, ActivoUpdate, ActivoResponse, PaginatedActivos
from adapters.api.dependencies import get_activo_uc, get_asignacion_repo, get_current_user
from domain.exceptions import ConflictError, NotFoundError, ValidationError

router = APIRouter(prefix="/v1/activos", tags=["Activos"])


@router.get("/kpis", summary="KPIs del dashboard")
async def get_kpis(
    current_user=Depends(get_current_user),
    uc=Depends(get_activo_uc),
):
    return await uc.obtener_kpis(current_user.tenant_id)


@router.get("/depreciacion", summary="Tabla de depreciación")
async def get_depreciacion(
    categoria_id: Optional[UUID] = None,
    area: Optional[str] = None,
    current_user=Depends(get_current_user),
    uc=Depends(get_activo_uc),
):
    return await uc.calcular_depreciacion(
        current_user.tenant_id, categoria_id=categoria_id, area=area
    )


@router.get("", response_model=PaginatedActivos, summary="Listar activos")
async def list_activos(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    q: Optional[str] = None,
    categoria_id: Optional[UUID] = None,
    estado: Optional[str] = None,
    centro_costo_id: Optional[UUID] = None,
    area: Optional[str] = None,
    current_user=Depends(get_current_user),
    uc=Depends(get_activo_uc),
):
    items, total = await uc.listar(
        current_user.tenant_id,
        categoria_id=categoria_id, estado=estado,
        centro_costo_id=centro_costo_id, area=area,
        q=q, page=page, page_size=page_size,
    )
    import math
    return PaginatedActivos(
        items=[ActivoResponse.from_entity(a) for a in items],
        total=total, page=page, page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )


@router.post("", response_model=ActivoResponse, status_code=status.HTTP_201_CREATED)
async def create_activo(
    body: ActivoCreate,
    current_user=Depends(get_current_user),
    uc=Depends(get_activo_uc),
):
    try:
        activo = await uc.registrar(
            tenant_id=current_user.tenant_id,
            usuario_email=current_user.email,
            **body.model_dump(),
        )
        return ActivoResponse.from_entity(activo)
    except (NotFoundError, ValidationError) as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ConflictError as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.get("/{id}", response_model=ActivoResponse)
async def get_activo(
    id: UUID,
    current_user=Depends(get_current_user),
    uc=Depends(get_activo_uc),
):
    try:
        return ActivoResponse.from_entity(await uc.obtener(id, current_user.tenant_id))
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/{id}", response_model=ActivoResponse)
async def update_activo(
    id: UUID,
    body: ActivoUpdate,
    current_user=Depends(get_current_user),
    uc=Depends(get_activo_uc),
):
    try:
        campos = {k: v for k, v in body.model_dump().items() if v is not None}
        activo = await uc.actualizar(id, current_user.tenant_id, current_user.email, **campos)
        return ActivoResponse.from_entity(activo)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ConflictError as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.delete("/{id}", summary="Dar de baja activo")
async def delete_activo(
    id: UUID,
    current_user=Depends(get_current_user),
    uc=Depends(get_activo_uc),
    asig_repo=Depends(get_asignacion_repo),
):
    try:
        await uc.dar_de_baja(id, current_user.tenant_id, current_user.email, asig_repo)
        return {"message": "Activo dado de baja exitosamente"}
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ConflictError as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.get("/{id}/qr", summary="Generar QR del activo")
async def get_qr(
    id: UUID,
    format: str = Query("png", pattern="^(png|zpl)$"),
    current_user=Depends(get_current_user),
    uc=Depends(get_activo_uc),
):
    try:
        if format == "png":
            png_bytes = await uc.generar_qr_png(id, current_user.tenant_id)
            return Response(content=png_bytes, media_type="image/png")
        else:
            zpl = await uc.generar_qr_zpl(id, current_user.tenant_id)
            return Response(content=zpl, media_type="text/plain")
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{id}/foto", summary="Subir foto del activo")
async def upload_foto(
    id: UUID,
    foto: UploadFile = File(...),
    current_user=Depends(get_current_user),
    uc=Depends(get_activo_uc),
):
    try:
        content = await foto.read()
        url = await uc.subir_foto(
            id, current_user.tenant_id, current_user.email,
            foto.filename, content, foto.content_type,
        )
        return {"foto_url": url}
    except (NotFoundError, ValidationError) as e:
        raise HTTPException(status_code=400, detail=str(e))
