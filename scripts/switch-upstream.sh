#!/bin/bash
# =============================================================================
# Nginx Upstream 전환 스크립트 (Blue/Green Deployment)
# =============================================================================
# 사용법:
#   ./scripts/switch-upstream.sh blue   # Blue로 전환
#   ./scripts/switch-upstream.sh green  # Green으로 전환
# =============================================================================
set -e    # 에러 나면 즉시 중단

TARGET=$1   # 첫 번째 인자 (blue 또는 green)

# ── 입력 검증 ────────────────────────────────────────────────
# blue나 green이 아니면 사용법 알려주고 종료
if [ -z "$TARGET" ]; then
    echo "Usage: $0 [blue|green]"
    exit 1
fi

if [ "$TARGET" != "blue" ] && [ "$TARGET" != "green" ]; then
    echo "Error: Target must be 'blue' or 'green'"
    exit 1
fi

# ── 경로 설정 ────────────────────────────────────────────────
# 이 스크립트가 어디에 있든, 프로젝트 루트를 기준으로 nginx.conf를 찾음
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
NGINX_CONF="$PROJECT_ROOT/infra/nginx-proxy/nginx.conf"

echo "============================================"
echo "  Switching Traffic to $TARGET"
echo "============================================"

# ── 1단계: 백업 ──────────────────────────────────────────────
# 날짜+시간으로 백업 파일 생성 (실수해도 되돌릴 수 있게)
echo ""
echo "[1/5] Creating backup..."
BACKUP_FILE="$NGINX_CONF.backup.$(date +%Y%m%d_%H%M%S)"
cp "$NGINX_CONF" "$BACKUP_FILE"
echo "  Backup: $BACKUP_FILE"

# ── 2단계: upstream 주석 교체 ─────────────────────────────────
# sed = 텍스트 치환 도구. 파일에서 특정 줄을 찾아서 바꿔줌
echo ""
echo "[2/5] Updating upstream configuration..."

if [ "$TARGET" == "blue" ]; then
    # Blue 활성화: blue 줄에서 # 제거, green 줄에 # 추가
    echo "  Activating Blue"

    # WAS upstream 전환
    sed -i 's/^[[:space:]]*# server eyespeak-was-blue:8080;/        server eyespeak-was-blue:8080;/' "$NGINX_CONF"
    sed -i 's/^[[:space:]]*server eyespeak-was-green:8080;/        # server eyespeak-was-green:8080;/' "$NGINX_CONF"

    # Frontend upstream 전환
    sed -i 's/^[[:space:]]*# server eyespeak-front-blue:80;/        server eyespeak-front-blue:80;/' "$NGINX_CONF"
    sed -i 's/^[[:space:]]*server eyespeak-front-green:80;/        # server eyespeak-front-green:80;/' "$NGINX_CONF"
else
    # Green 활성화: green 줄에서 # 제거, blue 줄에 # 추가
    echo "  Activating Green"

    # WAS upstream 전환
    sed -i 's/^[[:space:]]*server eyespeak-was-blue:8080;/        # server eyespeak-was-blue:8080;/' "$NGINX_CONF"
    sed -i 's/^[[:space:]]*# server eyespeak-was-green:8080;/        server eyespeak-was-green:8080;/' "$NGINX_CONF"

    # Frontend upstream 전환
    sed -i 's/^[[:space:]]*server eyespeak-front-blue:80;/        # server eyespeak-front-blue:80;/' "$NGINX_CONF"
    sed -i 's/^[[:space:]]*# server eyespeak-front-green:80;/        server eyespeak-front-green:80;/' "$NGINX_CONF"
fi

# ── 3단계: Nginx 컨테이너 찾기 ────────────────────────────────
# 파일을 고쳐도, 실행 중인 Nginx 컨테이너에 반영해야 의미 있음
echo ""
echo "[3/5] Finding Nginx container..."

NGINX_CONTAINER=""
if docker ps --format '{{.Names}}' | grep -q "^eyespeak-nginx$"; then
    NGINX_CONTAINER="eyespeak-nginx"
fi

if [ -z "$NGINX_CONTAINER" ]; then
    echo "  Warning: Nginx container not running."
    echo "  Config updated, but not applied."
    echo "  Start nginx and run: docker exec eyespeak-nginx nginx -s reload"
    exit 0
fi

echo "  Found: $NGINX_CONTAINER"

# 변경된 설정을 컨테이너 안으로 복사
echo "  Copying config to container..."
cat "$NGINX_CONF" | docker exec -i "$NGINX_CONTAINER" sh -c 'cat > /etc/nginx/nginx.conf'

# ── 4단계: 설정 검증 ──────────────────────────────────────────
# nginx -t = 설정 파일 문법 체크. 오류 있으면 백업에서 복원
echo ""
echo "[4/5] Validating Nginx configuration..."

if ! docker exec "$NGINX_CONTAINER" nginx -t 2>&1; then
    echo ""
    echo "Nginx configuration is invalid!"
    echo "  Restoring backup..."
    cp "$BACKUP_FILE" "$NGINX_CONF"
    echo "  Restored: $BACKUP_FILE"
    exit 1
fi

echo "  Configuration valid"

# ── 5단계: Nginx reload ───────────────────────────────────────
# reload = 서버 안 끊고 설정만 다시 읽음 (사용자 영향 없음)
echo ""
echo "[5/5] Reloading Nginx..."
docker exec "$NGINX_CONTAINER" nginx -s reload

# ── 완료 ──────────────────────────────────────────────────────
echo ""
echo "============================================"
echo "  Traffic switched to $TARGET"
echo "============================================"
echo ""
echo "Current prod-was upstream:"
grep -A 6 "upstream prod-was" "$NGINX_CONF" | head -8
