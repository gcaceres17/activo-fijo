import math
from typing import Optional
from uuid import UUID
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query, status
from adapters.api.schemas.activo_schemas import AsignacionCreate
from adapters.api.dependencies import get_asignacion_uc, get_current_user
from domain.exceptions import ConflictError, NotFoundError

router = APIRouter(prefix="/v1/asignaciones", tags=["Asignaciones"])


@router.get("")
async def list_asignaciones(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    activo_id: Optional[UUID] = None,
    sucursal_id: Optional[UUID] = None,
    solo_vigentes: bool = False,
    current_user=Depends(get_current_user),
    uc=Depends(get_asignacion_uc),
):
    items, total = await uc.listar(
        current_user.tenant_id,
        activo_id=activo_id, sucursal_id=sucursal_id,
        solo_vigentes=solo_vigentes, page=page, page_size=page_size,
    )
    return {
        "items": [_asig_to_dict(a) for a in items],
        "total": total, "page": page, "page_size": page_size,
        "total_pages": math.ceil(total / page_size) if total else 0,
    }


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_asignacion(
    body: AsignacionCreate,
    current_user=Depends(get_current_user),
    uc=Depends(get_asignacion_uc),
):
    try:
        a = await uc.asignar(
            tenant_id=current_user.tenant_id,
            usuario_id=current_user.id,
            **body.model_dump(),
        )
        return _asig_to_dict(a)
    except NotFoundError as e:
        raise HTTPException(404, str(e))
    except ConflictError as e:
        raise HTTPException(409, str(e))


@router.patch("/{id}/baja")
async def baja_asignacion(
    id: UUID,
    fecha_fin: Optional[date] = None,
    current_user=Depends(get_current_user),
    uc=Depends(get_asignacion_uc),
):
    try:
        a = await uc.dar_de_baja(id, current_user.tenant_id, current_user.id, fecha_fin)
        return _asig_to_dict(a)
    except NotFoundError as e:
        raise HTTPException(404, str(e))


def _asig_to_dict(a):
    return {
        "id": str(a.id),
        "activo_id": str(a.activo_id),
        "responsable_nombre": a.responsable_nombre,
        "responsable_codigo": a.responsable_codigo,
        "sucursal_id": str(a.sucursal_id),
        "fecha_inicio": a.fecha_inicio.isoformat() if a.fecha_inicio else None,
        "fecha_fin": a.fecha_fin.isoformat() if a.fecha_fin else None,
        "vigente": a.vigente,
        "created_at": a.created_at.isoformat(),
    }
