#!/bin/bash
set -euo pipefail

# ============================================================
# Online Go - Oracle Cloud ARM Supabase 설치 스크립트
#
# 사용법:
#   git clone https://github.com/YOUR_USER/onlineGo.git
#   cd onlineGo
#   chmod +x scripts/setup-oracle.sh
#   sudo ./scripts/setup-oracle.sh your-domain.com your@email.com
#
# 필요 사항:
#   - Oracle Cloud Free Tier ARM (Ubuntu 22.04+)
#   - 도메인이 이 서버 IP로 연결되어 있어야 함
#   - 보안 그룹에서 80, 443 포트 오픈
# ============================================================

DOMAIN="${1:?Usage: $0 <domain> <email>}"
EMAIL="${2:?Usage: $0 <domain> <email>}"

echo "========================================="
echo "  Online Go - Supabase Setup"
echo "  Domain: $DOMAIN"
echo "  Email: $EMAIL"
echo "========================================="

# ----- 1. 시스템 패키지 -----
echo "[1/7] Installing system packages..."
apt-get update -qq
apt-get install -y -qq docker.io docker-compose-v2 nginx certbot python3-certbot-nginx curl jq git

systemctl enable docker
systemctl start docker

# docker compose v2 alias (docker-compose → docker compose)
if ! command -v docker-compose &> /dev/null; then
  echo "alias docker-compose='docker compose'" >> /etc/bash.bashrc
fi

# ----- 2. Supabase 클론 -----
echo "[2/7] Cloning Supabase Docker..."
SUPA_DIR="/opt/supabase"
if [ -d "$SUPA_DIR" ]; then
  echo "  Supabase dir exists, pulling latest..."
  cd "$SUPA_DIR" && git pull
else
  git clone --depth 1 https://github.com/supabase/supabase "$SUPA_DIR"
fi
cd "$SUPA_DIR/docker"

# ----- 3. 환경변수 생성 -----
echo "[3/7] Generating secrets and .env..."
cp -n .env.example .env

# 랜덤 시크릿 생성
POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)
JWT_SECRET=$(openssl rand -base64 48 | tr -dc 'a-zA-Z0-9' | head -c 64)

# JWT 키 생성 (anon, service_role)
generate_jwt() {
  local role=$1
  local secret=$2
  local header=$(echo -n '{"alg":"HS256","typ":"JWT"}' | base64 -w0 | tr '+/' '-_' | tr -d '=')
  local payload=$(echo -n "{\"role\":\"$role\",\"iss\":\"supabase\",\"iat\":$(date +%s),\"exp\":$(($(date +%s) + 315360000))}" | base64 -w0 | tr '+/' '-_' | tr -d '=')
  local signature=$(echo -n "$header.$payload" | openssl dgst -sha256 -hmac "$secret" -binary | base64 -w0 | tr '+/' '-_' | tr -d '=')
  echo "$header.$payload.$signature"
}

ANON_KEY=$(generate_jwt "anon" "$JWT_SECRET")
SERVICE_ROLE_KEY=$(generate_jwt "service_role" "$JWT_SECRET")

# .env 파일 업데이트
sed -i "s|POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$POSTGRES_PASSWORD|" .env
sed -i "s|JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" .env
sed -i "s|ANON_KEY=.*|ANON_KEY=$ANON_KEY|" .env
sed -i "s|SERVICE_ROLE_KEY=.*|SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY|" .env
sed -i "s|SITE_URL=.*|SITE_URL=https://$DOMAIN|" .env
sed -i "s|API_EXTERNAL_URL=.*|API_EXTERNAL_URL=https://$DOMAIN|" .env
sed -i "s|SUPABASE_PUBLIC_URL=.*|SUPABASE_PUBLIC_URL=https://$DOMAIN|" .env

# Dashboard 비활성화 (리소스 절약)
sed -i "s|STUDIO_DEFAULT_ORGANIZATION=.*|STUDIO_DEFAULT_ORGANIZATION=onlinego|" .env
sed -i "s|STUDIO_DEFAULT_PROJECT=.*|STUDIO_DEFAULT_PROJECT=onlinego|" .env

echo "  ANON_KEY: $ANON_KEY"
echo "  (위 키를 Vercel 환경변수에 설정하세요)"

# ----- 4. Supabase 시작 -----
echo "[4/7] Starting Supabase (this may take a few minutes)..."
docker compose up -d

echo "  Waiting for PostgreSQL to be ready..."
sleep 15

# health check
for i in {1..30}; do
  if docker compose exec -T db pg_isready -U postgres &>/dev/null; then
    echo "  PostgreSQL is ready!"
    break
  fi
  echo "  Waiting... ($i/30)"
  sleep 5
done

# ----- 5. DB 마이그레이션 -----
echo "[5/7] Running database migration..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATION_FILE="$SCRIPT_DIR/../supabase/migrations/001_initial.sql"

if [ -f "$MIGRATION_FILE" ]; then
  docker compose exec -T db psql -U postgres -d postgres < "$MIGRATION_FILE"
  echo "  Migration complete!"
else
  echo "  WARNING: Migration file not found at $MIGRATION_FILE"
  echo "  Run manually: docker compose exec -T db psql -U postgres -d postgres < supabase/migrations/001_initial.sql"
fi

# ----- 6. Nginx + SSL -----
echo "[6/7] Configuring nginx + SSL..."

cat > /etc/nginx/sites-available/supabase <<NGINX
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/supabase /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# SSL 인증서
echo "  Obtaining SSL certificate..."
certbot --nginx -d "$DOMAIN" --email "$EMAIL" --agree-tos --non-interactive --redirect

# ----- 7. 방화벽 -----
echo "[7/7] Configuring firewall..."
if command -v iptables &> /dev/null; then
  iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT 2>/dev/null || true
  iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT 2>/dev/null || true
  netfilter-persistent save 2>/dev/null || true
fi

# ----- 완료 -----
echo ""
echo "========================================="
echo "  Setup Complete!"
echo "========================================="
echo ""
echo "  Supabase URL: https://$DOMAIN"
echo "  Anon Key:     $ANON_KEY"
echo ""
echo "  Vercel 환경변수 설정:"
echo "    NEXT_PUBLIC_SUPABASE_URL=https://$DOMAIN"
echo "    NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY"
echo ""
echo "  키 정보 저장 위치: /opt/supabase/docker/.env"
echo ""
echo "  상태 확인: docker compose -f /opt/supabase/docker/docker-compose.yml ps"
echo "  로그 확인: docker compose -f /opt/supabase/docker/docker-compose.yml logs -f"
echo "========================================="
