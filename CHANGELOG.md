# Changelog

## [미분류] — 2026-02-23

### 추가
- **Docker 배포**: 멀티스테이지 Dockerfile + docker-compose.yml 구성
  - `output: 'standalone'` Next.js 빌드로 이미지 경량화
  - `NEXT_PUBLIC_*` 환경변수를 빌드 타임 ARG로 전달
- **KataGo AI 분석**: CPU(Eigen) 빌드, Docker 서비스로 분리
  - `POST /api/analyze` 프록시 라우트 추가
  - 형세판단 토글 시 KataGo ownership 히트맵 렌더링
  - 승률 바, 예상 점수차 표시 (GamePanel)
  - KataGo 미가동 시 BFS 집 계산으로 자동 폴백
- **착수 확인 버튼**: 보드 클릭 → 위치 선택 → "착수" 버튼으로 2단계 확인
  - 선택된 위치에 amber 링 표시
- **형세판단 패널 개선**: 중국식 계가 기준 (집 + 살아있는 돌 + 덤) 수치 표시
  - 흑/백 점수 비교 바, 다메 수, 주의사항 표시
- **계가 UX 개선**: 단계별 안내(1→2→3), 죽은 돌 토글 시 토스트 피드백
- **계가 확인 버튼**: 확인 완료 후 비활성화, 상태 표시

### 수정
- `useGame.ts`: `blackTimerRef` / `whiteTimerRef` 선언 순서 수정 (TypeScript 빌드 오류 해결)
- `katago/Dockerfile`: Ubuntu 22.04 기반으로 통일 (cmake 버전, libzip SONAME 불일치 해결)
- `katago/server.py`: `from __future__ import annotations` 추가 (Python 3.8 타입힌트 호환)
- `katago/analysis.cfg`: `numAnalysisThreads` 추가 (analysis 모드 필수 설정)
- `docker-compose.yml`: `depends_on: service_started`로 변경 (앱이 katago 헬스체크 완료 전에도 시작 가능)
