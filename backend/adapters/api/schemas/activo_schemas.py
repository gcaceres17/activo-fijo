"""Schemas Pydantic v2 para endpoints de Activos."""
from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class ActivoCreate(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=300)
    grupo_id: UUID
    clase_id: UUID
    sucursal_id: UUID
    valor_adquisicion: Decimal = Field(..., gt=Decimal("0"))
    vida_util_meses: int = Field(60, ge=12, le=1200)
    valor_residual: Decimal = Field(Decimal("0"), ge=Decimal("0"))
    rubro_contable_id: Optional[UUID] = None
    marca: Optional[str] = Field(None, max_length=100)
    modelo: Optional[str] = Field(None, max_length=100)
    numero_serie: Optional[str] = Field(None, max_length=150)
    fecha_compra: Optional[date] = None
    foto_url: Optional[str] = None


class ActivoUpdate(BaseModel):
    nombre: Optional[str] = Field(None, min_length=1, max_length=300)
    grupo_id: Optional[UUID] = None
    clase_id: Optional[UUID] = None
    sucursal_id: Optional[UUID] = None
    rubro_contable_id: Optional[UUID] = None
    marca: Optional[str] = None
    modelo: Optional[str] = None
    numero_serie: Optional[str] = None
    fecha_compra: Optional[date] = None
    valor_adquisicion: Optional[Decimal] = Field(None, gt=Decimal("0"))
    vida_util_meses: Optional[int] = Field(None, ge=12, le=1200)
    valor_residual: Optional[Decimal] = Field(None, ge=Decimal("0"))
    estado: Optional[str] = None
    foto_url: Optional[str] = None


class ActivoResponse(BaseModel):
    id: UUID
    codigo: str
    nombre: str
    grupo_id: UUID
    clase_id: UUID
    sucursal_id: UUID
    rubro_contable_id: Optional[UUID]
    marca: Optional[str]
    modelo: Optional[str]
    numero_serie: Optional[str]
    fecha_compra: Optional[date]
    valor_adquisicion: Decimal
    vida_util_meses: int
    vida_util_años: int
    valor_residual: Decimal
    depreciacion_mensual: Decimal
    depreciacion_acumulada: Decimal
    valor_libro_actual: Decimal
    porcentaje_depreciado: Decimal
    estado: str
    foto_url: Optional[str]
    qr_url: Optional[str]
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_entity(cls, activo) -> "ActivoResponse":
        return cls(
            id=activo.id,
            codigo=activo.codigo,
            nombre=activo.nombre,
            grupo_id=activo.grupo_id,
            clase_id=activo.clase_id,
            sucursal_id=activo.sucursal_id,
            rubro_contable_id=activo.rubro_contable_id,
            marca=activo.marca,
            modelo=activo.modelo,
            numero_serie=activo.numero_serie,
            fecha_compra=activo.fecha_compra,
            valor_adquisicion=activo.valor_adquisicion,
            vida_util_meses=activo.vida_util_meses,
            vida_util_años=activo.vida_util_años,
            valor_residual=activo.valor_residual,
            depreciacion_mensual=activo.depreciacion_mensual,
            depreciacion_acumulada=activo.depreciacion_acumulada,
            valor_libro_actual=activo.valor_libro_actual,
            porcentaje_depreciado=activo.porcentaje_depreciado,
            estado=activo.estado,
            foto_url=activo.foto_url,
            qr_url=activo.qr_url,
            created_at=activo.created_at,
            updated_at=activo.updated_at,
        )


class PaginatedActivos(BaseModel):
    items: List[ActivoResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class AsignacionCreate(BaseModel):
    activo_id: UUID
    responsable_nombre: str = Field(..., min_length=1, max_length=200)
    responsable_codigo: Optional[str] = None
    sucursal_id: UUID
    fecha_inicio: date = Field(default_factory=date.today)


class MantenimientoCreate(BaseModel):
    activo_id: UUID
    tipo: str = Field(..., pattern="^(preventivo|correctivo|predictivo)$")
    descripcion: str = Field(..., min_length=1)
    tecnico: str = Field(..., min_length=1, max_length=200)
    proveedor: Optional[str] = None
    fecha_inicio: date = Field(default_factory=date.today)
    fecha_estimada_fin: Optional[date] = None
    costo: Decimal = Field(Decimal("0"), ge=Decimal("0"))


class MantenimientoUpdate(BaseModel):
    estado: Optional[str] = Field(None, pattern="^(programado|en_proceso|completado|cancelado)$")
    fecha_fin_real: Optional[date] = None
    costo: Optional[Decimal] = Field(None, ge=Decimal("0"))
    descripcion: Optional[str] = None
