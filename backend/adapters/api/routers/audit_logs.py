from typing import Optional
from fastapi import APIRouter, Depends, Query
from adapters.api.dependencies import get_current_user
from infrastructure.repositories import PostgreSQLAuditLogRepository
from infrastructure.database.connection import get_pool

router = APIRouter(prefix="/v1/audit-logs", tags=["Auditoría"])

@router.get("")
async def list_audit_logs(
    page: int = Query(1, ge=1), page_size: int = Query(50, ge=1, le=200),
    usuario_email: Optional[str] = None, accion: Optional[str] = None,
    current_user=Depends(get_current_user),
):
    import math
    pool = await get_pool()
    repo = PostgreSQLAuditLogRepository(pool)
    items, total = await repo.list(current_user.tenant_id, usuario_email=usuario_email,
                                    accion=accion, page=page, page_size=page_size)
    return {"items": [{"id": str(l.id), "fecha_hora": l.fecha_hora.isoformat(),
                        "usuario_email": l.usuario_email, "accion": l.accion,
                        "entidad": l.entidad, "entidad_id": str(l.entidad_id) if l.entidad_id else None,
                        "detalle": l.detalle, "ip_origen": l.ip_origen} for l in items],
            "total": total, "page": page, "total_pages": math.ceil(total/page_size) if total else 0}
