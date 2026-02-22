# Online Go - 프로젝트 컨텍스트

## 아키텍처
```
[Vercel - Next.js 프론트엔드] → [Oracle Cloud ARM - Supabase self-hosted]
```

- **프론트엔드**: Next.js 15 + TypeScript + Tailwind CSS 4 (Vercel 배포)
- **백엔드**: Oracle Cloud Free Tier ARM에 Supabase self-host (Docker)
- **실시간**: Supabase Realtime (PostgreSQL changes + Presence)
- **인증**: 없음 (닉네임 기반 익명)

## 기술 스택
- Next.js 15 (Turbopack 대신 Webpack - 한글 경로 버그 회피)
- React 19, TypeScript 5
- Tailwind CSS 4
- @supabase/supabase-js 2
- Canvas API (바둑판 렌더링, 라이브러리 없음)

## 프로젝트 구조
- `src/lib/go/` - 바둑 엔진 (순수 함수, 부작용 없음)
  - `types.ts`, `constants.ts`, `board.ts`, `rules.ts`, `engine.ts`, `scoring.ts`
- `src/lib/supabase/` - Supabase 클라이언트 + CRUD + Realtime
- `src/lib/timer/` - 타이머/초읽기 로직
- `src/hooks/` - React hooks (useGame, useTimer, useSupabaseRoom/Game, useNickname)
- `src/components/` - UI 컴포넌트 (board/, game/, lobby/, ui/)
- `src/app/` - Next.js App Router 페이지 (/, /create, /room/[roomId])
- `supabase/migrations/` - PostgreSQL 스키마
- `scripts/` - Oracle 서버 설치 스크립트

## DB 스키마 (주요 테이블)
- `rooms` - 방 (status: waiting/playing/scoring/finished)
- `players` - 플레이어 (room_id, nickname, color, timer state)
- `game_states` - 게임 상태 (board 361자 문자열, captures, ko hash)
- `moves` - 착수 기록
- `undo_requests` - 무르기 요청
- `scoring_states` - 계가 상태 (dead stones, confirmations)
- `chat_messages` - 채팅

## 동시 착수 방지
```sql
UPDATE game_states SET ... WHERE room_id = $id AND current_player = $my_color;
-- affected rows = 0 → 이미 상대가 착수
```

## 바둑 규칙
- 19x19 전용, 중국식 계가
- 패: 직전 보드 해시 비교 (simple ko)
- 자충수 방지, BFS 그룹/활로 계산

## Oracle 서버 설정
`scripts/setup-oracle.sh` 실행 → Docker + Supabase 설치 + nginx SSL + DB 마이그레이션

## 환경 변수
```
NEXT_PUBLIC_SUPABASE_URL=https://your-domain.com
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```
