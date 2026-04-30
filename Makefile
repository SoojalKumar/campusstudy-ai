SHELL := /bin/zsh

ROOT_DIR := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))
API_DIR := $(ROOT_DIR)apps/api

.PHONY: preflight setup api-install api-dev migrate seed pilot-smoke test lint docker-up docker-down web-dev mobile-dev

preflight:
	cd $(ROOT_DIR) && python3 scripts/preflight.py

setup:
	cd $(ROOT_DIR) && if [ ! -f .env ]; then cp .env.example .env; fi
	cd $(ROOT_DIR) && pnpm install
	cd $(API_DIR) && python3 -m venv .venv
	cd $(API_DIR) && source .venv/bin/activate && pip install --upgrade pip && pip install -e ".[dev]"

api-install:
	cd $(API_DIR) && python3 -m venv .venv
	cd $(API_DIR) && source .venv/bin/activate && pip install --upgrade pip && pip install -e ".[dev]"

api-dev:
	cd $(API_DIR) && source .venv/bin/activate && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

migrate:
	cd $(API_DIR) && source .venv/bin/activate && alembic upgrade head

seed:
	cd $(API_DIR) && source .venv/bin/activate && python -m app.seed.run

pilot-smoke:
	cd $(ROOT_DIR) && python3 scripts/pilot_smoke.py

test:
	cd $(API_DIR) && source .venv/bin/activate && pytest
	cd $(ROOT_DIR) && pnpm test

lint:
	cd $(API_DIR) && source .venv/bin/activate && ruff check .
	cd $(ROOT_DIR) && pnpm lint

docker-up:
	docker compose -f $(ROOT_DIR)infrastructure/docker-compose.yml up --build

docker-down:
	docker compose -f $(ROOT_DIR)infrastructure/docker-compose.yml down -v

web-dev:
	cd $(ROOT_DIR) && pnpm --filter @campusstudy/web dev

mobile-dev:
	cd $(ROOT_DIR) && pnpm --filter @campusstudy/mobile start
