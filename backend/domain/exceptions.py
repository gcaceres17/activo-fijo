"""Excepciones del dominio — sin dependencias de frameworks."""


class DomainError(Exception):
    """Base para todas las excepciones del dominio."""
    pass


class NotFoundError(DomainError):
    """Entidad no encontrada."""
    def __init__(self, entity: str, id: str):
        super().__init__(f"{entity} con id '{id}' no encontrado")
        self.entity = entity
        self.entity_id = id


class ConflictError(DomainError):
    """Violación de invariante de negocio (ej: asignación duplicada)."""
    pass


class ValidationError(DomainError):
    """Error de validación de datos de entrada."""
    pass


class PermissionError(DomainError):
    """El usuario no tiene permisos para realizar la operación."""
    pass


class BusinessRuleError(DomainError):
    """Violación de regla de negocio específica."""
    pass
