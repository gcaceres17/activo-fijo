import uuid as _uuid
from datetime import datetime
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from adapters.api.dependencies import get_current_user
from infrastructure.repositories import PostgreSQLCategoriaRepository
from infrastructure.database.connection import get_pool
from domain.entities import Categoria

router = APIRouter(prefix="/v1/categorias", tags=["Categorías"])

class CategoriaCreate(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=100)
    icono: str = "package"
    color_hex: str = "#6874B5"
    vida_util_default_años: int = Field(5, ge=1)

@router.get("")
async def list_categorias(current_user=Depends(get_current_user)):
    pool = await get_pool()
    repo = PostgreSQLCategoriaRepository(pool)
    cats = await repo.list(current_user.tenant_id)
    return [{"id": str(c.id), "nombre": c.nombre, "icono": c.icono,
             "color_hex": c.color_hex, "vida_util_default_años": c.vida_util_default_años} for c in cats]

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_categoria(body: CategoriaCreate, current_user=Depends(get_current_user)):
    pool = await get_pool()
    repo = PostgreSQLCategoriaRepository(pool)
    now = datetime.utcnow()
    cat = Categoria(id=_uuid.uuid4(), tenant_id=current_user.tenant_id,
                    nombre=body.nombre, icono=body.icono, color_hex=body.color_hex,
                    vida_util_default_años=body.vida_util_default_años,
                    created_at=now, updated_at=now)
    cat = await repo.create(cat)
    return {"id": str(cat.id), "nombre": cat.nombre, "icono": cat.icono,
            "color_hex": cat.color_hex, "vida_util_default_años": cat.vida_util_default_años}

@router.put("/{id}")
async def update_categoria(id: UUID, body: CategoriaCreate, current_user=Depends(get_current_user)):
    pool = await get_pool()
    repo = PostgreSQLCategoriaRepository(pool)
    cat = await repo.get_by_id(id, current_user.tenant_id)
    if not cat:
        raise HTTPException(404, "Categoría no encontrada")
    cat.nombre = body.nombre; cat.icono = body.icono
    cat.color_hex = body.color_hex; cat.vida_util_default_años = body.vida_util_default_años
    cat = await repo.update(cat)
    return {"id": str(cat.id), "nombre": cat.nombre, "icono": cat.icono,
            "color_hex": cat.color_hex, "vida_util_default_años": cat.vida_util_default_años}
