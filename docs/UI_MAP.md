# UI_MAP.md — Mapa de UI: Activo Fijo CLT

## 8.1 Páginas y rutas (Next.js 14 App Router)

| Ruta | Archivo | Descripción | Rol mínimo | Endpoints |
|------|---------|-------------|------------|-----------|
| `/login` | `(auth)/login/page.tsx` | Login con JWT | público | `POST /v1/auth/login` |
| `/dashboard` | `(dashboard)/dashboard/page.tsx` | KPIs, resumen cartera | operador | `GET /v1/activos/kpis` |
| `/dashboard/activos` | `(dashboard)/activos/page.tsx` | Inventario con filtros | operador | `GET /v1/activos` |
| `/dashboard/activos/nuevo` | `(dashboard)/activos/nuevo/page.tsx` | Wizard 4 pasos alta | admin | `POST /v1/activos` |
| `/dashboard/activos/[id]` | `(dashboard)/activos/[id]/page.tsx` | Detalle + tabs | operador | `GET/PUT /v1/activos/{id}` |
| `/dashboard/depreciacion` | `(dashboard)/depreciacion/page.tsx` | Tabla depreciación | auditor | `GET /v1/activos/depreciacion` |
| `/dashboard/asignaciones` | `(dashboard)/asignaciones/page.tsx` | Lista asignaciones | operador | `GET /v1/asignaciones` |
| `/dashboard/mantenimiento` | `(dashboard)/mantenimiento/page.tsx` | Lista mantenimientos | operador | `GET /v1/mantenimientos` |
| `/dashboard/reportes` | `(dashboard)/reportes/page.tsx` | Generación de reportes | auditor | `GET /v1/reportes/{tipo}` |
| `/dashboard/categorias` | `(dashboard)/categorias/page.tsx` | CRUD categorías | admin | `GET/POST/PUT /v1/categorias` |
| `/dashboard/auditoria` | `(dashboard)/auditoria/page.tsx` | Audit log | auditor | `GET /v1/audit-logs` |
| `/dashboard/configuracion` | `(dashboard)/configuracion/page.tsx` | Config + dispositivos | admin | `GET/PUT /v1/config`, `GET /v1/dispositivos` |

## 8.2 Componentes por módulo

**Módulo Dashboard:**
- `KPICard` — ícono, valor grande, label, tendencia, gradiente de color CLT
- `CategoriaDistribucionChart` — donut chart con Chart.js, datos por categoría
- `ActivosRecientesTable` — últimos 5 activos registrados

**Módulo Activos:**
- `ActivosDataTable` — columnas: código, nombre, categoría, estado, área, valor libro, acciones
  - Filtros: categoría, estado, centro de costo, área, búsqueda libre
  - Paginación server-side
  - Toggle vista grid / tabla
- `ActivoStatusBadge` — `activo`=green, `en_mantenimiento`=yellow, `dado_de_baja`=red, `reservado`=blue
- `ActivoDetailModal` — tabs: Información, Depreciación, Asignaciones, Mantenimiento, Documentos, QR
- `ActivoForm` — wizard 4 pasos:
  - Paso 1: Información básica (nombre, categoría, marca, modelo, serie)
  - Paso 2: Datos financieros (fecha compra, valor adquisición, vida útil, valor residual)
  - Paso 3: Ubicación (área, centro de costo, responsable, ubicación, foto)
  - Paso 4: Revisión y confirmación con preview de depreciación
- `FotoDropzone` — drag & drop con preview, acepta JPEG/PNG/WebP < 10MB
- `QRDisplay` — muestra QR generado, botones: descargar PNG, imprimir ZPL

**Módulo Depreciación:**
- `DepreciacionTable` — activo, valor adq, depreciación anual, años en uso, dep. acumulada, valor libro, %
- `DepreciacionLineChart` — evolución del valor libro en el tiempo

**Módulo Asignaciones:**
- `AsignacionesDataTable` — activo, empleado, cédula, área, centro de costo, fecha, estado
- `AsignarActivoForm` — modal con campos de asignación
- `AsignacionStatusBadge` — `vigente`=green, `baja`=gray

**Módulo Mantenimiento:**
- `MantenimientoDataTable` — activo, tipo, técnico, fecha, costo, estado
- `MantenimientoStatusBadge` — `programado`=blue, `en_proceso`=yellow, `completado`=green, `cancelado`=red
- `NuevoMantenimientoForm` — modal con tipo, descripción, técnico, proveedor, fechas, costo

**Módulo Reportes:**
- `ReporteSelectorCard` — tarjetas con tipos de reporte, descripción y botón exportar
- Tipos: Inventario, Depreciación, Asignaciones, Mantenimiento, Auditoría

**Módulo Categorías:**
- `CategoriaCard` — ícono, nombre, total activos, activos, bajas, botón editar
- `CategoriaForm` — modal: nombre, ícono (selector), color, vida útil default

**Módulo Auditoría:**
- `AuditLogTable` — fecha, usuario, acción, detalle, IP
- `AccionBadge` — colores por tipo de acción

**Módulo Configuración:**
- `ConfiguracionGeneral` — parámetros del sistema (método depreciación, moneda)
- `IntegracionCard` — tarjeta con estado de integración (core bancario, contabilidad)
- `DispositivoCard` — nombre, tipo, protocolo, estado, driver, última conexión
- `NuevoDispositivoForm` — modal para agregar impresoras/lectores

## 8.3 Navegación del sidebar

```
Sidebar CLT (dark #0a1018, colapsable):
├── Logo CLT + "ACTIVO FIJO"
├── 🏠 Dashboard              → /dashboard
├── 📦 Inventario             → /dashboard/activos
├── ➕ Nuevo Activo           → /dashboard/activos/nuevo       (solo admin)
├── 📉 Depreciación           → /dashboard/depreciacion
├── 👤 Asignaciones           → /dashboard/asignaciones
├── 🔧 Mantenimiento          → /dashboard/mantenimiento
├── 📊 Reportes               → /dashboard/reportes
├── 🏷️ Categorías             → /dashboard/categorias          (solo admin)
├── 🔍 Auditoría              → /dashboard/auditoria
└── ⚙️ Configuración          → /dashboard/configuracion       (solo admin)
```

## 8.4 Topbar

```
[Logo colapsado si sidebar colapsado] [Breadcrumb: Dashboard > Módulo > Pantalla]
                                                    [Tema 🌙/☀️] [🔔 Notif] [Avatar usuario]
```

## 8.5 Design system CLT

| Token | Valor | Uso |
|-------|-------|-----|
| `--color-primary` | `#6874B5` | Accent principal (botones, links) |
| `--color-secondary` | `#65A0D3` | Accent secundario |
| `--color-success` | `#22c55e` | Estado activo, completado |
| `--color-warning` | `#f59e0b` | En mantenimiento, programado |
| `--color-danger` | `#ef4444` | Dado de baja, cancelado |
| `--color-info` | `#3b82f6` | Reservado, programado |
| Sidebar bg | `#0a1018` | Siempre dark |
| App bg dark | `#0d1520` | Modo oscuro |
| App bg light | `#F0F2F5` | Modo claro |
| Font | Montserrat / Inter | Sistema |
