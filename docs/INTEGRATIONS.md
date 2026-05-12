# INTEGRATIONS.md — Integraciones Externas: Activo Fijo CLT

## Integraciones en scope de la POC v1

### INT-01 — Generación QR (local, sin integración externa)

**Port:** `QRServicePort`
**Tipo:** Librería Python (qrcode + Pillow), sin red externa
**Uso:** Generar PNG y ZPL para activos en jornadas de inventario

**Mock en POC:** No aplica — la librería funciona offline
**Producción:** Misma implementación, agregar parámetros de impresora Zebra por tenant

---

### INT-02 — Storage de archivos (fotos y documentos)

**Port:** `StoragePort`
**Tipo:** Sistema de archivos local (POC) → S3-compatible (producción)

**Mock (`LocalStorageAdapter`):**
```python
async def upload(self, tenant_id, filename, content, content_type) -> str:
    path = f"./storage/{tenant_id}/{filename}"
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_bytes(content)
    return f"/static/{tenant_id}/{filename}"
```

**Producción (`S3StorageAdapter`):**
- Usar boto3 / MinIO client
- Cambiar inyección en `main.py`, sin tocar use cases

---

## ⚠️ Integraciones PENDIENTES para producción (fuera de scope POC)

| Sistema | Descripción | Estado |
|---------|-------------|--------|
| Core bancario Continental | Auth centralizada, sync de empleados y centros de costo | ⚠️ PENDIENTE |
| Sistema contable | Exportar asientos de depreciación mensual automáticamente | ⚠️ PENDIENTE |
| Directorio LDAP/AD | Login con credenciales corporativas | ⚠️ PENDIENTE |
| Impresoras Zebra (red) | Imprimir etiquetas QR vía ZPL sobre TCP/IP | ⚠️ PENDIENTE |
| Email (SMTP) | Notificaciones de mantenimientos programados | ⚠️ PENDIENTE |

**Nota de arquitectura:** Gracias a los ports, todas estas integraciones se agregan implementando un nuevo Adapter sin modificar el dominio ni los use cases. Este es el beneficio clave de la arquitectura hexagonal.
