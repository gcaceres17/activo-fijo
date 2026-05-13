# Activo Fijo CLT — Instrucciones para el Agente de Desarrollo

Este proyecto es un sistema de gestión de activos fijos para CLT S.A. (holding Banco Continental, Paraguay).
Diseñado para ser replicado en otras empresas del holding como SaaS multi-tenant.

## Contexto del dominio

Un activo fijo es un bien tangible de la empresa con vida útil > 1 año, sujeto a depreciación contable
mediante el método de línea recta (SLN). El sistema gestiona el ciclo de vida completo: alta, asignación
a empleados/áreas, mantenimiento, depreciación y baja. Incluye jornadas de inventario con QR y dispositivos
Zebra/Honeywell.

## Entidades del dominio

- **Activo** — entidad raíz, bien tangible con código ACT-XXXX, estado y valor libro calculado
- **Categoria** — clasificación de activos (Equipos de Cómputo, Vehículos, Mobiliario, etc.)
- **CentroCosto** — unidad contable (código + nombre, ej: TEC-001 Tecnología)
- **Asignacion** — vinculación activo ↔ empleado, solo una vigente por activo (constraint único en DB)
- **Mantenimiento** — intervención preventiva/correctiva/predictiva, cambia estado del activo
- **AuditLog** — append-only, toda acción queda registrada, NUNCA se modifica
- **Dispositivo** — impresoras Zebra y lectores QR/barcode para jornadas de inventario
- **Usuario** — con rol admin/operador/auditor por tenant

## Módulos a implementar (en orden)

1. **Auth** — JWT login, middleware, decoradores de rol
2. **Categorías + CentrosCosto** — CRUD simples, base para el resto
3. **Activos** — CRUD completo, cálculo de depreciación en dominio, QR, foto
4. **Asignaciones** — con constraint de única vigente por activo
5. **Mantenimientos** — cambio de estado del activo al crear/cerrar
6. **Dashboard/KPIs** — query optimizado en PostgreSQL (vista `v_activos_kpis`)
7. **Audit Logs** — append en cada use case, listado con filtros
8. **Reportes** — exportación CSV/XLSX con openpyxl
9. **Dispositivos** — CRUD + estado de conexión

## Dependencias de dominio

- Asignaciones dependen de Activos y CentrosCosto
- Mantenimientos dependen de Activos
- Todos los use cases de escritura generan AuditLog → AuditLogRepository siempre inyectado

## Stack exacto

```
backend/     FastAPI 0.111 + Python 3.12 + asyncpg 0.29
database/    PostgreSQL 15 (preferido) / Oracle (alternativo — confirmar con TI banco)
frontend/    Next.js 14 App Router + TypeScript + Tailwind CSS 3.4
mobile/      Flutter 3.x — iOS y Android nativos (POC en PWA)
infra/       Docker (local) → Kubernetes on-premise (QA y Producción — banco ya tiene k8s)
ci_cd/       Azure DevOps (pipeline existente en el banco)
dispositivos/ Brother P950NW via SDK b-PAC / TCP 9100 (impresora etiquetas QR)
```

## Datos de seed

El seed (`database/seeds/001_seed.sql`) debe incluir:
- 1 tenant: CLT S.A. (id fijo para desarrollo)
- 1 usuario admin: giovanni.caceres@clt.com.py / password: Admin1234
- 6 categorías (ver data.js del diseño)
- 10 centros de costo (ver data.js del diseño)
- 12 activos de ejemplo (ver data.js del diseño)
- 6 asignaciones, 5 mantenimientos, 8 audit logs, 4 dispositivos

## Integraciones

- QR: librería `qrcode` Python, sin red externa, funciona offline
- Storage: `LocalStorageAdapter` para POC (archivos en ./storage/), `S3StorageAdapter` para producción
- Auth: JWT propio (python-jose), sin Supabase

## Lo que NO debes hacer en este proyecto

- No usar ORMs que oculten el SQL (no Django ORM, no SQLAlchemy ORM session-based)
- No poner lógica de negocio en los routers FastAPI
- No importar nada de `infrastructure/` o `adapters/` desde `domain/`
- No hardcodear tenant_id en el código (siempre viene del JWT)
- No eliminar físicamente registros (siempre soft delete con `deleted_at`)
- No modificar AuditLogs existentes

## Convenciones de código

- Python: black formatter, isort, type hints en todas las funciones
- Nombres: snake_case para Python, PascalCase para clases, SCREAMING_SNAKE para constantes
- Errores: lanzar excepciones del dominio (`NotFoundError`, `ConflictError`, `ValidationError`)
- Tests: pytest-asyncio, cobertura mínima 80% en use cases

## Documentación de referencia

Leer en este orden antes de generar código:
1. `docs/ARCHITECTURE.md`
2. `docs/DOMAIN.md`
3. `docs/USE_CASES.md`
4. `docs/DATABASE.md`
5. `docs/openapi.yaml`
6. `docs/UI_MAP.md`
