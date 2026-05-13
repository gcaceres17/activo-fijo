# ARCHITECTURE.md — Activo Fijo CLT (v2.0 — Banco Continental)

> ⚠️ Actualizado post-reunión Banco Continental, 12 de mayo de 2026.
> Reemplaza la versión anterior basada en el POC inicial de CLT.

## 1. Stack tecnológico

| Capa | Tecnología | Versión | Notas |
|------|-----------|---------|-------|
| Frontend web | Next.js (App Router) + TypeScript + Tailwind CSS | 14 | SSR, RSC, design system CLT |
| App mobile | Flutter (iOS + Android nativos) | 3.x | POC en PWA; producción en Flutter nativo |
| Backend | FastAPI + Python | 3.12 | Async nativo, tipado estricto, OpenAPI automático |
| Base de datos | PostgreSQL 15 (preferido) / Oracle (alternativo) | 15 | A confirmar con TI banco |
| Auth | JWT propio + adaptador AD (opcional) | — | Desacoplado del proveedor de identidad |
| Contenedores | Docker + Kubernetes (k8s) | — | Orquestación on-premise del banco |
| CI/CD | Azure DevOps | — | Pipeline existente en el banco |
| Almacenamiento | LocalStorageAdapter (POC) / S3Adapter (producción) | — | Imágenes de activos y QR |
| Impresora | Brother P950NW via SDK b-PAC / HTTP TCP 9100 | — | Etiquetas QR TZe WiFi |

## 2. Patrón Arquitectónico — Hexagonal (Ports & Adapters)

```
activo-fijo/backend/
├── domain/               ← Entidades + Ports (CERO dependencias externas)
│   ├── entities/         ← Activo, Categoria, Grupo, Clase, Sucursal,
│   │                        RubroContable, Asignacion, Jornada, Incidencia,
│   │                        Transferencia, Dispositivo, AuditLog, Usuario
│   └── ports/            ← Interfaces abstractas (repositories + services)
│
├── application/          ← Use Cases (solo depende de domain/)
│   └── use_cases/        ← ActivoUC, JornadaUC, IncidenciaUC,
│                            TransferenciaUC, DispositivoUC, etc.
│
├── infrastructure/       ← Implementaciones concretas
│   ├── repositories/     ← PostgreSQL/Oracle via asyncpg
│   ├── database/         ← Connection pool, migrations
│   └── external/         ← QR generator, storage adapters,
│                            BrotherPrinterAdapter, FinansysAdapter,
│                            ADAuthAdapter
│
└── adapters/             ← Entry (FastAPI) y Exit (HTTP clients)
    ├── api/              ← Routers FastAPI + Schemas Pydantic v2
    └── http/             ← Clientes HTTP para integraciones externas
```

## 3. Multi-tenant

Todos los datos están particionados por `tenant_id` proveniente del JWT.
- El `sysadmin CLT` gestiona tenants; el `admin banco` gestiona su propio tenant.
- Feature flags se almacenan por tenant en la tabla `tenant_config`.
- Banco Continental = Tenant inicial del piloto.

## 4. Módulos del sistema

| Módulo | Descripción |
|--------|-------------|
| Auth & Usuarios | JWT, roles RBAC, adaptador AD opcional |
| Configuración | Grupos, clases, sucursales, rubros, feature flags, código compuesto |
| Gestión de Activos | CRUD, código compuesto, QR, depreciación SLN, imagen |
| Migración de Datos | Import masivo Excel/CSV |
| Jornadas de Inventario | Multi-sucursal, conciliación, reporte cierre |
| App Mobile Flutter | Relevamiento, escaneo QR, incidencias rápidas |
| Incidencias | Flujo parametrizable, estados, historial |
| Transferencias | Entre sucursales/responsables, aprobación configurable |
| Dashboard & Alertas | KPIs, alertas, búsqueda rápida |
| Dispositivos | Brother P950NW, móviles relevadores |
| Integración Finansys | Lectura rubros (Fase 1); escritura asientos (Fase 2) |
| AuditLog | Append-only, todas las acciones |

## 5. Reglas cardinales de arquitectura

- El dominio NO importa nada de `infrastructure/` ni `adapters/`
- Los use cases NO conocen FastAPI ni PostgreSQL/Oracle
- NO usar ORMs que oculten el SQL (no SQLAlchemy ORM session-based)
- NO hardcodear `tenant_id` — siempre viene del JWT
- NO eliminar físicamente registros — siempre soft delete con `deleted_at`
- NO modificar AuditLogs existentes
- `AuthProvider` es intercambiable: `LocalAuthAdapter` o `ADAuthAdapter`
- `DatabaseAdapter` es intercambiable: `PostgreSQLAdapter` o `OracleAdapter`
