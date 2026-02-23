# Online Go (온라인 바둑)

웹 브라우저에서 두 명이 실시간으로 대국할 수 있는 바둑 게임입니다.

## 스택

- **프론트엔드**: Next.js 15, TypeScript, Tailwind CSS 4
- **백엔드**: Supabase (PostgreSQL + Realtime)
- **AI 분석**: KataGo (Eigen/CPU 빌드)
- **배포**: Docker Compose (Oracle Cloud ARM)

## 기능

- 9×9 / 13×13 / 19×19 판 선택
- 초읽기 (초읽기 횟수/시간 설정, 무한 시간 옵션)
- 실시간 채팅
- 무르기 요청/수락
- 계가(집 세기) — 죽은 돌 표시 → 쌍방 확인
- 형세판단 — KataGo AI 승률·점수차 + 히트맵 오버레이

## 실행 방법

### 사전 준비

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

위 내용을 `.env` 파일에 저장합니다. (`.env.example` 참고)

### Docker로 실행 (권장)

```bash
docker compose up -d --build
```

- 첫 실행 시 KataGo 소스 컴파일로 10~15분 소요됩니다.
- 이후 코드 변경 시 앱만 재빌드하면 됩니다.

```bash
docker compose build app && docker compose up -d
```

### 로컬 개발 서버

```bash
npm install
npm run dev
```

`http://localhost:3000`에서 확인합니다. KataGo 없이도 동작하며, AI 형세판단 대신 BFS 집 계산으로 폴백합니다.

## DB 마이그레이션

Supabase SQL Editor에서 `supabase/migrations/` 안의 파일을 순서대로 실행합니다.

```
001_initial.sql   — 초기 스키마
002_board_size.sql — board_size 컬럼 추가
```

## 프로젝트 구조

```
src/
  app/              — Next.js App Router 페이지
    api/analyze/    — KataGo 분석 API 프록시
  components/
    board/          — Canvas 바둑판 렌더링
    game/           — 게임 패널, 타이머, 계가 UI
    lobby/          — 방 목록, 방 만들기 폼
  hooks/            — useGame, useTimer, useSupabaseGame 등
  lib/
    go/             — 순수 바둑 엔진 (룰, 계가, 엔진)
    supabase/       — DB CRUD + Realtime 구독
    timer/          — 초읽기 로직
katago/             — KataGo Docker 서비스
supabase/migrations/ — PostgreSQL 마이그레이션
```
