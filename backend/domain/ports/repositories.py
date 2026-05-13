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
    Activo, Grupo, Clase, Sucursal, RubroContable,
    Asignacion, Mantenimiento, AuditLog, Dispositivo, Usuario,
    TenantSettings, TenantFeature,
)


class ActivoRepositoryPort(ABC):
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
        grupo_id: Optional[UUID] = None,
        clase_id: Optional[UUID] = None,
        sucursal_id: Optional[UUID] = None,
        estado: Optional[str] = None,
        q: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[Activo], int]: ...

    @abstractmethod
    async def create(self, activo: Activo) -> Activo: ...

    @abstractmethod
    async def update(self, activo: Activo) -> Activo: ...

    @abstractmethod
    async def soft_delete(self, id: UUID, tenant_id: UUID) -> None: ...

    @abstractmethod
    async def get_kpis(self, tenant_id: UUID) -> dict: ...

    @abstractmethod
    async def next_codigo(self, tenant_id: UUID) -> str: ...


class GrupoRepositoryPort(ABC):
    @abstractmethod
    async def list(self, tenant_id: UUID) -> List[Grupo]: ...

    @abstractmethod
    async def get_by_id(self, id: UUID, tenant_id: UUID) -> Optional[Grupo]: ...

    @abstractmethod
    async def get_by_codigo(self, codigo: str, tenant_id: UUID) -> Optional[Grupo]: ...

    @abstractmethod
    async def create(self, grupo: Grupo) -> Grupo: ...

    @abstractmethod
    async def update(self, grupo: Grupo) -> Grupo: ...

    @abstractmethod
    async def soft_delete(self, id: UUID, tenant_id: UUID) -> None: ...


class ClaseRepositoryPort(ABC):
    @abstractmethod
    async def list(self, tenant_id: UUID, *, grupo_id: Optional[UUID] = None) -> List[Clase]: ...

    @abstractmethod
    async def get_by_id(self, id: UUID, tenant_id: UUID) -> Optional[Clase]: ...

    @abstractmethod
    async def get_by_codigo(self, codigo: str, tenant_id: UUID) -> Optional[Clase]: ...

    @abstractmethod
    async def create(self, clase: Clase) -> Clase: ...

    @abstractmethod
    async def update(self, clase: Clase) -> Clase: ...

    @abstractmethod
    async def soft_delete(self, id: UUID, tenant_id: UUID) -> None: ...


class SucursalRepositoryPort(ABC):
    @abstractmethod
    async def list(self, tenant_id: UUID) -> List[Sucursal]: ...

    @abstractmethod
    async def get_by_id(self, id: UUID, tenant_id: UUID) -> Optional[Sucursal]: ...

    @abstractmethod
    async def create(self, sucursal: Sucursal) -> Sucursal: ...

    @abstractmethod
    async def update(self, sucursal: Sucursal) -> Sucursal: ...

    @abstractmethod
    async def soft_delete(self, id: UUID, tenant_id: UUID) -> None: ...


class RubroContableRepositoryPort(ABC):
    @abstractmethod
    async def list(self, tenant_id: UUID, *, solo_activos: bool = True) -> List[RubroContable]: ...

    @abstractmethod
    async def get_by_id(self, id: UUID, tenant_id: UUID) -> Optional[RubroContable]: ...

    @abstractmethod
    async def get_by_codigo(self, codigo: str, tenant_id: UUID) -> Optional[RubroContable]: ...

    @abstractmethod
    async def create(self, rubro: RubroContable) -> RubroContable: ...

    @abstractmethod
    async def update(self, rubro: RubroContable) -> RubroContable: ...

    @abstractmethod
    async def soft_delete(self, id: UUID, tenant_id: UUID) -> None: ...


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
        activo_id: Optional[UUID] = None,
        sucursal_id: Optional[UUID] = None,
        solo_vigentes: bool = False,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[Asignacion], int]: ...

    @abstractmethod
    async def create(self, asignacion: Asignacion) -> Asignacion: ...

    @abstractmethod
    async def dar_de_baja(
        self, id: UUID, tenant_id: UUID, fecha_fin: Optional[date] = None
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
    async def get_by_id(self, id: UUID, tenant_id: UUID) -> Optional[Mantenimiento]: ...

    @abstractmethod
    async def create(self, mnt: Mantenimiento) -> Mantenimiento: ...

    @abstractmethod
    async def update(self, mnt: Mantenimiento) -> Mantenimiento: ...


class AuditLogRepositoryPort(ABC):
    @abstractmethod
    async def append(self, log: AuditLog) -> None: ...

    @abstractmethod
    async def list(
        self,
        tenant_id: UUID,
        *,
        usuario_id: Optional[UUID] = None,
        accion: Optional[str] = None,
        entidad: Optional[str] = None,
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

    @abstractmethod
    async def soft_delete(self, id: UUID, tenant_id: UUID) -> None: ...


class UsuarioRepositoryPort(ABC):
    @abstractmethod
    async def get_by_email(self, email: str, tenant_id: UUID) -> Optional[Usuario]: ...

    @abstractmethod
    async def get_by_id(self, id: UUID) -> Optional[Usuario]: ...

    @abstractmethod
    async def list(self, tenant_id: UUID) -> List[Usuario]: ...

    @abstractmethod
    async def create(self, usuario: Usuario, password_hash: str) -> Usuario: ...

    @abstractmethod
    async def update(self, usuario: Usuario) -> Usuario: ...

    @abstractmethod
    async def update_ultimo_login(self, id: UUID) -> None: ...

    @abstractmethod
    async def soft_delete(self, id: UUID, tenant_id: UUID) -> None: ...


class TenantSettingsRepositoryPort(ABC):
    @abstractmethod
    async def get(self, tenant_id: UUID) -> TenantSettings: ...

    @abstractmethod
    async def upsert(self, settings: TenantSettings) -> TenantSettings: ...


class TenantFeaturesRepositoryPort(ABC):
    @abstractmethod
    async def list(self, tenant_id: UUID) -> List[TenantFeature]: ...

    @abstractmethod
    async def upsert(self, feature: TenantFeature) -> TenantFeature: ...

    async def is_enabled(self, tenant_id: UUID, feature: str) -> bool:
        features = await self.list(tenant_id)
        match = next((f for f in features if f.feature == feature), None)
        return match.habilitado if match else False
