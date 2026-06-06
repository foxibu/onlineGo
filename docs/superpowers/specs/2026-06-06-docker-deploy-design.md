# 배포 설계: foxibu.is-a.dev/onlineGo

## 목표
onlineGo 앱을 이 서버(168.107.47.192)에 Docker로 배포하고,
기존 포트폴리오 nginx에 `/onlineGo` 경로를 추가한다.
Supabase를 self-host로 설치해 DB/Realtime 백엔드로 사용한다.

## 아키텍처

```
인터넷 → portfolio-nginx (80/443, 기존 SSL 재사용)
│
├── /                → portfolio app (기존)
├── /onlineGo/*      → onlinego-app (:3000)
├── /rest/v1/*       → Supabase Kong (host:8000)
├── /auth/v1/*       → Supabase Kong (host:8000)
└── /realtime/v1/*   → Supabase Kong (host:8000, WebSocket)

portfolio-net Docker 네트워크:
├── portfolio-nginx (기존)
├── portfolio (기존)
└── onlinego-app (Next.js, basePath=/onlineGo)
    └── onlinego-katago (KataGo, 내부 전용)

Supabase (/opt/supabase/docker, 별도 compose):
└── Kong → host:8000 (Oracle Cloud NSG로 외부 차단 확인됨)
```

## 변경 파일

| 파일 | 변경 내용 |
|---|---|
| `next.config.ts` | `basePath: '/onlineGo'` 추가 |
| `docker-compose.yml` | 포트 80 제거, portfolio-net external 네트워크 조인 |
| `.env` | SUPABASE_URL=https://foxibu.is-a.dev, ANON_KEY 등 |
| `portfolio/nginx.conf` | /onlineGo, /rest/v1, /auth/v1, /realtime/v1 경로 추가 |
| `portfolio/docker-compose.yml` | nginx 서비스에 extra_hosts: host-gateway 추가 |

## 환경 변수
- `NEXT_PUBLIC_SUPABASE_URL=https://foxibu.is-a.dev`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=<Supabase 설치 시 생성>`
- VAPID 키는 선택사항 (사용 안 하면 빈값)

## 보안
- Supabase Kong 포트 8000은 Oracle Cloud NSG로 외부 차단 확인
- nginx만 host.docker.internal:8000으로 내부 접근

## 작업 순서
1. Supabase 설치 및 DB 마이그레이션
2. next.config.ts basePath 추가
3. docker-compose.yml 수정
4. portfolio/nginx.conf 경로 추가
5. portfolio/docker-compose.yml host-gateway 추가
6. onlineGo 앱 빌드 & 실행
7. 포트폴리오 nginx 재시작
