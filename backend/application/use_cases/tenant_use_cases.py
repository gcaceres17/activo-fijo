"""Use Cases para gestión de Tenant (settings, features, usuarios)."""
from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from domain.entities import (
    AuditLog, TenantSettings, TenantFeature,
    Usuario, FEATURES_DISPONIBLES,
)
from domain.exceptions import ConflictError, NotFoundError, ValidationError
from domain.ports import (
    TenantSettingsRepositoryPort,
    TenantFeaturesRepositoryPort,
    UsuarioRepositoryPort,
    AuditLogRepositoryPort,
)


class TenantUseCases:
    def __init__(
        self,
        settings_repo: TenantSettingsRepositoryPort,
        features_repo: TenantFeaturesRepositoryPort,
        usuario_repo: UsuarioRepositoryPort,
        audit_repo: AuditLogRepositoryPort,
    ) -> None:
        self._settings = settings_repo
        self._features = features_repo
        self._usuarios = usuario_repo
        self._audit = audit_repo

    # ── Settings ─────────────────────────────────────────────────────────────

    async def get_settings(self, tenant_id: UUID) -> TenantSettings:
        return await self._settings.get(tenant_id)

    async def update_settings(
        self,
        tenant_id: UUID,
        usuario_id: UUID,
        **campos,
    ) -> TenantSettings:
        settings = await self._settings.get(tenant_id)
        before = {"moneda": settings.moneda, "zona_horaria": settings.zona_horaria}

        allowed = {
            "logo_url", "moneda", "zona_horaria", "ano_fiscal_inicio",
            "vida_util_default_meses", "valor_residual_pct", "prefijo_activo",
        }
        for campo, valor in campos.items():
            if campo in allowed and valor is not None:
                object.__setattr__(settings, campo, valor)

        settings = await self._settings.upsert(settings)

        await self._audit.append(AuditLog(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            usuario_id=usuario_id,
            accion="MODIFICACION_ACTIVO",
            entidad="TenantSettings",
            entidad_id=tenant_id,
            payload_before=before,
            payload_after={k: str(v) for k, v in campos.items() if v is not None},
        ))
        return settings

    # ── Features ─────────────────────────────────────────────────────────────

    async def get_features(self, tenant_id: UUID) -> List[TenantFeature]:
        saved = await self._features.list(tenant_id)
        saved_map = {f.feature: f for f in saved}
        return [
            saved_map.get(feat, TenantFeature(tenant_id=tenant_id, feature=feat, habilitado=False))
            for feat in FEATURES_DISPONIBLES
        ]

    async def set_feature(
        self,
        tenant_id: UUID,
        usuario_id: UUID,
        feature: str,
        habilitado: bool,
    ) -> TenantFeature:
        if feature not in FEATURES_DISPONIBLES:
            raise ValidationError(f"Feature desconocida: '{feature}'")
        f = TenantFeature(tenant_id=tenant_id, feature=feature, habilitado=habilitado)
        result = await self._features.upsert(f)
        await self._audit.append(AuditLog(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            usuario_id=usuario_id,
            accion="MODIFICACION_ACTIVO",
            entidad="TenantFeature",
            entidad_id=tenant_id,
            payload_after={"feature": feature, "habilitado": habilitado},
        ))
        return result

    # ── Usuarios ─────────────────────────────────────────────────────────────

    async def listar_usuarios(self, tenant_id: UUID) -> List[Usuario]:
        return await self._usuarios.list(tenant_id)

    async def crear_usuario(
        self,
        tenant_id: UUID,
        actor_id: UUID,
        email: str,
        nombre_completo: str,
        rol: str,
        password: str,
    ) -> Usuario:
        existing = await self._usuarios.get_by_email(email, tenant_id)
        if existing:
            raise ConflictError(f"Ya existe un usuario con email '{email}'")

        from infrastructure.auth.pwd import hash_password
        usuario = Usuario(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            email=email,
            nombre_completo=nombre_completo,
            rol=rol,
        )
        usuario = await self._usuarios.create(usuario, hash_password(password))
        await self._audit.append(AuditLog(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            usuario_id=actor_id,
            accion="LOGIN",
            entidad="Usuario",
            entidad_id=usuario.id,
            payload_after={"email": email, "rol": rol},
        ))
        return usuario

    async def actualizar_usuario(
        self,
        id: UUID,
        tenant_id: UUID,
        actor_id: UUID,
        nombre_completo: Optional[str] = None,
        rol: Optional[str] = None,
        activo: Optional[bool] = None,
    ) -> Usuario:
        usuario = await self._usuarios.get_by_id(id)
        if not usuario or usuario.tenant_id != tenant_id:
            raise NotFoundError("Usuario", str(id))
        if nombre_completo:
            usuario.nombre_completo = nombre_completo
        if rol:
            usuario.rol = rol
        if activo is not None:
            usuario.activo = activo
        usuario.updated_at = datetime.utcnow()
        return await self._usuarios.update(usuario)

    async def desactivar_usuario(self, id: UUID, tenant_id: UUID, actor_id: UUID) -> None:
        usuario = await self._usuarios.get_by_id(id)
        if not usuario or usuario.tenant_id != tenant_id:
            raise NotFoundError("Usuario", str(id))
        if usuario.id == actor_id:
            raise ConflictError("No podés desactivar tu propio usuario")
        await self._usuarios.soft_delete(id, tenant_id)
