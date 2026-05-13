# DOMAIN.md — Modelo de Dominio: Activo Fijo CLT v2.0

> Actualizado post-reunión Banco Continental, 12 de mayo de 2026.

## Glosario del dominio

| Término | Definición |
|---------|-----------|
| Activo Fijo | Bien tangible con vida útil > 1 año, sujeto a depreciación contable |
| Grupo | Primera categoría de clasificación (ej: Muebles, Equipos de Cómputo) |
| Clase | Subcategoría dentro de un grupo (ej: Cajoneras dentro de Muebles) |
| Código Compuesto | Identificador único: [Sucursal]-[Grupo]-[Clase]-[Responsable]-[Correlativo] |
| Rubro Contable | Clasificación contable del activo según plan de cuentas (fuente: Finansys) |
| Depreciación SLN | Método línea recta: (Valor adq. − Valor residual) / Vida útil en meses |
| Valor Libro | Valor adquisición − depreciación acumulada a la fecha |
| Asignación | Vinculación activo ↔ responsable/área. Solo una vigente por activo |
| Jornada de Inventario | Proceso periódico de verificación física con app Flutter y QR |
| Relevador | Persona que ejecuta la jornada con la app mobile |
| Incidencia | Anomalía detectada en un activo (dañado, faltante, mal ubicado) |
| Transferencia | Movimiento de activo entre sucursales o responsables |
| Soft Delete | Eliminación lógica marcada con `deleted_at`; nunca física |
| AuditLog | Registro append-only de toda acción del sistema |
| Feature Flag | Interruptor de campo/funcionalidad por tenant |
| Tenant | Empresa del holding que usa la plataforma con datos aislados |

---

## Entidades del dominio

### Activo (entidad raíz)
```python
@dataclass
class Activo:
    id: UUID
    tenant_id: UUID
    codigo: str                    # Código compuesto auto-generado. Inmutable.
    nombre: str
    grupo_id: UUID                 # FK → Grupo
    clase_id: UUID                 # FK → Clase
    rubro_contable_id: UUID        # FK → RubroContable
    sucursal_id: UUID              # FK → Sucursal
    marca: Optional[str]
    modelo: Optional[str]
    numero_serie: Optional[str]
    fecha_compra: Optional[date]
    valor_adquisicion: Decimal     # > 0, requerido
    vida_util_meses: int           # >= 12
    valor_residual: Decimal        # default: 0
    foto_url: Optional[str]
    qr_url: Optional[str]
    centro_costo_id: Optional[UUID]  # Feature flag — inactivo al arranque
    estado: Literal['activo','en_mantenimiento','dado_de_baja']
    deleted_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
```

### Grupo
```python
@dataclass
class Grupo:
    id: UUID
    tenant_id: UUID
    codigo: str           # Ej: "MUE"
    nombre: str           # Ej: "Muebles"
    deleted_at: Optional[datetime]
```

### Clase
```python
@dataclass
class Clase:
    id: UUID
    tenant_id: UUID
    grupo_id: UUID        # FK → Grupo. Siempre tiene grupo padre.
    codigo: str           # Ej: "CAJ"
    nombre: str           # Ej: "Cajoneras"
    tasa_depreciacion: Optional[Decimal]  # Predeterminada por clase; puede sobrescribirse por activo
    deleted_at: Optional[datetime]
```

### Sucursal
```python
@dataclass
class Sucursal:
    id: UUID
    tenant_id: UUID
    codigo: str
    nombre: str
    parent_id: Optional[UUID]  # Jerarquía: hasta 3 niveles (sucursal → área → sector)
    nivel: int                  # 1 = sucursal, 2 = área, 3 = sector
    deleted_at: Optional[datetime]
```

### RubroContable
```python
@dataclass
class RubroContable:
    id: UUID
    tenant_id: UUID
    codigo: str
    nombre: str
    origen: Literal['manual', 'finansys']
    finansys_id: Optional[str]
    activo: bool
    deleted_at: Optional[datetime]
```

### Asignacion
```python
@dataclass
class Asignacion:
    id: UUID
    tenant_id: UUID
    activo_id: UUID
    responsable_nombre: str        # ⚠️ Hasta que haya integración RRHH
    responsable_codigo: Optional[str]  # Legajo o código libre (a confirmar)
    sucursal_id: UUID
    vigente: bool                  # Solo una vigente por activo (DB constraint)
    fecha_inicio: date
    fecha_fin: Optional[date]
    created_at: datetime
```

### Jornada
```python
@dataclass
class Jornada:
    id: UUID
    tenant_id: UUID
    nombre: str
    sucursales: List[UUID]         # Lista de sucursal_id incluidas
    estado: Literal['pendiente', 'en_progreso', 'cerrada']
    fecha_inicio: Optional[date]
    fecha_cierre: Optional[date]
    relevadores: List[UUID]        # Lista de usuario_id asignados
    created_by: UUID
    created_at: datetime
```

### ItemJornada
```python
@dataclass
class ItemJornada:
    id: UUID
    jornada_id: UUID
    activo_id: UUID
    estado: Literal['pendiente', 'encontrado', 'no_encontrado', 'con_incidencia']
    foto_url: Optional[str]
    escaneado_by: Optional[UUID]   # relevador_id
    escaneado_at: Optional[datetime]
```

### Incidencia
```python
@dataclass
class Incidencia:
    id: UUID
    tenant_id: UUID
    activo_id: UUID
    jornada_id: Optional[UUID]     # Puede originarse fuera de una jornada
    tipo: str                       # Parametrizable
    descripcion: str
    foto_url: Optional[str]
    estado: Literal['abierta', 'en_gestion', 'resuelta', 'cerrada']
    responsable_id: Optional[UUID]
    created_by: UUID
    created_at: datetime
```

### Transferencia
```python
@dataclass
class Transferencia:
    id: UUID
    tenant_id: UUID
    activo_id: UUID
    sucursal_origen_id: UUID
    sucursal_destino_id: Optional[UUID]
    responsable_origen: str
    responsable_destino: str
    motivo: str
    estado: Literal['pendiente_aprobacion', 'aprobada', 'rechazada']
    aprobado_by: Optional[UUID]
    aprobado_at: Optional[datetime]
    created_by: UUID
    created_at: datetime
```

### Dispositivo
```python
@dataclass
class Dispositivo:
    id: UUID
    tenant_id: UUID
    nombre: str
    tipo: Literal['impresora_etiquetas', 'movil_relevador']
    modelo: str                    # Ej: "Brother P950NW"
    ip_address: Optional[str]
    estado_conexion: Literal['online', 'offline', 'desconocido']
    ultimo_ping: Optional[datetime]
    config: dict                   # JSON: parámetros de impresión, ancho cinta, etc.
    deleted_at: Optional[datetime]
```

### AuditLog
```python
@dataclass
class AuditLog:
    id: UUID
    tenant_id: UUID
    usuario_id: UUID
    accion: str                    # Ej: "activo.crear", "jornada.cerrar"
    entidad: str                   # Ej: "Activo", "Transferencia"
    entidad_id: UUID
    payload_before: Optional[dict]
    payload_after: Optional[dict]
    ip_address: Optional[str]
    created_at: datetime           # NUNCA modificar este registro
```

### Usuario
```python
@dataclass
class Usuario:
    id: UUID
    tenant_id: UUID
    email: str
    password_hash: Optional[str]   # None si usa AD
    nombre_completo: str
    rol: Literal['sysadmin_clt', 'admin_banco', 'operador', 'auditor', 'relevador']
    activo: bool
    ad_subject: Optional[str]      # Para integración Active Directory
    deleted_at: Optional[datetime]
```

---

## Reglas de negocio del dominio

- **RN-D1**: Un activo solo puede tener una `Asignacion` con `vigente=True` (constraint único en DB).
- **RN-D2**: El `codigo` de un `Activo` es inmutable una vez generado.
- **RN-D3**: El valor libro nunca puede ser negativo; cuando llega a cero el activo está completamente depreciado.
- **RN-D4**: Una `Clase` siempre tiene un `Grupo` padre; no puede existir sin él.
- **RN-D5**: Una `Sucursal` tiene máximo 3 niveles de jerarquía.
- **RN-D6**: Un `AuditLog` es append-only; nunca se modifica ni elimina.
- **RN-D7**: Los activos dados de baja se marcan con `deleted_at`; nunca se eliminan físicamente.
- **RN-D8**: Una `Jornada` puede quedar en estado `en_progreso` durante múltiples días.
- **RN-D9**: Los activos `no_encontrado` en una Jornada generan automáticamente una `Incidencia` de tipo "activo_no_encontrado".
- **RN-D10**: Un `RubroContable` de origen `finansys` no puede eliminarse, solo deshabilitarse.
