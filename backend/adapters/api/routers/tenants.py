"""Router para gestión del tenant: settings, features y usuarios."""
from __future__ import annotations

import uuid
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from decimal import Decimal

from adapters.api.dependencies import get_current_user, get_tenant_uc
from domain.entities import FEATURE_LABELS, FEATURES_DISPONIBLES
from domain.exceptions import ConflictError, NotFoundError, ValidationError

router = APIRouter(prefix="/v1/tenants", tags=["Tenants"])


# ── Schemas ──────────────────────────────────────────────────────────────────

class SettingsResponse(BaseModel):
    tenant_id: UUID
    logo_url: Optional[str]
    moneda: str
    zona_horaria: str
    ano_fiscal_inicio: int
    vida_util_default_meses: int
    valor_residual_pct: float
    prefijo_activo: str


class SettingsUpdate(BaseModel):
    logo_url: Optional[str] = None
    moneda: Optional[str] = Field(None, max_length=10)
    zona_horaria: Optional[str] = Field(None, max_length=60)
    ano_fiscal_inicio: Optional[int] = Field(None, ge=1, le=12)
    vida_util_default_meses: Optional[int] = Field(None, ge=1)
    valor_residual_pct: Optional[Decimal] = Field(None, ge=Decimal("0"), le=Decimal("1"))
    prefijo_activo: Optional[str] = Field(None, max_length=10)


class FeatureResponse(BaseModel):
    feature: str
    label: str
    habilitado: bool


class FeatureUpdate(BaseModel):
    habilitado: bool


class UsuarioCreate(BaseModel):
    email: str
    nombre_completo: str
    rol: str = "operador"
    password: str = Field(..., min_length=8)


class UsuarioUpdate(BaseModel):
    nombre_completo: Optional[str] = None
    rol: Optional[str] = None
    activo: Optional[bool] = None


class UsuarioResponse(BaseModel):
    id: UUID
    email: str
    nombre_completo: str
    rol: str
    activo: bool


# ── Endpoints: Settings ───────────────────────────────────────────────────────

@router.get("/me/settings", response_model=SettingsResponse)
async def get_settings(
    current_user=Depends(get_current_user),
    uc=Depends(get_tenant_uc),
):
    s = await uc.get_settings(current_user.tenant_id)
    return SettingsResponse(
        tenant_id=s.tenant_id, logo_url=s.logo_url,
        moneda=s.moneda, zona_horaria=s.zona_horaria,
        ano_fiscal_inicio=s.ano_fiscal_inicio,
        vida_util_default_meses=s.vida_util_default_meses,
        valor_residual_pct=float(s.valor_residual_pct),
        prefijo_activo=s.prefijo_activo,
    )


@router.patch("/me/settings", response_model=SettingsResponse)
async def update_settings(
    body: SettingsUpdate,
    current_user=Depends(get_current_user),
    uc=Depends(get_tenant_uc),
):
    if not current_user.puede_administrar():
        raise HTTPException(status_code=403, detail="Se requiere rol admin")
    try:
        s = await uc.update_settings(
            current_user.tenant_id, current_user.id,
            **body.model_dump(exclude_none=True),
        )
        return SettingsResponse(
            tenant_id=s.tenant_id, logo_url=s.logo_url,
            moneda=s.moneda, zona_horaria=s.zona_horaria,
            ano_fiscal_inicio=s.ano_fiscal_inicio,
            vida_util_default_meses=s.vida_util_default_meses,
            valor_residual_pct=float(s.valor_residual_pct),
            prefijo_activo=s.prefijo_activo,
        )
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── Endpoints: Features ───────────────────────────────────────────────────────

@router.get("/me/features", response_model=List[FeatureResponse])
async def get_features(
    current_user=Depends(get_current_user),
    uc=Depends(get_tenant_uc),
):
    features = await uc.get_features(current_user.tenant_id)
    return [
        FeatureResponse(
            feature=f.feature,
            label=FEATURE_LABELS.get(f.feature, f.feature),
            habilitado=f.habilitado,
        )
        for f in features
    ]


@router.patch("/me/features/{feature}", response_model=FeatureResponse)
async def set_feature(
    feature: str,
    body: FeatureUpdate,
    current_user=Depends(get_current_user),
    uc=Depends(get_tenant_uc),
):
    if not current_user.puede_administrar():
        raise HTTPException(status_code=403, detail="Se requiere rol admin")
    try:
        f = await uc.set_feature(
            current_user.tenant_id, current_user.id,
            feature, body.habilitado,
        )
        return FeatureResponse(
            feature=f.feature,
            label=FEATURE_LABELS.get(f.feature, f.feature),
            habilitado=f.habilitado,
        )
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── Endpoints: Usuarios ───────────────────────────────────────────────────────

@router.get("/me/usuarios", response_model=List[UsuarioResponse])
async def list_usuarios(
    current_user=Depends(get_current_user),
    uc=Depends(get_tenant_uc),
):
    if not current_user.puede_administrar():
        raise HTTPException(status_code=403, detail="Se requiere rol admin")
    usuarios = await uc.listar_usuarios(current_user.tenant_id)
    return [UsuarioResponse(id=u.id, email=u.email, nombre_completo=u.nombre_completo, rol=u.rol, activo=u.activo) for u in usuarios]


@router.post("/me/usuarios", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED)
async def create_usuario(
    body: UsuarioCreate,
    current_user=Depends(get_current_user),
    uc=Depends(get_tenant_uc),
):
    if not current_user.puede_administrar():
        raise HTTPException(status_code=403, detail="Se requiere rol admin")
    try:
        u = await uc.crear_usuario(
            current_user.tenant_id, current_user.id,
            body.email, body.nombre_completo, body.rol, body.password,
        )
        return UsuarioResponse(id=u.id, email=u.email, nombre_completo=u.nombre_completo, rol=u.rol, activo=u.activo)
    except ConflictError as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.patch("/me/usuarios/{id}", response_model=UsuarioResponse)
async def update_usuario(
    id: UUID,
    body: UsuarioUpdate,
    current_user=Depends(get_current_user),
    uc=Depends(get_tenant_uc),
):
    if not current_user.puede_administrar():
        raise HTTPException(status_code=403, detail="Se requiere rol admin")
    try:
        u = await uc.actualizar_usuario(
            id, current_user.tenant_id, current_user.id,
            **body.model_dump(exclude_none=True),
        )
        return UsuarioResponse(id=u.id, email=u.email, nombre_completo=u.nombre_completo, rol=u.rol, activo=u.activo)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/me/usuarios/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_usuario(
    id: UUID,
    current_user=Depends(get_current_user),
    uc=Depends(get_tenant_uc),
):
    if not current_user.puede_administrar():
        raise HTTPException(status_code=403, detail="Se requiere rol admin")
    try:
        await uc.desactivar_usuario(id, current_user.tenant_id, current_user.id)
    except (NotFoundError, ConflictError) as e:
        raise HTTPException(status_code=400, detail=str(e))
