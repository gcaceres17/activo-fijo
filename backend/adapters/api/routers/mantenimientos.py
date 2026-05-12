from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from adapters.api.schemas.activo_schemas import MantenimientoCreate, MantenimientoUpdate
from adapters.api.dependencies import get_mantenimiento_uc, get_current_user
from domain.exceptions import ConflictError, NotFoundError

router = APIRouter(prefix="/v1/mantenimientos", tags=["Mantenimientos"])

@router.get("")
async def list_mantenimientos(
    page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100),
    estado: Optional[str] = None, activo_id: Optional[UUID] = None,
    current_user=Depends(get_current_user), uc=Depends(get_mantenimiento_uc),
):
    import math
    items, total = await uc.listar(current_user.tenant_id, estado=estado,
                                    activo_id=activo_id, page=page, page_size=page_size)
    return {"items": [_mnt_to_dict(m) for m in items], "total": total,
            "page": page, "total_pages": math.ceil(total / page_size) if total else 0}

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_mantenimiento(body: MantenimientoCreate,
    current_user=Depends(get_current_user), uc=Depends(get_mantenimiento_uc)):
    try:
        m = await uc.registrar(tenant_id=current_user.tenant_id,
                               usuario_email=current_user.email, **body.model_dump())
        return _mnt_to_dict(m)
    except (NotFoundError, ConflictError) as e:
        raise HTTPException(409 if isinstance(e, ConflictError) else 404, str(e))

@router.patch("/{id}")
async def update_mantenimiento(id: UUID, body: MantenimientoUpdate,
    current_user=Depends(get_current_user), uc=Depends(get_mantenimiento_uc)):
    try:
        if body.estado == "completado":
            m = await uc.cerrar(id, current_user.tenant_id, current_user.email,
                                body.fecha_fin_real, body.costo)
        else:
            mnt = await uc.obtener(id, current_user.tenant_id)
            if body.estado: mnt.estado = body.estado
            if body.descripcion: mnt.descripcion = body.descripcion
            from infrastructure.repositories import PostgreSQLMantenimientoRepository
            from infrastructure.database.connection import get_pool
            pool = await get_pool()
            repo = PostgreSQLMantenimientoRepository(pool)
            m = await repo.update(mnt)
        return _mnt_to_dict(m)
    except NotFoundError as e:
        raise HTTPException(404, str(e))

def _mnt_to_dict(m):
    return {"id": str(m.id), "activo_id": str(m.activo_id), "tipo": m.tipo,
            "descripcion": m.descripcion, "tecnico": m.tecnico, "proveedor": m.proveedor,
            "fecha_inicio": m.fecha_inicio.isoformat() if m.fecha_inicio else None,
            "fecha_estimada_fin": m.fecha_estimada_fin.isoformat() if m.fecha_estimada_fin else None,
            "fecha_fin_real": m.fecha_fin_real.isoformat() if m.fecha_fin_real else None,
            "costo": float(m.costo), "estado": m.estado,
            "created_at": m.created_at.isoformat()}
