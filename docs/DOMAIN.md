# DOMAIN.md — Modelo de Dominio: Activo Fijo CLT

## Glosario del dominio

| Término | Definición |
|---------|-----------|
| Activo Fijo | Bien tangible de la empresa con vida útil > 1 año y sujeto a depreciación |
| Depreciación | Pérdida de valor sistemática de un activo a lo largo de su vida útil |
| Centro de Costo | Unidad contable que agrupa gastos por área o departamento |
| Asignación | Vinculación formal de un activo a un empleado o área responsable |
| Jornada de Inventario | Proceso periódico de verificación física de activos mediante QR/barcode |
| Baja de Activo | Retiro definitivo de un activo del inventario activo |
| Vida Útil | Período estimado de uso productivo de un activo (en años) |
| Valor Residual | Valor estimado del activo al final de su vida útil (default: 0) |

---

## 2.1 — Entidad: Activo

**Descripción:** Bien tangible propiedad de la empresa, sujeto a depreciación y gestión de ciclo de vida completo.

```python
from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal
from typing import Optional, Literal, List
from uuid import UUID

@dataclass
class Activo:
    """Activo fijo de la empresa. Entidad raíz del dominio."""
    id: UUID
    tenant_id: UUID                                          # empresa del holding
    codigo: str                                              # ACT-XXXX auto-generado
    nombre: str                                              # descripción del bien
    categoria_id: UUID                                       # FK → Categoria
    marca: Optional[str] = None
    modelo: Optional[str] = None
    numero_serie: Optional[str] = None
    fecha_compra: Optional[date] = None
    valor_adquisicion: Decimal = Decimal("0")               # en guaraníes PYG
    vida_util_años: int = 5                                  # para cálculo lineal
    valor_residual: Decimal = Decimal("0")                   # default: sin valor residual
    estado: Literal["activo","en_mantenimiento","dado_de_baja","reservado"] = "activo"
    area: Optional[str] = None
    centro_costo_id: Optional[UUID] = None                   # FK → CentroCosto
    responsable: Optional[str] = None
    ubicacion: Optional[str] = None
    foto_url: Optional[str] = None                           # ruta en storage
    documentos: List[str] = field(default_factory=list)     # lista de rutas
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    deleted_at: Optional[datetime] = None

    # — Computed properties (sin persistencia) —
    @property
    def depreciacion_anual(self) -> Decimal:
        """Método de línea recta (SLN): (valor_adq - valor_residual) / vida_útil"""
        if self.vida_util_años == 0:
            return Decimal("0")
        return (self.valor_adquisicion - self.valor_residual) / self.vida_util_años

    @property
    def años_en_uso(self) -> int:
        if not self.fecha_compra:
            return 0
        return (date.today() - self.fecha_compra).days // 365

    @property
    def depreciacion_acumulada(self) -> Decimal:
        años = min(self.años_en_uso, self.vida_util_años)
        return self.depreciacion_anual * años

    @property
    def valor_libro_actual(self) -> Decimal:
        return max(self.valor_adquisicion - self.depreciacion_acumulada, self.valor_residual)

    @property
    def esta_activo(self) -> bool:
        return self.deleted_at is None and self.estado != "dado_de_baja"
```

**Invariantes:**
- INV-1.1: `valor_adquisicion >= 0`
- INV-1.2: `vida_util_años >= 1`
- INV-1.3: `valor_residual <= valor_adquisicion`
- INV-1.4: Un activo `dado_de_baja` no puede asignarse ni ponerse `en_mantenimiento`
- INV-1.5: El `codigo` es único por `tenant_id`

**Transiciones de estado:**
```
activo ──────────────────→ en_mantenimiento → activo
  │                                            │
  └──→ reservado ────────────────────────────→ activo
  │
  └──→ dado_de_baja  (terminal, irreversible)
```

---

## 2.2 — Entidad: Categoria

```python
@dataclass
class Categoria:
    """Clasificación de activos fijos (equipos, muebles, vehículos, etc.)"""
    id: UUID
    tenant_id: UUID
    nombre: str                     # "Equipos de Cómputo", "Vehículos", etc.
    icono: str                      # nombre de icono Lucide
    color_hex: str                  # color para UI (#6874B5)
    vida_util_default_años: int = 5 # se puede sobrescribir por activo
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    deleted_at: Optional[datetime] = None
```

**Invariantes:**
- INV-2.1: `nombre` único por `tenant_id`
- INV-2.2: `vida_util_default_años >= 1`

---

## 2.3 — Entidad: CentroCosto

```python
@dataclass
class CentroCosto:
    """Unidad contable para agrupación de gastos de activos."""
    id: UUID
    tenant_id: UUID
    codigo: str                     # "TEC-001", "FIN-002"
    nombre: str                     # "Tecnología e Innovación"
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    deleted_at: Optional[datetime] = None
```

**Invariantes:**
- INV-3.1: `codigo` único por `tenant_id`

---

## 2.4 — Entidad: Asignacion

```python
@dataclass
class Asignacion:
    """Asignación formal de un activo a un empleado o área."""
    id: UUID
    tenant_id: UUID
    activo_id: UUID
    empleado_nombre: str
    empleado_cedula: Optional[str] = None
    area: str = ""
    centro_costo_id: Optional[UUID] = None
    fecha_asignacion: date = field(default_factory=date.today)
    fecha_baja: Optional[date] = None
    observaciones: Optional[str] = None
    estado: Literal["vigente","baja"] = "vigente"
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
```

**Invariantes:**
- INV-4.1: Un activo solo puede tener una asignación `vigente` a la vez
- INV-4.2: `fecha_baja >= fecha_asignacion` si `fecha_baja` está presente
- INV-4.3: Solo se puede asignar un activo en estado `activo` o `reservado`

---

## 2.5 — Entidad: Mantenimiento

```python
@dataclass
class Mantenimiento:
    """Registro de intervención de mantenimiento sobre un activo."""
    id: UUID
    tenant_id: UUID
    activo_id: UUID
    tipo: Literal["preventivo","correctivo","predictivo"]
    descripcion: str
    tecnico: str
    proveedor: Optional[str] = None
    fecha_inicio: date = field(default_factory=date.today)
    fecha_estimada_fin: Optional[date] = None
    fecha_fin_real: Optional[date] = None
    costo: Decimal = Decimal("0")
    estado: Literal["programado","en_proceso","completado","cancelado"] = "programado"
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
```

**Invariantes:**
- INV-5.1: `costo >= 0`
- INV-5.2: Al pasar a `completado`, `fecha_fin_real` debe establecerse
- INV-5.3: Un activo `dado_de_baja` no puede tener mantenimientos nuevos

---

## 2.6 — Entidad: AuditLog

```python
@dataclass
class AuditLog:
    """Registro inmutable de toda acción realizada sobre el sistema."""
    id: UUID
    tenant_id: UUID
    fecha_hora: datetime
    usuario_email: str
    accion: Literal[
        "ALTA_ACTIVO","MODIFICACION","BAJA_ACTIVO",
        "ASIGNACION","BAJA_ASIGNACION",
        "ALTA_MANTENIMIENTO","CIERRE_MANTENIMIENTO",
        "CONSULTA_REPORTE","CONSULTA_DEPRECIACION",
        "LOGIN","LOGOUT","EXPORTACION"
    ]
    entidad: str                    # "Activo", "Asignacion", etc.
    entidad_id: Optional[UUID] = None
    detalle: str = ""
    ip_origen: Optional[str] = None
    # AuditLog es inmutable: no tiene updated_at ni deleted_at
    created_at: datetime = field(default_factory=datetime.utcnow)
```

**Invariantes:**
- INV-6.1: Los audit logs NUNCA se modifican ni eliminan (append-only)
- INV-6.2: Toda operación de escritura genera al menos un audit log

---

## 2.7 — Entidad: Dispositivo

```python
@dataclass
class Dispositivo:
    """Dispositivo periférico para jornadas de inventario (impresoras, lectores QR)."""
    id: UUID
    tenant_id: UUID
    nombre: str                                             # "Zebra ZD421"
    tipo: Literal["impresora","lector_qr","lector_barcode"]
    protocolo: Literal["usb","tcp_ip","bluetooth","usb_hid"]
    driver: Optional[str] = None
    ip_address: Optional[str] = None                       # para TCP/IP
    estado: Literal["conectado","desconectado","emparejado"] = "desconectado"
    ultima_conexion: Optional[datetime] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
```

---

## 2.8 — Entidad: Usuario

```python
@dataclass
class Usuario:
    """Usuario del sistema con rol y acceso a un tenant."""
    id: UUID
    tenant_id: UUID
    email: str
    nombre_completo: str
    rol: Literal["admin","operador","auditor"] = "operador"
    activo: bool = True
    ultimo_login: Optional[datetime] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    # password_hash almacenado solo en infrastructure, nunca en dominio
```

---

## Sección 5 — Ports (Interfaces Abstractas)

### ActivoRepositoryPort

```python
from abc import ABC, abstractmethod
from typing import List, Optional, Tuple
from uuid import UUID

class ActivoRepositoryPort(ABC):
    @abstractmethod
    async def get_by_id(self, id: UUID, tenant_id: UUID) -> Optional[Activo]: ...
    @abstractmethod
    async def get_by_codigo(self, codigo: str, tenant_id: UUID) -> Optional[Activo]: ...
    @abstractmethod
    async def list(self, tenant_id: UUID, *, categoria_id=None, estado=None,
                   centro_costo_id=None, area=None, q=None,
                   page=1, page_size=20) -> Tuple[List[Activo], int]: ...
    @abstractmethod
    async def create(self, activo: Activo) -> Activo: ...
    @abstractmethod
    async def update(self, activo: Activo) -> Activo: ...
    @abstractmethod
    async def soft_delete(self, id: UUID, tenant_id: UUID) -> None: ...
    @abstractmethod
    async def get_kpis(self, tenant_id: UUID) -> dict: ...
    @abstractmethod
    async def next_codigo(self, tenant_id: UUID) -> str: ...
```

### CategoriaRepositoryPort

```python
class CategoriaRepositoryPort(ABC):
    @abstractmethod
    async def list(self, tenant_id: UUID) -> List[Categoria]: ...
    @abstractmethod
    async def get_by_id(self, id: UUID, tenant_id: UUID) -> Optional[Categoria]: ...
    @abstractmethod
    async def create(self, categoria: Categoria) -> Categoria: ...
    @abstractmethod
    async def update(self, categoria: Categoria) -> Categoria: ...
```

### AsignacionRepositoryPort

```python
class AsignacionRepositoryPort(ABC):
    @abstractmethod
    async def get_vigente_by_activo(self, activo_id: UUID, tenant_id: UUID) -> Optional[Asignacion]: ...
    @abstractmethod
    async def list_by_activo(self, activo_id: UUID, tenant_id: UUID) -> List[Asignacion]: ...
    @abstractmethod
    async def list(self, tenant_id: UUID, *, page=1, page_size=20) -> Tuple[List[Asignacion], int]: ...
    @abstractmethod
    async def create(self, asignacion: Asignacion) -> Asignacion: ...
    @abstractmethod
    async def dar_de_baja(self, id: UUID, tenant_id: UUID, fecha_baja: date) -> Asignacion: ...
```

### MantenimientoRepositoryPort

```python
class MantenimientoRepositoryPort(ABC):
    @abstractmethod
    async def list_by_activo(self, activo_id: UUID, tenant_id: UUID) -> List[Mantenimiento]: ...
    @abstractmethod
    async def list(self, tenant_id: UUID, *, estado=None, page=1, page_size=20) -> Tuple[List[Mantenimiento], int]: ...
    @abstractmethod
    async def get_by_id(self, id: UUID, tenant_id: UUID) -> Optional[Mantenimiento]: ...
    @abstractmethod
    async def create(self, mnt: Mantenimiento) -> Mantenimiento: ...
    @abstractmethod
    async def update(self, mnt: Mantenimiento) -> Mantenimiento: ...
```

### AuditLogRepositoryPort

```python
class AuditLogRepositoryPort(ABC):
    @abstractmethod
    async def append(self, log: AuditLog) -> None: ...
    @abstractmethod
    async def list(self, tenant_id: UUID, *, page=1, page_size=50) -> Tuple[List[AuditLog], int]: ...
```

### QRServicePort

```python
class QRServicePort(ABC):
    @abstractmethod
    async def generate_png(self, activo_id: UUID, codigo: str) -> bytes:
        """Genera PNG del QR para el activo. Retorna bytes."""
        ...
    @abstractmethod
    async def generate_zpl(self, activo_id: UUID, codigo: str, nombre: str) -> str:
        """Genera comando ZPL para impresoras Zebra."""
        ...
```

### StoragePort

```python
class StoragePort(ABC):
    @abstractmethod
    async def upload(self, tenant_id: UUID, filename: str, content: bytes, content_type: str) -> str:
        """Sube archivo y retorna URL de acceso."""
        ...
    @abstractmethod
    async def delete(self, url: str) -> None: ...
```
