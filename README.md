# Activo Fijo — CLT S.A.

Sistema de Gestión de Activos Fijos construido con arquitectura hexagonal, principios SOLID y PostgreSQL 15.

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 14 + TypeScript + Tailwind CSS |
| Backend | FastAPI 0.111 + Python 3.12 |
| Base de datos | PostgreSQL 15 |
| Arquitectura | Hexagonal (Ports & Adapters) |
| Contenedores | Docker Compose |

## Levantar en 3 pasos

### Prerequisitos
- Docker Desktop corriendo
- Node.js 20+ (para desarrollo frontend)

### 1. Variables de entorno
```bash
cp .env.example .env
# Editar .env con tu JWT_SECRET_KEY
```

### 2. Levantar servicios
```bash
make up
# o: docker compose up --build -d
```

### 3. Acceder
- **Frontend:** http://localhost:3000
- **API Docs:** http://localhost:8000/docs
- **Login:** giovanni.caceres@clt.com.py / Admin1234

## Desarrollo local (recomendado)

```bash
# Terminal 1 — DB + Backend
make dev

# Terminal 2 — Frontend Next.js con hot reload
make frontend
```

## Comandos útiles

```bash
make help          # Ver todos los comandos
make logs          # Ver logs de todos los servicios
make db-shell      # Abrir psql
make db-reset      # Resetear DB con seed (⚠️ borra datos)
make feature NAME=mi-feature  # Crear rama de feature
```

## Estructura del proyecto

```
activo-fijo/
├── backend/
│   ├── domain/          ← Entidades + Ports (sin deps externas)
│   ├── application/     ← Use Cases (solo depende de domain/)
│   ├── infrastructure/  ← PostgreSQL, JWT, QR, Storage
│   └── adapters/        ← FastAPI routers + Pydantic schemas
├── frontend/            ← Next.js 14 App Router
├── database/
│   └── init/            ← Migraciones SQL (001–006) + seed
├── docs/                ← SDD: ARCHITECTURE, DOMAIN, USE_CASES, DATABASE...
├── docker-compose.yml
├── Makefile
└── setup-git.sh         ← Ejecutar una vez para inicializar Git
```

## Credenciales de desarrollo

| Campo | Valor |
|-------|-------|
| Email | giovanni.caceres@clt.com.py |
| Password | Admin1234 |
| DB Host | localhost:5432 |
| DB Name | activo_fijo_db |
| DB User | activo_fijo |
| DB Pass | activo_fijo_pass |

## Estrategia de branching (Git Flow)

```
main      ← producción (protegida, solo via PR)
develop   ← integración
feature/* ← desde develop → PR a develop
hotfix/*  ← desde main   → PR a main + develop
release/* ← desde develop → PR a main + tag
```

## Licencia

Propiedad de CLT S.A. — Confidencial.
