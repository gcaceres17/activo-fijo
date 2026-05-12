"""
Entidad Activo — núcleo del dominio de Activo Fijo.
Sin dependencias externas (no importa FastAPI, PostgreSQL, ni nada de infrastructure).
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal
from typing import Literal, List, Optional
from uuid import UUID


EstadoActivo = Literal["activo", "en_mantenimiento", "dado_de_baja", "reservado"]


@dataclass
class Activo:
    """
    Bien tangible de la empresa con vida útil > 1 año y sujeto a depreciación.
    
    Invariantes:
        - valor_adquisicion >= 0
        - vida_util_años >= 1
        - valor_residual <= valor_adquisicion
        - codigo es único por tenant_id
        - Un activo dado_de_baja no puede asignarse ni ponerse en_mantenimiento
    """

    id: UUID
    tenant_id: UUID
    codigo: str                        # ACT-XXXX — único por tenant, auto-generado
    nombre: str
    categoria_id: UUID
    valor_adquisicion: Decimal

    # Campos opcionales con defaults
    marca: Optional[str] = None
    modelo: Optional[str] = None
    numero_serie: Optional[str] = None
    fecha_compra: Optional[date] = None
    vida_util_años: int = 5
    valor_residual: Decimal = Decimal("0")
    estado: EstadoActivo = "activo"
    area: Optional[str] = None
    centro_costo_id: Optional[UUID] = None
    responsable: Optional[str] = None
    ubicacion: Optional[str] = None
    foto_url: Optional[str] = None
    documentos: List[str] = field(default_factory=list)

    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    deleted_at: Optional[datetime] = None

    def __post_init__(self) -> None:
        self._validate()

    def _validate(self) -> None:
        if self.valor_adquisicion < Decimal("0"):
            raise ValueError("valor_adquisicion debe ser >= 0")
        if self.vida_util_años < 1:
            raise ValueError("vida_util_años debe ser >= 1")
        if self.valor_residual > self.valor_adquisicion:
            raise ValueError("valor_residual no puede ser mayor que valor_adquisicion")
        if not self.nombre or not self.nombre.strip():
            raise ValueError("nombre es requerido")

    # ── Computed properties (sin persistencia, cálculo en dominio) ─────────

    @property
    def depreciacion_anual(self) -> Decimal:
        """
        Depreciación por método de línea recta (SLN):
        (valor_adquisicion - valor_residual) / vida_util_años
        """
        if self.vida_util_años == 0:
            return Decimal("0")
        return (self.valor_adquisicion - self.valor_residual) / Decimal(self.vida_util_años)

    @property
    def años_en_uso(self) -> int:
        """Años transcurridos desde la fecha de compra."""
        if not self.fecha_compra:
            return 0
        delta = date.today() - self.fecha_compra
        return delta.days // 365

    @property
    def depreciacion_acumulada(self) -> Decimal:
        """Depreciación acumulada hasta hoy, no supera (valor_adq - valor_residual)."""
        años = min(self.años_en_uso, self.vida_util_años)
        return self.depreciacion_anual * Decimal(str(años))

    @property
    def valor_libro_actual(self) -> Decimal:
        """Valor en libros actual = valor_adq - depreciación_acumulada, mínimo valor_residual."""
        return max(
            self.valor_adquisicion - self.depreciacion_acumulada,
            self.valor_residual
        )

    @property
    def porcentaje_depreciado(self) -> Decimal:
        """Porcentaje del valor ya depreciado sobre el valor amortizable."""
        amortizable = self.valor_adquisicion - self.valor_residual
        if amortizable == Decimal("0"):
            return Decimal("100")
        return (self.depreciacion_acumulada / amortizable * Decimal("100")).quantize(Decimal("0.01"))

    @property
    def esta_vigente(self) -> bool:
        """True si el activo no está dado de baja ni eliminado."""
        return self.deleted_at is None and self.estado != "dado_de_baja"

    # ── Tabla de depreciación anual ────────────────────────────────────────

    def tabla_depreciacion(self) -> List[dict]:
        """
        Genera la tabla completa de depreciación año por año.
        Retorna lista de dicts con: año, dep_anual, dep_acumulada, valor_libro.
        """
        if not self.fecha_compra:
            return []
        
        año_inicio = self.fecha_compra.year
        filas = []
        dep_acum = Decimal("0")
        
        for n in range(1, self.vida_util_años + 1):
            dep_anual = self.depreciacion_anual
            dep_acum = min(dep_acum + dep_anual, self.valor_adquisicion - self.valor_residual)
            valor_libro = max(self.valor_adquisicion - dep_acum, self.valor_residual)
            
            filas.append({
                "año": año_inicio + n,
                "depreciacion_anual": dep_anual,
                "depreciacion_acumulada": dep_acum,
                "valor_libro": valor_libro,
            })
        
        return filas

    # ── Comandos de dominio (transiciones de estado) ───────────────────────

    def iniciar_mantenimiento(self) -> None:
        """Transición: activo → en_mantenimiento."""
        if not self.esta_vigente:
            raise ValueError(f"No se puede iniciar mantenimiento en activo con estado '{self.estado}'")
        self.estado = "en_mantenimiento"
        self.updated_at = datetime.utcnow()

    def finalizar_mantenimiento(self) -> None:
        """Transición: en_mantenimiento → activo."""
        if self.estado != "en_mantenimiento":
            raise ValueError("El activo no está en mantenimiento")
        self.estado = "activo"
        self.updated_at = datetime.utcnow()

    def reservar(self) -> None:
        """Transición: activo → reservado."""
        if self.estado != "activo":
            raise ValueError("Solo se puede reservar un activo en estado 'activo'")
        self.estado = "reservado"
        self.updated_at = datetime.utcnow()

    def dar_de_baja(self) -> None:
        """Transición terminal: cualquier estado → dado_de_baja."""
        if self.estado == "dado_de_baja":
            raise ValueError("El activo ya está dado de baja")
        self.estado = "dado_de_baja"
        self.deleted_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()
