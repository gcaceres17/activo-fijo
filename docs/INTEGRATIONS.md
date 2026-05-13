# INTEGRATIONS.md — Integraciones: Activo Fijo CLT v2.0

> Actualizado post-reunión Banco Continental, 12 de mayo de 2026.

## 1. Finansys (ERP) — Fase 1: Solo Lectura

| Campo | Detalle |
|-------|---------|
| Propósito | Sincronizar catálogo de rubros contables |
| Dirección | Finansys → Sistema (unidireccional) |
| Tipo | API REST (preferido) / Acceso directo a BD (alternativo) |
| Frecuencia | Bajo demanda (manual) o job automático configurable |
| Fase 2 | Escritura de asientos de depreciación |
| Estado | ⚠️ PENDIENTE: confirmar API REST o BD con referente técnico |

### Adapter interface
```python
class FinansysPort(ABC):
    @abstractmethod
    async def get_rubros_contables(self) -> List[RubroContableDTO]: ...
    
    # Fase 2
    @abstractmethod
    async def registrar_asiento_depreciacion(self, data: AsientoDTO) -> str: ...
```

### Implementaciones
- `FinansysRESTAdapter` — si Finansys expone API REST
- `FinansysDBAdapter` — si la integración es vía acceso directo a base de datos

---

## 2. Active Directory (Auth) — Opcional

| Campo | Detalle |
|-------|---------|
| Propósito | Autenticación centralizada SSO del banco |
| Dirección | AD → Sistema (autenticación) |
| Protocolo | LDAP / OAuth2 / SAML (a confirmar con TI banco) |
| Estado | ⚠️ PENDIENTE: confirmar AD vs. usuarios propios del sistema |

### Adapter interface
```python
class AuthPort(ABC):
    @abstractmethod
    async def autenticar(self, email: str, password: str) -> AuthResult: ...
    
    @abstractmethod
    async def validar_token(self, token: str) -> TokenPayload: ...
```

### Implementaciones
- `LocalAuthAdapter` — JWT propio del sistema (usuario/contraseña)
- `ADAuthAdapter` — Delegación a Active Directory del banco

---

## 3. Brother P950NW (Dispositivo)

| Campo | Detalle |
|-------|---------|
| Propósito | Impresión de etiquetas QR de activos |
| Protocolo | SDK Brother b-PAC (HTTP) o raw TCP puerto 9100 |
| Conectividad | WiFi LAN — impresora y servidor en la misma red |
| Cinta | TZe 24mm Strong Adhesive (amarilla) — actual del banco |
| Fallback | Descarga PNG/PDF del QR si la impresora no está disponible |

### Adapter interface
```python
class PrinterPort(ABC):
    @abstractmethod
    async def imprimir_etiqueta(self, activo: Activo, impresora_id: UUID) -> PrintResult: ...
    
    @abstractmethod
    async def ping(self, ip: str) -> bool: ...
    
    @abstractmethod
    async def get_status(self, ip: str) -> PrinterStatus: ...
```

### Implementación
- `BrotherP950Adapter` — SDK b-PAC o raw TCP/9100

---

## 4. QR Generator (Interno)

| Campo | Detalle |
|-------|---------|
| Propósito | Generación de imagen QR para cada activo |
| Librería | `qrcode` Python (sin red externa, funciona offline) |
| Formato output | PNG (almacenado en storage del sistema) |
| Contenido | Código compuesto del activo + nombre abreviado |

---

## 5. Storage (Imágenes y QR)

| Adapter | Uso |
|---------|-----|
| `LocalStorageAdapter` | POC y desarrollo (archivos en `./storage/`) |
| `S3StorageAdapter` | Producción (compatible S3: AWS, MinIO on-premise) |
