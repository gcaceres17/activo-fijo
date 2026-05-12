"""JWT encoding/decoding para autenticación."""
from __future__ import annotations

import os
from datetime import datetime, timedelta
from typing import Any
from uuid import UUID

from jose import JWTError, jwt

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "changeme-use-strong-secret-in-production")
ALGORITHM = "HS256"
EXPIRE_HOURS = int(os.getenv("JWT_EXPIRE_HOURS", "8"))


def create_token(user_id: UUID, tenant_id: UUID, email: str, rol: str) -> str:
    payload = {
        "user_id": str(user_id),
        "tenant_id": str(tenant_id),
        "email": email,
        "rol": rol,
        "exp": datetime.utcnow() + timedelta(hours=EXPIRE_HOURS),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict[str, Any]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        # Convertir strings de vuelta a UUID
        payload["user_id"] = UUID(payload["user_id"])
        payload["tenant_id"] = UUID(payload["tenant_id"])
        return payload
    except JWTError as e:
        raise ValueError(f"Token inválido: {e}")
