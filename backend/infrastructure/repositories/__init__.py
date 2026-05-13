from .activo_repository import PostgreSQLActivoRepository
from .asignacion_repository import PostgreSQLAsignacionRepository
from .mantenimiento_repository import PostgreSQLMantenimientoRepository
from .audit_log_repository import PostgreSQLAuditLogRepository
from .grupo_repository import PostgreSQLGrupoRepository
from .clase_repository import PostgreSQLClaseRepository
from .sucursal_repository import PostgreSQLSucursalRepository
from .rubro_contable_repository import PostgreSQLRubroContableRepository
from .usuario_repository import PostgreSQLUsuarioRepository
from .dispositivo_repository import PostgreSQLDispositivoRepository

__all__ = [
    "PostgreSQLActivoRepository", "PostgreSQLAsignacionRepository",
    "PostgreSQLMantenimientoRepository", "PostgreSQLAuditLogRepository",
    "PostgreSQLGrupoRepository", "PostgreSQLClaseRepository",
    "PostgreSQLSucursalRepository", "PostgreSQLRubroContableRepository",
    "PostgreSQLUsuarioRepository", "PostgreSQLDispositivoRepository",
]
