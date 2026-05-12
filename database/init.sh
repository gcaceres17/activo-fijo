#!/bin/bash
# Ejecuta migraciones en orden y luego el seed

set -e
DB="activo_fijo_db"
USER="activo_fijo"

echo "🔄 Ejecutando migraciones..."
for f in /docker-entrypoint-initdb.d/migrations/*.sql; do
    echo "  → $f"
    psql -v ON_ERROR_STOP=1 --username "$USER" --dbname "$DB" -f "$f"
done

echo "🌱 Ejecutando seed..."
psql -v ON_ERROR_STOP=1 --username "$USER" --dbname "$DB" \
    -f /docker-entrypoint-initdb.d/seed.sql || echo "⚠️ Seed ya aplicado, continuando..."

echo "✅ Base de datos lista"
