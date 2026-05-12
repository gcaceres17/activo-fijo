# ============================================================
# Activo Fijo — CLT S.A.
# Makefile de comandos del proyecto
# ============================================================

.PHONY: help up down dev db-reset logs ps test lint

help: ## Mostrar esta ayuda
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-18s\033[0m %s\n", $$1, $$2}'

# ── Docker ──────────────────────────────────────────────────────────────────

up: ## Levantar todos los servicios (producción)
	docker compose up --build -d
	@echo "✅ Servicios levantados"
	@echo "   API:      http://localhost:8000/docs"
	@echo "   Frontend: http://localhost:3000"
	@echo "   DB:       localhost:5432"

down: ## Detener todos los servicios
	docker compose down

dev: ## Levantar solo DB + Backend (hot reload). Frontend corre separado con 'make frontend'
	docker compose up postgres backend -d
	@echo "✅ DB + Backend levantados"
	@echo "   API docs: http://localhost:8000/docs"
	@echo "   Tip: corre 'make frontend' en otra terminal"

frontend: ## Correr el frontend Next.js en modo dev
	cd frontend && npm run dev

db-reset: ## PELIGROSO: borra y recrea la base de datos con el seed
	@echo "⚠️  Esto borrará todos los datos. Ctrl+C para cancelar..."
	@sleep 3
	docker compose down -v
	docker compose up postgres -d
	@echo "✅ Base de datos recreada con seed"

logs: ## Ver logs de todos los servicios
	docker compose logs -f

logs-api: ## Ver logs solo del backend
	docker compose logs -f backend

ps: ## Estado de los contenedores
	docker compose ps

# ── Desarrollo local ─────────────────────────────────────────────────────────

install: ## Instalar dependencias del frontend
	cd frontend && npm install

build: ## Build de producción del frontend
	cd frontend && npm run build

lint: ## Lint del frontend
	cd frontend && npm run lint

# ── Base de datos ────────────────────────────────────────────────────────────

db-shell: ## Abrir shell de PostgreSQL
	docker compose exec postgres psql -U activo_fijo -d activo_fijo_db

db-backup: ## Backup de la base de datos
	docker compose exec postgres pg_dump -U activo_fijo activo_fijo_db > backup_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "✅ Backup generado"

# ── Git helpers ───────────────────────────────────────────────────────────────

feature: ## Crear rama de feature. Uso: make feature NAME=nombre-de-la-feature
	git checkout develop
	git pull origin develop
	git checkout -b feature/$(NAME)
	@echo "✅ Rama feature/$(NAME) creada desde develop"

release: ## Crear rama de release. Uso: make release VERSION=1.1.0
	git checkout develop
	git pull origin develop
	git checkout -b release/$(VERSION)
	@echo "✅ Rama release/$(VERSION) creada"
