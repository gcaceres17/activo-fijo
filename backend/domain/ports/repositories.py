"""
Ports (interfaces) para repositorios del dominio.
Solo depende de domain/entities. Nada de PostgreSQL, asyncpg, ni frameworks.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import date
from typing import List, Optional, Tuple
from uuid import UUID

from domain.entities import (
    Activo, Categoria, CentroCosto, Asignacion,
    Mantenimiento, AuditLog, Dispositivo, Usuario
)


class ActivoRepositoryPort(ABC):
    """
    Contrato de acceso a datos para Activo.
    Implementado por PostgreSQLActivoRepository en infrastructure/.
    """

    @abstractmethod
    async def get_by_id(self, id: UUID, tenant_id: UUID) -> Optional[Activo]: ...

    @abstractmethod
    async def get_by_codigo(self, codigo: str, tenant_id: UUID) -> Optional[Activo]: ...

    @abstractmethod
    async def get_by_serie(self, numero_serie: str, tenant_id: UUID) -> Optional[Activo]: ...

    @abstractmethod
    async def list(
        self,
        tenant_id: UUID,
        *,
        categoria_id: Optional[UUID] = None,
        estado: Optional[str] = None,
        centro_costo_id: Optional[UUID] = None,
        area: Optional[str] = None,
        q: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[Activo], int]:
        """Retorna (items, total_count) para paginación."""
        ...

    @abstractmethod
    async def create(self, activo: Activo) -> Activo: ...

    @abstractmethod
    async def update(self, activo: Activo) -> Activo: ...

    @abstractmethod
    async def soft_delete(self, id: UUID, tenant_id: UUID) -> None: ...

    @abstractmethod
    async def get_kpis(self, tenant_id: UUID) -> dict:
        """Retorna KPIs del dashboard desde la vista v_activos_kpis."""
        ...

    @abstractmethod
    async def next_codigo(self, tenant_id: UUID) -> str:
        """Genera el próximo código secuencial ACT-XXXX para el tenant."""
        ...


class CategoriaRepositoryPort(ABC):
    @abstractmethod
    async def list(self, tenant_id: UUID) -> List[Categoria]: ...

    @abstractmethod
    async def get_by_id(self, id: UUID, tenant_id: UUID) -> Optional[Categoria]: ...

    @abstractmethod
    async def create(self, categoria: Categoria) -> Categoria: ...

    @abstractmethod
    async def update(self, categoria: Categoria) -> Categoria: ...


class CentroCostoRepositoryPort(ABC):
    @abstractmethod
    async def list(self, tenant_id: UUID) -> List[CentroCosto]: ...

    @abstractmethod
    async def get_by_id(self, id: UUID, tenant_id: UUID) -> Optional[CentroCosto]: ...

    @abstractmethod
    async def create(self, centro: CentroCosto) -> CentroCosto: ...

    @abstractmethod
    async def update(self, centro: CentroCosto) -> CentroCosto: ...


class AsignacionRepositoryPort(ABC):
    @abstractmethod
    async def get_vigente_by_activo(
        self, activo_id: UUID, tenant_id: UUID
    ) -> Optional[Asignacion]: ...

    @abstractmethod
    async def list_by_activo(
        self, activo_id: UUID, tenant_id: UUID
    ) -> List[Asignacion]: ...

    @abstractmethod
    async def list(
        self,
        tenant_id: UUID,
        *,
        estado: Optional[str] = None,
        activo_id: Optional[UUID] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[Asignacion], int]: ...

    @abstractmethod
    async def create(self, asignacion: Asignacion) -> Asignacion: ...

    @abstractmethod
    async def dar_de_baja(
        self, id: UUID, tenant_id: UUID, fecha_baja: Optional[date] = None
    ) -> Asignacion: ...


class MantenimientoRepositoryPort(ABC):
    @abstractmethod
    async def list_by_activo(
        self, activo_id: UUID, tenant_id: UUID
    ) -> List[Mantenimiento]: ...

    @abstractmethod
    async def list(
        self,
        tenant_id: UUID,
        *,
        estado: Optional[str] = None,
        activo_id: Optional[UUID] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[Mantenimiento], int]: ...

    @abstractmethod
    async def get_by_id(
        self, id: UUID, tenant_id: UUID
    ) -> Optional[Mantenimiento]: ...

    @abstractmethod
    async def create(self, mnt: Mantenimiento) -> Mantenimiento: ...

    @abstractmethod
    async def update(self, mnt: Mantenimiento) -> Mantenimiento: ...


class AuditLogRepositoryPort(ABC):
    @abstractmethod
    async def append(self, log: AuditLog) -> None:
        """Inserta un nuevo log. NUNCA actualiza existentes."""
        ...

    @abstractmethod
    async def list(
        self,
        tenant_id: UUID,
        *,
        usuario_email: Optional[str] = None,
        accion: Optional[str] = None,
        page: int = 1,
        page_size: int = 50,
    ) -> Tuple[List[AuditLog], int]: ...


class DispositivoRepositoryPort(ABC):
    @abstractmethod
    async def list(self, tenant_id: UUID) -> List[Dispositivo]: ...

    @abstractmethod
    async def get_by_id(self, id: UUID, tenant_id: UUID) -> Optional[Dispositivo]: ...

    @abstractmethod
    async def create(self, dispositivo: Dispositivo) -> Dispositivo: ...

    @abstractmethod
    async def update(self, dispositivo: Dispositivo) -> Dispositivo: ...


class UsuarioRepositoryPort(ABC):
    @abstractmethod
    async def get_by_email(
        self, email: str, tenant_id: UUID
    ) -> Optional[Usuario]: ...

    @abstractmethod
    async def get_by_id(self, id: UUID) -> Optional[Usuario]: ...

    @abstractmethod
    async def create(self, usuario: Usuario, password_hash: str) -> Usuario: ...

    @abstractmethod
    async def update_ultimo_login(self, id: UUID) -> None: ...
