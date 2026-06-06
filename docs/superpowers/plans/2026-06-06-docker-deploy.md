# onlineGo Docker 배포 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** onlineGo 앱을 foxibu.is-a.dev/onlineGo 로 Docker 배포하고 Supabase self-host 연결

**Architecture:** portfolio-nginx 컨테이너(기존)가 80/443 처리. `/onlineGo/*`는 onlinego-app 컨테이너로, `/rest/v1` 등 Supabase 경로는 host:8000(Supabase Kong)으로 라우팅. portfolio-net Docker 네트워크에 onlinego-app 추가.

**Tech Stack:** Docker Compose, nginx, Supabase self-host, Next.js 15 standalone, KataGo

---

## 파일 변경 목록

| 파일 | 역할 |
|---|---|
| `/opt/supabase/docker/.env` | Supabase 설정 (생성) |
| `/home/ubuntu/onlineGo/.env` | onlineGo 앱 환경변수 (생성) |
| `/home/ubuntu/onlineGo/next.config.ts` | basePath 추가 |
| `/home/ubuntu/onlineGo/docker-compose.yml` | 포트 제거, 네트워크 조인 |
| `/home/ubuntu/portfolio/nginx.conf` | /onlineGo + Supabase 경로 추가 |
| `/home/ubuntu/portfolio/docker-compose.yml` | nginx에 host-gateway 추가 |

---

### Task 1: Supabase 설치

**Files:**
- Create: `/opt/supabase/docker/.env`

- [ ] **Step 1: Supabase docker 클론**

```bash
sudo git clone --depth 1 https://github.com/supabase/supabase /opt/supabase
cd /opt/supabase/docker
sudo cp .env.example .env
# ubuntu 유저가 docker 없이 실행하려면 sudo 필요 — 이 플랜의 모든 docker 명령은 sudo로 실행
```

- [ ] **Step 2: 시크릿 생성 및 .env 업데이트**

```bash
cd /opt/supabase/docker

POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)
JWT_SECRET=$(openssl rand -base64 48 | tr -dc 'a-zA-Z0-9' | head -c 64)

# JWT 키 생성 함수
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

sudo sed -i "s|POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$POSTGRES_PASSWORD|" .env
sudo sed -i "s|JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" .env
sudo sed -i "s|ANON_KEY=.*|ANON_KEY=$ANON_KEY|" .env
sudo sed -i "s|SERVICE_ROLE_KEY=.*|SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY|" .env
sudo sed -i "s|SITE_URL=.*|SITE_URL=https://foxibu.is-a.dev|" .env
sudo sed -i "s|API_EXTERNAL_URL=.*|API_EXTERNAL_URL=https://foxibu.is-a.dev|" .env
sudo sed -i "s|SUPABASE_PUBLIC_URL=.*|SUPABASE_PUBLIC_URL=https://foxibu.is-a.dev|" .env

echo "ANON_KEY: $ANON_KEY"
echo "위 ANON_KEY를 저장해두세요 (Task 3에서 사용)"
```

- [ ] **Step 3: Supabase 시작**

```bash
cd /opt/supabase/docker
sudo docker compose up -d
```

- [ ] **Step 4: PostgreSQL 준비 대기 및 확인**

```bash
cd /opt/supabase/docker
for i in $(seq 1 30); do
  if sudo docker compose exec -T db pg_isready -U postgres &>/dev/null; then
    echo "PostgreSQL ready!"; break
  fi
  echo "Waiting... ($i/30)"; sleep 5
done
```

Expected: `PostgreSQL ready!` 출력

- [ ] **Step 5: Kong 응답 확인**

```bash
curl -s http://localhost:8000/rest/v1/ -H "apikey: $(grep '^ANON_KEY=' /opt/supabase/docker/.env | cut -d= -f2)" | head -c 200
```

Expected: JSON 응답 (빈 배열이나 에러 메시지 포함, 연결은 됨)

---

### Task 2: DB 마이그레이션

**Files:**
- Read: `/home/ubuntu/onlineGo/supabase/migrations/001_initial.sql`

- [ ] **Step 1: 마이그레이션 실행**

```bash
cd /opt/supabase/docker
sudo docker compose exec -T db psql -U postgres -d postgres \
  < /home/ubuntu/onlineGo/supabase/migrations/001_initial.sql
```

- [ ] **Step 2: 테이블 생성 확인**

```bash
cd /opt/supabase/docker
sudo docker compose exec -T db psql -U postgres -d postgres \
  -c "\dt" | grep -E "rooms|players|game_states|moves"
```

Expected: `rooms`, `players`, `game_states`, `moves` 테이블이 목록에 표시

---

### Task 3: onlineGo .env 생성

**Files:**
- Create: `/home/ubuntu/onlineGo/.env`

- [ ] **Step 1: .env 파일 생성 (ANON_KEY 자동 추출)**

```bash
ANON_KEY=$(sudo grep '^ANON_KEY=' /opt/supabase/docker/.env | cut -d= -f2)
cat > /home/ubuntu/onlineGo/.env << EOF
NEXT_PUBLIC_SUPABASE_URL=https://foxibu.is-a.dev
NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_EMAIL=
EOF
echo "ANON_KEY 설정됨: $(grep ANON_KEY /home/ubuntu/onlineGo/.env | cut -c1-60)..."
```

Expected: `ANON_KEY 설정됨: NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...` (eyJ로 시작하는 JWT)

---

### Task 4: next.config.ts basePath 추가

**Files:**
- Modify: `/home/ubuntu/onlineGo/next.config.ts`

- [ ] **Step 1: basePath 추가**

`/home/ubuntu/onlineGo/next.config.ts` 를 다음으로 교체:

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Disable Turbopack for build (Korean path characters cause Turbopack crash)
  output: 'standalone',
  basePath: '/onlineGo',
};

export default nextConfig;
```

- [ ] **Step 2: 커밋**

```bash
cd /home/ubuntu/onlineGo
git add next.config.ts
git commit -m "feat: basePath /onlineGo for path-based routing"
```

---

### Task 5: docker-compose.yml 수정

**Files:**
- Modify: `/home/ubuntu/onlineGo/docker-compose.yml`

- [ ] **Step 1: docker-compose.yml 교체**

`/home/ubuntu/onlineGo/docker-compose.yml` 를 다음으로 교체:

```yaml
services:
  katago:
    build: ./katago
    restart: unless-stopped
    networks:
      - onlinego-net
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://localhost:8080/health | grep -q 'true' || exit 1"]
      interval: 10s
      timeout: 5s
      retries: 30
      start_period: 120s

  app:
    build:
      context: .
      args:
        NEXT_PUBLIC_SUPABASE_URL: ${NEXT_PUBLIC_SUPABASE_URL}
        NEXT_PUBLIC_SUPABASE_ANON_KEY: ${NEXT_PUBLIC_SUPABASE_ANON_KEY}
        NEXT_PUBLIC_VAPID_PUBLIC_KEY: ${NEXT_PUBLIC_VAPID_PUBLIC_KEY}
    container_name: onlinego-app
    environment:
      - KATAGO_URL=http://katago:8080
      - VAPID_PRIVATE_KEY=${VAPID_PRIVATE_KEY}
      - VAPID_EMAIL=${VAPID_EMAIL}
      - NEXT_PUBLIC_VAPID_PUBLIC_KEY=${NEXT_PUBLIC_VAPID_PUBLIC_KEY}
    expose:
      - "3000"
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://localhost:3000/api/health | grep -q 'true' || exit 1"]
      interval: 15s
      timeout: 5s
      retries: 5
      start_period: 30s
    depends_on:
      katago:
        condition: service_healthy
    networks:
      - onlinego-net
      - portfolio-net

networks:
  onlinego-net:
    driver: bridge
  portfolio-net:
    external: true
```

- [ ] **Step 2: 커밋**

```bash
cd /home/ubuntu/onlineGo
git add docker-compose.yml
git commit -m "feat: join portfolio-net, remove direct port mapping"
```

---

### Task 6: portfolio nginx.conf에 경로 추가

**Files:**
- Modify: `/home/ubuntu/portfolio/nginx.conf`

- [ ] **Step 1: nginx.conf 교체**

`/home/ubuntu/portfolio/nginx.conf` 를 다음으로 교체 (기존 내용에 Supabase + onlineGo 경로 추가):

```nginx
# HTTP: serve ACME challenges, redirect everything else to HTTPS
server {
    listen 80;
    server_name foxibu.is-a.dev;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS
server {
    listen 443 ssl;
    http2 on;
    server_name foxibu.is-a.dev;

    ssl_certificate     /etc/letsencrypt/live/foxibu.is-a.dev/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/foxibu.is-a.dev/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;

    client_max_body_size 20M;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # ── Supabase Realtime (WebSocket 필요) ──────────────────
    location /realtime/v1 {
        proxy_pass http://host.docker.internal:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }

    # ── Supabase API (REST / Auth / Storage) ────────────────
    location ~ ^/(rest|auth|storage|functions)/v1 {
        proxy_pass http://host.docker.internal:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # ── OnlineGo 정적 애셋 ───────────────────────────────────
    location /onlineGo/_next/static/ {
        proxy_pass http://onlinego-app:3000;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # ── OnlineGo 앱 ──────────────────────────────────────────
    location /onlineGo {
        proxy_pass http://onlinego-app:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # ── 포트폴리오 정적 애셋 ─────────────────────────────────
    location /_next/static/ {
        proxy_pass http://app:3000;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location /uploads/ {
        alias /usr/share/nginx/uploads/;
        try_files $uri =404;
        add_header Cache-Control "public, max-age=31536000, immutable";
        access_log off;
    }

    # ── 포트폴리오 앱 (기본) ─────────────────────────────────
    location / {
        proxy_pass http://app:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

### Task 7: portfolio docker-compose.yml에 host-gateway 추가

**Files:**
- Modify: `/home/ubuntu/portfolio/docker-compose.yml`

- [ ] **Step 1: nginx 서비스에 extra_hosts 추가**

`/home/ubuntu/portfolio/docker-compose.yml` 를 다음으로 교체:

```yaml
services:
  app:
    build:
      context: .
      args:
        NEXT_PUBLIC_SITE_URL: ${NEXT_PUBLIC_SITE_URL}
    container_name: portfolio
    restart: unless-stopped
    environment:
      - NEXTAUTH_URL=${NEXTAUTH_URL}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - ADMIN_PASSWORD=${ADMIN_PASSWORD}
    volumes:
      - ./content:/app/content
      - ./public/uploads:/app/public/uploads
    expose:
      - "3000"
    networks:
      - portfolio-net

  nginx:
    image: nginx:alpine
    container_name: portfolio-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - ./certbot/www:/var/www/certbot:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
      - ./public/uploads:/usr/share/nginx/uploads:ro
    extra_hosts:
      - "host.docker.internal:host-gateway"
    depends_on:
      - app
    networks:
      - portfolio-net

networks:
  portfolio-net:
    driver: bridge
```

---

### Task 8: onlineGo 앱 빌드 및 실행

**Files:**
- Run: `/home/ubuntu/onlineGo/docker-compose.yml`

- [ ] **Step 1: 빌드 및 시작**

```bash
cd /home/ubuntu/onlineGo
sudo docker compose up --build -d
```

KataGo가 모델을 로드하는 데 1~2분 소요. app 컨테이너는 katago 헬스체크 통과 후 시작.

- [ ] **Step 2: 상태 확인**

```bash
sudo docker compose -f /home/ubuntu/onlineGo/docker-compose.yml ps
```

Expected: `katago`와 `onlinego-app` 모두 `healthy` 또는 `running`

- [ ] **Step 3: 앱 내부 응답 확인**

```bash
sudo docker exec onlinego-app wget -qO- http://localhost:3000/api/health
```

Expected: `{"status":true}` 또는 `true` 포함 응답

---

### Task 9: portfolio nginx 재시작

- [ ] **Step 1: onlinego-app이 portfolio-net에 있는지 확인**

```bash
sudo docker network inspect portfolio_portfolio-net | grep -A2 "onlinego-app"
```

Expected: `onlinego-app` 항목이 출력됨. 없으면 Task 8을 다시 확인.

- [ ] **Step 2: nginx 컨테이너 재시작 (host-gateway + 새 설정 적용)**

portfolio docker-compose.yml에 extra_hosts를 추가했으므로 reload가 아닌 restart 필요:

```bash
cd /home/ubuntu/portfolio
sudo docker compose up -d --force-recreate nginx
```

Expected: nginx 컨테이너가 재생성되고 `portfolio-nginx` 가 `Up` 상태

- [ ] **Step 3: nginx 설정 검증**

```bash
sudo docker exec portfolio-nginx nginx -t
```

Expected: `syntax is ok` + `test is successful`

---

### Task 10: 최종 검증

- [ ] **Step 1: 브라우저에서 앱 확인**

`https://foxibu.is-a.dev/onlineGo` 접속 → 바둑 로비 화면 확인

- [ ] **Step 2: Supabase REST API 확인**

```bash
ANON_KEY=$(grep '^ANON_KEY=' /opt/supabase/docker/.env | cut -d= -f2)
curl -s "https://foxibu.is-a.dev/rest/v1/rooms?select=id&limit=1" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY"
```

Expected: `[]` (빈 배열) — 테이블은 있지만 데이터 없음

- [ ] **Step 3: 포트폴리오 정상 확인**

```bash
curl -s -o /dev/null -w "%{http_code}" https://foxibu.is-a.dev/
```

Expected: `200`

- [ ] **Step 4: 방 생성 테스트**

브라우저에서 `https://foxibu.is-a.dev/onlineGo` → 방 만들기 → 닉네임 입력 → 방 생성 확인
