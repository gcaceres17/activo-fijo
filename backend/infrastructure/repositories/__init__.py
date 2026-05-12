from .activo_repository import PostgreSQLActivoRepository
from .asignacion_repository import PostgreSQLAsignacionRepository
from .mantenimiento_repository import PostgreSQLMantenimientoRepository
from .audit_log_repository import PostgreSQLAuditLogRepository
from .categoria_repository import PostgreSQLCategoriaRepository
from .centro_costo_repository import PostgreSQLCentroCostoRepository
from .usuario_repository import PostgreSQLUsuarioRepository
from .dispositivo_repository import PostgreSQLDispositivoRepository

__all__ = [
    "PostgreSQLActivoRepository", "PostgreSQLAsignacionRepository",
    "PostgreSQLMantenimientoRepository", "PostgreSQLAuditLogRepository",
    "PostgreSQLCategoriaRepository", "PostgreSQLCentroCostoRepository",
    "PostgreSQLUsuarioRepository", "PostgreSQLDispositivoRepository",
]
