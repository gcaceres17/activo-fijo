# USE_CASES.md — Casos de Uso: Activo Fijo CLT v2.0

> Actualizado post-reunión Banco Continental, 12 de mayo de 2026.

## Índice de Use Cases

| UC | Módulo | Descripción |
|----|--------|-------------|
| UC-01 | Activos | Registrar Activo (wizard 4 pasos) |
| UC-02 | Activos | Calcular Depreciación |
| UC-03 | Activos | Generar e Imprimir Etiqueta QR (Brother P950NW) |
| UC-04 | Activos | Dar de Baja Activo |
| UC-05 | Migración | Importar Activos desde Excel/CSV |
| UC-06 | Jornadas | Crear Jornada de Inventario |
| UC-07 | Jornadas | Ejecutar Jornada (App Mobile) |
| UC-08 | Jornadas | Cerrar Jornada y Generar Reporte |
| UC-09 | Incidencias | Registrar Incidencia |
| UC-10 | Transferencias | Solicitar Transferencia |
| UC-11 | Transferencias | Aprobar / Rechazar Transferencia |
| UC-12 | Dispositivos | Registrar y Monitorear Brother P950NW |
| UC-13 | Finansys | Sincronizar Catálogo de Rubros Contables |
| UC-14 | Auth | Login (propio o AD) |

---

## UC-01 — Registrar Activo

**Módulo:** Gestión de Activos
**Actor:** admin_banco, operador
**Trigger:** Usuario completa el wizard de 4 pasos y confirma el alta

**Input DTO:**
```python
class RegistrarActivoInput(BaseModel):
    nombre: str
    grupo_id: UUID
    clase_id: UUID
    rubro_contable_id: UUID
    sucursal_id: UUID
    marca: Optional[str]
    modelo: Optional[str]
    numero_serie: Optional[str]
    fecha_compra: Optional[date]
    valor_adquisicion: Decimal      # > 0
    vida_util_meses: int            # >= 12
    valor_residual: Decimal = Decimal("0")
    responsable_nombre: str
    responsable_codigo: Optional[str]
    foto_url: Optional[str]
    centro_costo_id: Optional[UUID] # Feature flag — ignorado si FF deshabilitado
```

**Precondiciones:**
- Usuario autenticado con rol `admin_banco` u `operador`
- `grupo_id`, `clase_id`, `sucursal_id`, `rubro_contable_id` existen en el tenant
- `valor_adquisicion > 0` y `vida_util_meses >= 12`

**Flujo principal:**
1. Validar precondiciones
2. Generar código compuesto via `CodigoCompostoService.generar(tenant_id, grupo, clase, sucursal, responsable)`
3. Generar QR via `QRService.generar(codigo)`
4. Crear entidad `Activo`
5. Crear `Asignacion` vigente con responsable y sucursal
6. Persistir via `ActivoRepository.create(activo)` y `AsignacionRepository.create(asignacion)`
7. Registrar en `AuditLog`: `accion="activo.crear"`

**Output:** `ActivoCreado { id, codigo, qr_url }`

---

## UC-02 — Calcular Depreciación

**Módulo:** Gestión de Activos
**Trigger:** Consulta bajo demanda o job mensual automático

**Fórmula:**
```
dep_mensual = (valor_adquisicion - valor_residual) / vida_util_meses
dep_acumulada = dep_mensual * meses_transcurridos_desde_alta
valor_libro = max(0, valor_adquisicion - dep_acumulada)
```

**Reglas:**
- `meses_transcurridos` = diferencia en meses entre `fecha_compra` y fecha de cálculo
- El valor libro nunca puede ser < 0
- El job mensual genera registros en `DepreciacionHistorial` para cada activo activo del tenant

---

## UC-03 — Generar e Imprimir Etiqueta QR

**Módulo:** Gestión de Activos + Dispositivos
**Actor:** admin_banco, operador

**Flujo principal:**
1. Usuario selecciona uno o más activos y hace click en "Imprimir etiqueta"
2. Sistema genera imagen QR (código del activo + nombre abreviado)
3. Sistema envía job de impresión al `BrotherPrinterAdapter` usando IP de la impresora registrada
4. `BrotherPrinterAdapter` envía al Brother P950NW via SDK b-PAC o TCP puerto 9100
5. Registrar en `DispositivoLog`: activo_id, timestamp, status impresión
6. Retornar status al usuario

**Excepciones:**
- Impresora offline → retornar error con opción de descarga del QR en PNG/PDF
- Sin impresora registrada → solo descarga disponible

---

## UC-05 — Importar Activos desde Excel/CSV

**Módulo:** Migración
**Actor:** sysadmin_clt, admin_banco

**Flujo principal:**
1. Usuario sube archivo Excel/CSV
2. Sistema detecta columnas y presenta mapeo visual (columna origen → campo destino)
3. Usuario confirma mapeo
4. Sistema valida cada fila: campos obligatorios, referencias a grupos/clases/sucursales existentes
5. Genera reporte previo: N válidos, M con errores (exportable)
6. Usuario confirma importación
7. Sistema inserta en lotes de 500 filas (transaccional por lote)
8. Para filas con `valor_libro` provisto: NO recalcula depreciación histórica
9. Para filas sin `valor_libro`: calcula desde `fecha_compra` y `valor_adquisicion`
10. Registra AuditLog: `accion="migracion.importar"`, payload con stats

---

## UC-06 — Crear Jornada de Inventario

**Módulo:** Jornadas
**Actor:** admin_banco

**Input:**
```python
class CrearJornadaInput(BaseModel):
    nombre: str
    sucursal_ids: List[UUID]       # Una o más sucursales/áreas
    relevador_ids: List[UUID]
    fecha_programada: Optional[date]
```

**Flujo:**
1. Validar que las sucursales y relevadores existen en el tenant
2. Generar lista de `ItemJornada` para todos los activos asignados a las sucursales seleccionadas
3. Crear `Jornada` en estado `pendiente`
4. Notificar a relevadores asignados (si hay sistema de notificaciones)
5. Registrar AuditLog

---

## UC-07 — Ejecutar Jornada (App Mobile Flutter)

**Módulo:** Jornadas + App Mobile
**Actor:** relevador

**Flujo:**
1. Relevador abre app Flutter y selecciona jornada asignada
2. App descarga lista de `ItemJornada` pendientes de su jornada
3. Por cada activo: relevador escanea QR con cámara del dispositivo
4. App identifica el activo y presenta opciones: Encontrado / No encontrado / Con incidencia
5. Si "Con incidencia": presenta formulario rápido (tipo + descripción + foto)
6. App sincroniza cada registro con el servidor en tiempo real
7. Al primer escaneo, la Jornada pasa a estado `en_progreso`

---

## UC-08 — Cerrar Jornada

**Módulo:** Jornadas
**Actor:** admin_banco

**Flujo:**
1. Admin selecciona jornada en progreso y hace click en "Cerrar Jornada"
2. Sistema calcula conciliación: encontrados / no_encontrados / con_incidencia / pendientes
3. Los activos `no_encontrado` generan automáticamente `Incidencia` tipo "activo_no_encontrado"
4. Sistema genera reporte de cierre (PDF + XLSX): resumen por área y detalle por activo
5. Jornada pasa a estado `cerrada`
6. Registrar AuditLog

---

## UC-09 — Registrar Incidencia

**Módulo:** Incidencias
**Actor:** relevador (desde app), operador/admin (desde web)

**Input:**
```python
class RegistrarIncidenciaInput(BaseModel):
    activo_id: UUID
    tipo: str                       # Del catálogo de tipos del tenant
    descripcion: str
    foto_url: Optional[str]
    jornada_id: Optional[UUID]
```

**Flujo:**
1. Validar que el activo existe y está activo
2. Crear `Incidencia` en estado `abierta`
3. Alertar al `admin_banco` vía dashboard
4. Registrar AuditLog

---

## UC-10 — Solicitar Transferencia

**Módulo:** Transferencias
**Actor:** operador, admin_banco

**Flujo (con aprobación activada):**
1. Usuario selecciona activo, destino (sucursal y/o responsable) y motivo
2. Crear `Transferencia` en estado `pendiente_aprobacion`
3. Notificar al admin del tenant
4. Admin aprueba → ejecutar UC-11
5. Admin rechaza → Transferencia en estado `rechazada`

**Flujo (sin aprobación):**
1. Crear Transferencia directamente en estado `aprobada`
2. Actualizar Asignacion vigente del activo
3. Registrar AuditLog

---

## UC-12 — Registrar y Monitorear Brother P950NW

**Módulo:** Dispositivos
**Actor:** sysadmin_clt, admin_banco

**Flujo registro:**
1. Admin ingresa nombre, tipo (impresora_etiquetas), IP del dispositivo en red LAN
2. Sistema ejecuta test de conexión vía `BrotherPrinterAdapter.ping(ip)`
3. Si OK: Dispositivo registrado en estado `online`
4. Si falla: Dispositivo registrado en estado `offline` con alerta

**Monitoreo:**
- Job periódico (cada 5 min) hace ping a cada dispositivo registrado
- Si pasa de `online` a `offline`: genera alerta en dashboard del admin

---

## UC-13 — Sincronizar Catálogo de Rubros Contables

**Módulo:** Integración Finansys
**Actor:** sysadmin_clt (o job automático)

**Flujo:**
1. Invocar `FinansysAdapter.get_rubros()`
2. Para cada rubro recibido:
   - Si existe por `finansys_id`: actualizar nombre y estado
   - Si no existe: crear con `origen='finansys'`
3. Registrar AuditLog con stats de la sincronización
4. Los rubros Finansys no pueden eliminarse; solo deshabilitarse si `activo=false`

**Fallback:** Si Finansys no disponible, los rubros manuales existentes permanecen sin cambios.
