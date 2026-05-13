"""Activo Fijo API — CLT S.A. · FastAPI + Hexagonal Architecture"""
from __future__ import annotations
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from infrastructure.database.connection import create_pool, close_pool
from adapters.api.routers import auth, activos, grupos, sucursales
from adapters.api.routers import asignaciones, mantenimientos, audit_logs, dispositivos


@asynccontextmanager
async def lifespan(app: FastAPI):
    dsn = os.getenv("DATABASE_URL",
        "postgresql://activo_fijo:activo_fijo_pass@localhost:5432/activo_fijo_db")
    await create_pool(dsn)
    print("✅ DB pool ready")
    yield
    await close_pool()
    print("✅ DB pool closed")


app = FastAPI(
    title="Activo Fijo API — CLT S.A.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

os.makedirs("./storage", exist_ok=True)
app.mount("/static", StaticFiles(directory="./storage"), name="static")

# Registrar todos los routers
for router in [auth.router, activos.router, grupos.router, sucursales.router,
               asignaciones.router, mantenimientos.router,
               audit_logs.router, dispositivos.router]:
    app.include_router(router)


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok", "version": "1.0.0"}
