"""Endpoints de autenticación."""
from __future__ import annotations

import uuid
from datetime import datetime

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr

from adapters.api.dependencies import get_current_user
from infrastructure.database.connection import get_pool
from infrastructure.auth.jwt import create_token

router = APIRouter(prefix="/v1/auth", tags=["Auth"])


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int = 28800


@router.post("/login", response_model=LoginResponse)
async def login(body: LoginRequest):
    """
    Autentica usuario y retorna JWT.
    Usa pgcrypto crypt() para verificar el password — compatible con gen_salt('bf').
    """
    pool = await get_pool()
    async with pool.acquire() as conn:
        # crypt() verifica el hash en PostgreSQL — evita problemas de formato $2a$/$2b$
        row = await conn.fetchrow(
            """SELECT u.*
               FROM public.usuarios u
               WHERE u.email = $1
                 AND u.activo = TRUE
                 AND u.password_hash = crypt($2, u.password_hash)""",
            body.email,
            body.password,
        )

    if not row:
        raise HTTPException(status_code=401, detail="Credenciales inválidas")

    token = create_token(
        user_id=row["id"],
        tenant_id=row["tenant_id"],
        email=row["email"],
        rol=row["rol"],
    )

    # Actualizar ultimo_login (misma conexión del pool)
    pool2 = await get_pool()
    async with pool2.acquire() as conn:
        await conn.execute(
            "UPDATE public.usuarios SET ultimo_login=NOW() WHERE id=$1", row["id"]
        )

    return LoginResponse(access_token=token)


@router.get("/me")
async def me(current_user=Depends(get_current_user)):
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "nombre_completo": current_user.nombre_completo,
        "rol": current_user.rol,
        "tenant_id": str(current_user.tenant_id),
    }
