# =============================================================================
# Makefile - 운영 명령어 집합
# =============================================================================
#
# 서비스 시작 순서:
#   1. make data-prod-up    # 먼저 DB/Redis/RabbitMQ + 네트워크 생성
#   2. make infra-up        # Nginx Proxy 실행
#   3. make prod-app-up     # WAS + Frontend 배포
#
# App 중지해도 DB는 안 꺼짐 (의도된 동작)
# =============================================================================

# 환경 변수 파일 경로
ENV_PROD = --env-file .env.prod
ENV_DEV = --env-file .env.dev

.PHONY: help \
        data-prod-up data-prod-down data-dev-up data-dev-down \
        infra-up infra-down \
        prod-app-up prod-app-down dev-app-up dev-app-down \
        local-up local-down \
        switch-blue switch-green \
        status clean

# =============================================================================
# 도움말
# =============================================================================
help:
	@echo "=============================================="
	@echo "  EyeSpeak - 운영 명령어"
	@echo "=============================================="
	@echo ""
	@echo "  Data Services (DB/Redis/RabbitMQ):"
	@echo "    make data-prod-up    - Prod 데이터 시작"
	@echo "    make data-prod-down  - Prod 데이터 중지"
	@echo "    make data-dev-up     - Dev 데이터 시작"
	@echo "    make data-dev-down   - Dev 데이터 중지"
	@echo ""
	@echo "  Infrastructure (Nginx):"
	@echo "    make infra-up        - Nginx Proxy 시작"
	@echo "    make infra-down      - Nginx Proxy 중지"
	@echo ""
	@echo "  Application (WAS + Frontend):"
	@echo "    make prod-app-up     - Prod 앱 배포"
	@echo "    make prod-app-down   - Prod 앱 중지"
	@echo "    make dev-app-up      - Dev 앱 배포"
	@echo "    make dev-app-down    - Dev 앱 중지"
	@echo "    make local-up        - 로컬 올인원 시작"
	@echo "    make local-down      - 로컬 올인원 중지"
	@echo ""
	@echo "  Blue/Green Deployment:"
	@echo "    make switch-blue     - Blue로 트래픽 전환"
	@echo "    make switch-green    - Green으로 트래픽 전환"
	@echo ""
	@echo "  Status & Logs:"
	@echo "    make status          - 전체 서비스 상태"
	@echo "    make logs-nginx      - Nginx 로그"
	@echo ""
	@echo "=============================================="

# =============================================================================
# Data Services (Stateful) - 거의 재시작 안 함
# =============================================================================

data-prod-up:
	@echo "Starting Prod Data Services (MySQL, Redis, RabbitMQ)..."
	cd infra && docker compose -f docker-compose.data.prod.yml $(ENV_PROD) up -d
	@echo "Prod Data started! (prod-net created)"

data-prod-down:
	@echo "WARNING: Stopping Prod DB!"
	@read -p "Are you sure? (yes/no): " confirm && [ "$$confirm" = "yes" ] && \
		cd infra && docker compose -f docker-compose.data.prod.yml $(ENV_PROD) down || \
		echo "Cancelled."

data-dev-up:
	@echo "Starting Dev Data Services (MySQL, Redis, RabbitMQ)..."
	cd infra && docker compose -f docker-compose.data.dev.yml $(ENV_DEV) up -d
	@echo "Dev Data started! (dev-net created)"

data-dev-down:
	@echo "Stopping Dev Data Services..."
	cd infra && docker compose -f docker-compose.data.dev.yml down

# =============================================================================
# Infrastructure (Nginx Proxy)
# =============================================================================

infra-up:
	@echo "Starting Nginx Proxy..."
	@docker network inspect prod-net >/dev/null 2>&1 || (echo "Error: prod-net not found. Run 'make data-prod-up' first!" && exit 1)
	@docker network inspect dev-net >/dev/null 2>&1 || docker network create --driver bridge dev-net
	cd infra && docker compose up -d
	@echo "Nginx Proxy started!"

infra-down:
	@echo "Stopping Nginx Proxy..."
	cd infra && docker compose down

# =============================================================================
# Application Services (Stateless) - 배포 시마다 재시작
# =============================================================================

prod-app-up:
	@echo "Deploying Prod App (WAS Blue/Green + Frontend)..."
	cd backend && docker compose -f docker-compose.yml -f docker-compose.prod.yml $(ENV_PROD) up -d --build
	cd frontend && docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
	@echo "Prod App deployed!"

prod-app-down:
	@echo "Stopping Prod App (DB unaffected)..."
	cd backend && docker compose -f docker-compose.yml -f docker-compose.prod.yml down
	cd frontend && docker compose -f docker-compose.yml -f docker-compose.prod.yml down

dev-app-up:
	@echo "Deploying Dev App (WAS + Frontend)..."
	cd backend && docker compose -f docker-compose.dev.yml $(ENV_DEV) up -d --build
	cd frontend && docker compose -f docker-compose.dev.yml up -d --build
	@echo "Dev App deployed!"

dev-app-down:
	@echo "Stopping Dev App (DB unaffected)..."
	cd backend && docker compose -f docker-compose.dev.yml down
	cd frontend && docker compose -f docker-compose.dev.yml down

local-up:
	@echo "Starting Local Environment (All-in-One)..."
	cd backend && docker compose -f docker-compose.local.yml up -d --build
	cd frontend && docker compose -f docker-compose.local.yml up -d --build
	@echo "Local started! Backend: http://localhost:8080, Frontend: http://localhost:3000"

local-down:
	@echo "Stopping Local Environment..."
	cd backend && docker compose -f docker-compose.local.yml down
	cd frontend && docker compose -f docker-compose.local.yml down

# =============================================================================
# Blue/Green Deployment
# =============================================================================

switch-blue:
	@echo "Switching traffic to Blue..."
	./scripts/switch-upstream.sh blue

switch-green:
	@echo "Switching traffic to Green..."
	./scripts/switch-upstream.sh green

# =============================================================================
# Status & Logs
# =============================================================================

status:
	@echo "=============================================="
	@echo "  Service Status"
	@echo "=============================================="
	@echo ""
	@echo "Networks:"
	@docker network ls | grep -E "(prod-net|dev-net|infra-net)" || echo "  (none)"
	@echo ""
	@echo "Data Services:"
	@docker ps --filter "name=eyespeak-db" --filter "name=eyespeak-redis" --filter "name=eyespeak-rabbitmq" \
		--format "table {{.Names}}\t{{.Status}}" 2>/dev/null || echo "  (none)"
	@echo ""
	@echo "Infrastructure:"
	@docker ps --filter "name=eyespeak-nginx" \
		--format "table {{.Names}}\t{{.Status}}" 2>/dev/null || echo "  (none)"
	@echo ""
	@echo "Applications:"
	@docker ps --filter "name=eyespeak-was" --filter "name=eyespeak-front" \
		--format "table {{.Names}}\t{{.Status}}" 2>/dev/null || echo "  (none)"

logs-nginx:
	docker logs -f eyespeak-nginx

logs-was-blue:
	docker logs -f eyespeak-was-blue

logs-was-green:
	docker logs -f eyespeak-was-green

logs-was-dev:
	docker logs -f eyespeak-was-dev

# =============================================================================
# Cleanup
# =============================================================================

clean:
	@echo "Cleaning unused Docker resources..."
	docker image prune -f
	docker system prune -f
