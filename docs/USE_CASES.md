# USE_CASES.md — Casos de Uso: Activo Fijo CLT

## UC-01 — Registrar Activo

**Módulo:** Inventario de Activos
**Actor:** admin
**Trigger:** Usuario completa el wizard de 4 pasos y confirma el alta

**Input DTO:**
```python
class RegistrarActivoInput(BaseModel):
    nombre: str
    categoria_id: UUID
    marca: Optional[str] = None
    modelo: Optional[str] = None
    numero_serie: Optional[str] = None
    fecha_compra: Optional[date] = None
    valor_adquisicion: Decimal
    vida_util_años: int = 5
    valor_residual: Decimal = Decimal("0")
    area: Optional[str] = None
    centro_costo_id: Optional[UUID] = None
    responsable: Optional[str] = None
    ubicacion: Optional[str] = None
    foto_url: Optional[str] = None
```

**Precondiciones:**
- Usuario autenticado con rol `admin`
- `categoria_id` existe en el tenant
- `centro_costo_id` existe en el tenant (si se provee)
- `valor_adquisicion > 0`
- `vida_util_años >= 1`

**Flujo principal:**
1. Validar precondiciones (lanza `ValueError` si falla)
2. Verificar que `categoria_id` existe via `CategoriaRepositoryPort.get_by_id()`
3. Generar código único via `ActivoRepositoryPort.next_codigo(tenant_id)`
4. Crear instancia `Activo` con estado `activo`
5. Persistir via `ActivoRepositoryPort.create(activo)`
6. Registrar en audit log via `AuditLogRepositoryPort.append()`
7. Retornar `RegistrarActivoOutput`

**Output DTO:**
```python
class RegistrarActivoOutput(BaseModel):
    id: UUID
    codigo: str
    nombre: str
    valor_libro_actual: Decimal
```

**Excepciones:**
- `ValueError`: validación de campos fallida
- `NotFoundError`: categoria o centro de costo no existe
- `ConflictError`: número de serie duplicado en el tenant

---

## UC-02 — Consultar Inventario

**Módulo:** Inventario de Activos
**Actor:** admin, operador, auditor
**Trigger:** Usuario accede al listado con filtros opcionales

**Input DTO:**
```python
class ConsultarInventarioInput(BaseModel):
    tenant_id: UUID
    categoria_id: Optional[UUID] = None
    estado: Optional[str] = None
    centro_costo_id: Optional[UUID] = None
    area: Optional[str] = None
    q: Optional[str] = None        # búsqueda libre
    page: int = 1
    page_size: int = 20
```

**Flujo principal:**
1. Validar paginación (`page >= 1`, `page_size <= 100`)
2. Delegar a `ActivoRepositoryPort.list()` con filtros
3. Retornar lista paginada

**Output DTO:**
```python
class ConsultarInventarioOutput(BaseModel):
    items: List[ActivoSummary]
    total: int
    page: int
    page_size: int
    total_pages: int
```

---

## UC-03 — Consultar Detalle de Activo

**Módulo:** Inventario de Activos
**Actor:** admin, operador, auditor
**Trigger:** Click en activo de la tabla

**Flujo principal:**
1. Obtener activo via `ActivoRepositoryPort.get_by_id()`
2. Obtener asignaciones via `AsignacionRepositoryPort.list_by_activo()`
3. Obtener mantenimientos via `MantenimientoRepositoryPort.list_by_activo()`
4. Calcular tabla de depreciación anual (con método `depreciacion_anual` del dominio)
5. Retornar vista completa del activo

---

## UC-04 — Actualizar Activo

**Módulo:** Inventario de Activos
**Actor:** admin
**Trigger:** Usuario edita campos en el detalle del activo

**Precondiciones:**
- Activo existe y no está `dado_de_baja`
- Campos modificados pasan validaciones de invariantes

**Flujo principal:**
1. Obtener activo actual via `ActivoRepositoryPort.get_by_id()`
2. Verificar que no está `dado_de_baja` (lanza `ConflictError`)
3. Aplicar cambios a la entidad
4. Validar invariantes del dominio
5. Persistir via `ActivoRepositoryPort.update()`
6. Registrar en audit log
7. Retornar activo actualizado

---

## UC-05 — Dar de Baja Activo

**Módulo:** Inventario de Activos
**Actor:** admin
**Trigger:** Usuario confirma la baja del activo

**Precondiciones:**
- Activo existe y está en estado `activo` o `reservado`
- No tiene asignaciones `vigentes` (se requiere desasignar primero)

**Flujo principal:**
1. Verificar estado del activo
2. Verificar que no tiene asignación vigente
3. Cambiar estado a `dado_de_baja`
4. Soft-delete: establecer `deleted_at = now()`
5. Registrar en audit log con motivo
6. Retornar confirmación

**Excepciones:**
- `ConflictError`: activo tiene asignación vigente activa
- `ConflictError`: activo ya está dado de baja

---

## UC-06 — Generar QR de Activo

**Módulo:** Inventario de Activos / Configuración
**Actor:** admin, operador
**Trigger:** Click en "Generar QR" en el detalle del activo

**Flujo principal:**
1. Obtener activo por ID
2. Llamar `QRServicePort.generate_png(activo_id, codigo)` → bytes PNG
3. Opcionalmente: `QRServicePort.generate_zpl(activo_id, codigo, nombre)` → ZPL para Zebra
4. Retornar PNG como response con `Content-Type: image/png`

---

## UC-07 — Asignar Activo

**Módulo:** Asignaciones
**Actor:** admin
**Trigger:** Usuario completa el formulario de asignación

**Input DTO:**
```python
class AsignarActivoInput(BaseModel):
    activo_id: UUID
    empleado_nombre: str
    empleado_cedula: Optional[str] = None
    area: str
    centro_costo_id: Optional[UUID] = None
    fecha_asignacion: date
    observaciones: Optional[str] = None
```

**Precondiciones:**
- Activo existe y está en estado `activo`
- Activo no tiene asignación `vigente` activa

**Flujo principal:**
1. Verificar estado del activo
2. Verificar que no existe asignación vigente via `AsignacionRepositoryPort.get_vigente_by_activo()`
3. Crear instancia `Asignacion` con estado `vigente`
4. Persistir via `AsignacionRepositoryPort.create()`
5. Registrar en audit log
6. Retornar asignación creada

---

## UC-08 — Dar de Baja Asignación

**Módulo:** Asignaciones
**Actor:** admin
**Trigger:** Usuario registra devolución de activo

**Flujo principal:**
1. Verificar que la asignación existe y está `vigente`
2. Actualizar `estado = "baja"` y `fecha_baja = today`
3. Persistir via `AsignacionRepositoryPort.dar_de_baja()`
4. Registrar en audit log
5. Retornar asignación actualizada

---

## UC-09 — Registrar Mantenimiento

**Módulo:** Mantenimiento
**Actor:** admin, operador
**Trigger:** Usuario completa formulario de nuevo mantenimiento

**Input DTO:**
```python
class RegistrarMantenimientoInput(BaseModel):
    activo_id: UUID
    tipo: Literal["preventivo","correctivo","predictivo"]
    descripcion: str
    tecnico: str
    proveedor: Optional[str] = None
    fecha_inicio: date
    fecha_estimada_fin: Optional[date] = None
    costo: Decimal = Decimal("0")
```

**Precondiciones:**
- Activo existe y NO está `dado_de_baja`
- Si `tipo == "correctivo"`, cambiar estado del activo a `en_mantenimiento`

**Flujo principal:**
1. Verificar activo existe y no está dado de baja
2. Crear instancia `Mantenimiento` con estado `programado`
3. Si tipo correctivo: actualizar estado activo a `en_mantenimiento`
4. Persistir mantenimiento y activo (si cambió)
5. Registrar en audit log
6. Retornar mantenimiento creado

---

## UC-10 — Cerrar Mantenimiento

**Módulo:** Mantenimiento
**Actor:** admin
**Trigger:** Técnico marca el mantenimiento como completado

**Precondiciones:**
- Mantenimiento existe y está `en_proceso` o `programado`

**Flujo principal:**
1. Obtener mantenimiento
2. Cambiar estado a `completado`, establecer `fecha_fin_real = today`
3. Si el activo estaba `en_mantenimiento`: restaurar a `activo`
4. Persistir ambas entidades
5. Registrar en audit log

---

## UC-11 — Calcular Depreciación

**Módulo:** Depreciación
**Actor:** admin, auditor, operador
**Trigger:** Usuario accede a la pantalla de depreciación o al tab en el detalle del activo

**Flujo principal:**
1. Obtener activos del tenant (opcionalmente filtrar por categoría, área, rango de fechas)
2. Para cada activo, calcular tabla de depreciación anual usando método del dominio:
   - Año 1..N: `depreciacion_anual`, `depreciacion_acumulada`, `valor_libro`
3. Agregar totales: valor total cartera, depreciación acumulada total, valor libro total
4. Retornar resultado

**Output:** Tabla con activos × años + agregados para el período seleccionado

---

## UC-12 — Exportar Reporte

**Módulo:** Reportes
**Actor:** admin, auditor
**Trigger:** Usuario hace click en "Exportar" en la pantalla de reportes

**Tipos de reporte:**
- Inventario completo (todos los activos activos)
- Depreciación por período
- Activos por área / centro de costo
- Historial de asignaciones
- Historial de mantenimientos

**Flujo principal:**
1. Obtener datos según tipo de reporte
2. Generar CSV o XLSX (formato a definir por el usuario)
3. Registrar en audit log como `EXPORTACION`
4. Retornar archivo como stream

---

## UC-13 — Dashboard KPIs

**Módulo:** Dashboard
**Actor:** todos los roles
**Trigger:** Carga inicial del sistema

**Flujo principal:**
1. Llamar `ActivoRepositoryPort.get_kpis(tenant_id)` → query optimizado en PostgreSQL
2. Retornar KPIs: total activos, valor total cartera, depreciación acumulada, activos en mantenimiento, activos dados de baja, distribución por categoría

---

## UC-14 — Subir Foto de Activo

**Módulo:** Inventario de Activos (formulario de alta / edición)
**Actor:** admin, operador
**Trigger:** Usuario arrastra o selecciona imagen del activo

**Flujo principal:**
1. Validar: archivo es imagen (MIME: image/jpeg, image/png, image/webp), tamaño < 10MB
2. Llamar `StoragePort.upload(tenant_id, filename, content, content_type)` → URL
3. Actualizar `activo.foto_url` con la URL retornada
4. Persistir activo actualizado
5. Retornar URL de la foto
