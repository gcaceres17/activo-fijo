from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID


FEATURES_DISPONIBLES: List[str] = [
    "modulo_mantenimiento",
    "modulo_asignaciones",
    "modulo_depreciacion",
    "exportacion_excel",
    "exportacion_pdf",
    "inventario_fisico",
    "integracion_contable",
]

FEATURE_LABELS: dict[str, str] = {
    "modulo_mantenimiento": "Módulo Mantenimiento",
    "modulo_asignaciones":  "Módulo Asignaciones",
    "modulo_depreciacion":  "Módulo Depreciación",
    "exportacion_excel":    "Exportación Excel/CSV",
    "exportacion_pdf":      "Exportación PDF",
    "inventario_fisico":    "Inventario Físico (QR/Zebra)",
    "integracion_contable": "Integración Contable",
}


@dataclass
class TenantSettings:
    """Configuración persistida por tenant."""
    tenant_id: UUID
    logo_url: Optional[str] = None
    moneda: str = "PYG"
    zona_horaria: str = "America/Asuncion"
    ano_fiscal_inicio: int = 1
    vida_util_default_meses: int = 60
    valor_residual_pct: Decimal = field(default_factory=lambda: Decimal("0.10"))
    prefijo_activo: str = "ACT"
    updated_at: datetime = field(default_factory=datetime.utcnow)


@dataclass(frozen=True)
class TenantFeature:
    """Feature flag de un tenant."""
    tenant_id: UUID
    feature: str
    habilitado: bool = True
