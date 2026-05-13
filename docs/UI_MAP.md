# UI_MAP.md — Mapa de Interfaz: Activo Fijo CLT v2.0

> Actualizado post-reunión Banco Continental, 12 de mayo de 2026.

## Sistema Web (Next.js 14)

```
/login                          ← Auth: login propio o SSO/AD
/dashboard                      ← KPIs, alertas, búsqueda rápida

/activos                        ← Lista de activos con filtros
/activos/nuevo                  ← Wizard alta (4 pasos)
/activos/[id]                   ← Ficha del activo
/activos/[id]/editar
/activos/[id]/depreciacion       ← Historial y tabla de depreciación
/activos/[id]/qr                ← Vista e impresión del QR (Brother P950NW)
/activos/[id]/transferir         ← Iniciar transferencia
/activos/[id]/baja               ← Dar de baja
/activos/importar                ← Wizard de migración Excel/CSV

/jornadas                       ← Lista de jornadas
/jornadas/nueva                 ← Crear jornada (selección sucursales + relevadores)
/jornadas/[id]                  ← Detalle de jornada + progreso en tiempo real
/jornadas/[id]/cerrar           ← Cierre y generación de reporte

/incidencias                    ← Lista de incidencias con filtros
/incidencias/[id]               ← Detalle + historial de estados

/transferencias                 ← Lista de transferencias
/transferencias/[id]            ← Detalle + aprobación/rechazo

/configuracion/grupos           ← CRUD grupos
/configuracion/clases           ← CRUD clases por grupo
/configuracion/sucursales       ← CRUD sucursales con jerarquía
/configuracion/rubros           ← CRUD rubros contables + sync Finansys
/configuracion/usuarios         ← Gestión de usuarios del tenant
/configuracion/feature-flags    ← Feature flags del tenant
/configuracion/codigo           ← Configuración del código compuesto
/configuracion/alertas          ← Umbrales de alertas del dashboard
/configuracion/dispositivos     ← Gestión Brother P950NW y móviles

/reportes/depreciacion          ← Reporte depreciación por período
/reportes/inventario            ← Inventario por sucursal/estado
/reportes/jornadas              ← Histórico de jornadas

/admin                          ← Solo sysadmin CLT
/admin/tenants                  ← Gestión de tenants del holding
/admin/feature-flags            ← Feature flags globales
```

## App Mobile Flutter

```
/login                          ← Login relevador
/jornadas                       ← Jornadas asignadas al relevador
/jornadas/[id]                  ← Lista de activos pendientes + progreso
/jornadas/[id]/escanear         ← Cámara QR + registro de estado
/jornadas/[id]/incidencia/nueva ← Formulario rápido de incidencia
/perfil                         ← Datos del relevador
```

## Componentes clave del sistema web

| Componente | Descripción |
|-----------|-------------|
| `ActivoWizard` | Wizard 4 pasos: Identificación → Valorización → Asignación → Documentación |
| `QRViewer` | Vista del QR con botones: Imprimir (Brother) / Descargar PNG |
| `DepreciacionChart` | Gráfico de depreciación acumulada vs. valor libro a lo largo del tiempo |
| `JornadaProgress` | Barra de progreso en tiempo real: encontrados/pendientes/incidencias |
| `AlertasDashboard` | Widget de alertas configurables con severidad (info/warn/critical) |
| `ImportWizard` | Wizard de migración: Upload → Mapeo → Validación → Confirmación → Resultado |
| `DispositivoStatus` | Badge online/offline con último ping para cada Brother P950NW registrado |
| `TransferenciaFlow` | Flujo de solicitud y aprobación con timeline de estados |

## Roles y acceso por sección

| Sección | sysadmin_clt | admin_banco | operador | auditor | relevador |
|---------|:---:|:---:|:---:|:---:|:---:|
| Dashboard | ✓ | ✓ | ✓ | ✓ | — |
| Activos (CRUD) | ✓ | ✓ | ✓ | Solo lectura | — |
| Importación | ✓ | ✓ | — | — | — |
| Jornadas (crear/cerrar) | ✓ | ✓ | — | Solo lectura | — |
| App mobile | — | — | — | — | ✓ |
| Incidencias (gestión) | ✓ | ✓ | ✓ | Solo lectura | Solo crear (app) |
| Transferencias (aprobar) | ✓ | ✓ | — | Solo lectura | — |
| Configuración | ✓ | ✓ | — | — | — |
| Dispositivos | ✓ | ✓ | — | — | — |
| Admin (tenants) | ✓ | — | — | — | — |
