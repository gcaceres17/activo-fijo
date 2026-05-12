# ARCHITECTURE.md — Activo Fijo CLT

## 1. Stack tecnológico

| Capa | Tecnología | Versión | Justificación |
|------|-----------|---------|---------------|
| Frontend | Next.js (App Router) | 14 | SSR, TypeScript, routing file-based, RSC |
| Backend | FastAPI + Python | 3.12 | Async nativo, tipado estricto, OpenAPI automático |
| Base de datos | PostgreSQL | 15 | ACID, RLS, extensiones (uuid-ossp, pgcrypto) |
| ORM | asyncpg + SQLAlchemy Core | 2.x | Queries explícitas, control total, async |
| Auth | JWT (python-jose) | — | Token stateless, compatible con core bancario |
| Contenedores | Docker Compose | — | Deploy reproducible en cualquier entorno |
| Frontend CSS | Tailwind CSS | 3.4 | Utility-first, design system CLT |

## 2. Patrón Arquitectónico — Hexagonal (Ports & Adapters)

```
activo-fijo/backend/
├── domain/               ← Entidades + Ports (CERO dependencias externas)
│   ├── entities/         ← Activo, Categoria, CentroCosto, Asignacion,
│   │                        Mantenimiento, AuditLog, Dispositivo, Usuario
│   └── ports/            ← Interfaces abstractas (repositories + services)
│
├── application/          ← Use Cases (solo depende de domain/)
│   └── use_cases/        ← ActivoUC, AsignacionUC, MantenimientoUC, etc.
│
├── infrastructure/       ← Implementaciones concretas
│   ├── repositories/     ← PostgreSQL via asyncpg
│   ├── database/         ← Connection pool, migrations runner
│   └── external/         ← QR generator, file storage adapters
│
└── adapters/             ← Entry (FastAPI) y Exit (HTTP clients)
    ├── api/              ← Routers FastAPI + Schemas Pydantic v2
    └── http/             ← Clientes HTTP para integraciones externas
```

**Regla cardinal**: El dominio no importa nada de infrastructure ni adapters. Los use cases no conocen FastAPI ni PostgreSQL.

### Flujo de una request:

```
HTTP Request
    → FastAPI Router (adapter/api)
        → Pydantic Schema (validación)
            → Use Case (application/)
                → Repository Port (domain/ports/)
                    → PostgreSQL Repository (infrastructure/)
                        → PostgreSQL 15
```

## 3. ADRs — Architecture Decision Records

| # | Decisión | Alternativas | Elección | Consecuencias |
|---|---------|-------------|----------|---------------|
| ADR-01 | ORM vs Query Builder | SQLAlchemy ORM, Django ORM | asyncpg + SQLAlchemy Core | Control total de SQL, async nativo, sin magic |
| ADR-02 | Auth strategy | Supabase Auth, OAuth2 externo | JWT propio (python-jose) | Sin dependencia de Supabase, integrable con core bancario |
| ADR-03 | Arquitectura frontend | SPA React puro, Vue.js | Next.js 14 App Router | SSR para tablas densas, API Routes para BFF |
| ADR-04 | Depreciation engine | Excel export, tercero | Cálculo lineal propio en dominio | Lógica en domain/, sin dependencias, testeable unitariamente |
| ADR-05 | QR generation | Librería tercero, API externa | `qrcode` Python en infrastructure | Offline-capable, control de formato para impresoras Zebra |
| ADR-06 | Soft delete | Hard delete, archive table | Campo `deleted_at TIMESTAMPTZ` | Auditoría completa, reversible, compatible con RLS |
| ADR-07 | Depreciation model | Suma de dígitos, doble declinante | Línea recta (SLN) | Requerimiento contable paraguayo, NIIF simplificadas |
| ADR-08 | Multi-tenant | Schema por empresa, DB por empresa | `tenant_id UUID` en cada tabla | Un deploy, múltiples empresas del holding Continental |

## 4. Principios SOLID aplicados

- **S** — Single Responsibility: cada use case tiene una sola razón de cambio (ej: `RegistrarActivoUseCase` solo registra activos)
- **O** — Open/Closed: ports son interfaces; agregar PostgreSQL, MongoDB o SAP no toca el dominio
- **L** — Liskov: `PostgreSQLActivoRepository` cumple el contrato de `ActivoRepositoryPort` sin sorpresas
- **I** — Interface Segregation: `ActivoRepositoryPort` separado de `CategoriaRepositoryPort`; los UC solo reciben lo que usan
- **D** — Dependency Inversion: los use cases reciben los ports por inyección; infrastructure no contamina application

## 5. Seguridad

- Autenticación: JWT Bearer tokens, expiración 8h, refresh tokens
- Autorización: RBAC en capa de use case (`admin` único rol en v1)
- PostgreSQL: Row Level Security habilitado en todas las tablas con `tenant_id`
- Passwords: bcrypt hash con salt (nunca texto plano)
- Audit trail: toda modificación genera entrada en `audit_logs` (trigger + use case)
- QR codes: contienen solo el `id` del activo (UUID), no datos sensibles

## 6. Escalabilidad hacia producción

```
POC (actual)          → Producción (holding Continental)
─────────────────────────────────────────────────────────
Docker Compose        → Kubernetes / ECS
PostgreSQL local      → RDS / Aurora PostgreSQL
JWT propio            → OAuth2 del core bancario
Mock storage          → S3 / MinIO para fotos y documentos
QR local              → Zebra ZPL directo via driver
Single tenant         → Multi-tenant (tenant_id ya en schema)
```
