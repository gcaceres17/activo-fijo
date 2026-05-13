"""Inyección de dependencias — ensambla use cases con sus repos."""
from __future__ import annotations
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from application.use_cases import (
    ActivoUseCases, GrupoUseCases, SucursalUseCases,
    AsignacionUseCases, MantenimientoUseCases, TenantUseCases,
)
from infrastructure.database.connection import get_pool
from infrastructure.repositories import (
    PostgreSQLActivoRepository,
    PostgreSQLGrupoRepository,
    PostgreSQLClaseRepository,
    PostgreSQLSucursalRepository,
    PostgreSQLRubroContableRepository,
    PostgreSQLAsignacionRepository,
    PostgreSQLMantenimientoRepository,
    PostgreSQLAuditLogRepository,
    PostgreSQLUsuarioRepository,
    PostgreSQLDispositivoRepository,
    PostgreSQLTenantSettingsRepository,
    PostgreSQLTenantFeaturesRepository,
)
from infrastructure.external.qr_service import QRCodeService, LocalStorageAdapter
from domain.entities import Usuario

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> Usuario:
    from infrastructure.auth.jwt import decode_token
    try:
        payload = decode_token(credentials.credentials)
        return Usuario(
            id=payload["user_id"],
            tenant_id=payload["tenant_id"],
            email=payload["email"], nombre_completo=payload.get("nombre", ""),
            rol=payload.get("rol", "operador"),
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_activo_uc() -> ActivoUseCases:
    pool = await get_pool()
    return ActivoUseCases(
        activo_repo=PostgreSQLActivoRepository(pool),
        grupo_repo=PostgreSQLGrupoRepository(pool),
        clase_repo=PostgreSQLClaseRepository(pool),
        sucursal_repo=PostgreSQLSucursalRepository(pool),
        audit_repo=PostgreSQLAuditLogRepository(pool),
        qr_service=QRCodeService(),
        storage=LocalStorageAdapter(),
    )


async def get_grupo_uc() -> GrupoUseCases:
    pool = await get_pool()
    return GrupoUseCases(
        grupo_repo=PostgreSQLGrupoRepository(pool),
        clase_repo=PostgreSQLClaseRepository(pool),
        audit_repo=PostgreSQLAuditLogRepository(pool),
    )


async def get_sucursal_uc() -> SucursalUseCases:
    pool = await get_pool()
    return SucursalUseCases(
        sucursal_repo=PostgreSQLSucursalRepository(pool),
        audit_repo=PostgreSQLAuditLogRepository(pool),
    )


async def get_asignacion_uc() -> AsignacionUseCases:
    pool = await get_pool()
    return AsignacionUseCases(
        asignacion_repo=PostgreSQLAsignacionRepository(pool),
        activo_repo=PostgreSQLActivoRepository(pool),
        audit_repo=PostgreSQLAuditLogRepository(pool),
        sucursal_repo=PostgreSQLSucursalRepository(pool),
    )


async def get_asignacion_repo():
    pool = await get_pool()
    return PostgreSQLAsignacionRepository(pool)


async def get_mantenimiento_uc() -> MantenimientoUseCases:
    pool = await get_pool()
    return MantenimientoUseCases(
        mnt_repo=PostgreSQLMantenimientoRepository(pool),
        activo_repo=PostgreSQLActivoRepository(pool),
        audit_repo=PostgreSQLAuditLogRepository(pool),
    )


async def get_tenant_uc() -> TenantUseCases:
    pool = await get_pool()
    return TenantUseCases(
        settings_repo=PostgreSQLTenantSettingsRepository(pool),
        features_repo=PostgreSQLTenantFeaturesRepository(pool),
        usuario_repo=PostgreSQLUsuarioRepository(pool),
        audit_repo=PostgreSQLAuditLogRepository(pool),
    )
